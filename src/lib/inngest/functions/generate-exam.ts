import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/server";
import { generateBlueprint, generateQuestion, validateQuestion } from "@/lib/ai/generate";
import { buildQuestionContext, buildCrossConceptContext } from "@/lib/retrieval/context-builder";
import type { Concept } from "@/lib/ai/schemas/concept-map";
import type { BlueprintItem } from "@/lib/ai/schemas/blueprint";

export const generateExam = inngest.createFunction(
  {
    id: "generate-exam",
    retries: 1,
  },
  { event: "exam/generate" },
  async ({ event, step }) => {
    const { examId, userId } = event.data;
    const supabase = createServiceClient();

    async function updateProgress(
      stepName: string,
      status: string,
      details: Record<string, unknown> = {}
    ) {
      await supabase.from("processing_progress").upsert(
        {
          entity_type: "exam",
          entity_id: examId,
          user_id: userId,
          step_name: stepName,
          step_status: status,
          step_details: details,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,entity_id,step_name" }
      );
    }

    async function updateExamStatus(status: string, extra: Record<string, unknown> = {}) {
      await supabase
        .from("exams")
        .update({ status, updated_at: new Date().toISOString(), ...extra })
        .eq("id", examId);
    }

    // Load exam config and associated documents
    const examData = await step.run("load-exam-data", async () => {
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("*, exam_documents(document_id)")
        .eq("id", examId)
        .single();

      if (examError || !exam) throw new Error("Exam not found");

      const documentIds = exam.exam_documents.map(
        (ed: { document_id: string }) => ed.document_id
      );

      // Load concepts for all documents
      const { data: concepts, error: conceptsError } = await supabase
        .from("document_concepts")
        .select("*")
        .in("document_id", documentIds);

      if (conceptsError) throw new Error("Failed to load concepts");

      return {
        config: exam.config as {
          questionCount: number;
          questionTypes: string[];
          difficulty: string;
          mode: string;
        },
        documentIds,
        concepts: (concepts || []).map((c: Record<string, unknown>) => ({
          name: c.name as string,
          description: (c.description as string) || "",
          importanceScore: Number(c.importance_score),
          difficulty: ((c.metadata as Record<string, unknown>)?.difficulty as string) || "medium",
          pageReferences: (c.page_references as number[]) || [],
          parentConceptName: null,
          relatedConcepts:
            ((c.metadata as Record<string, unknown>)?.relatedConcepts as string[]) || [],
          hasFormulas: !!((c.metadata as Record<string, unknown>)?.hasFormulas),
          hasCaseExamples: !!((c.metadata as Record<string, unknown>)?.hasCaseExamples),
        })) as Concept[],
      };
    });

    // Step 1: Generate blueprint
    const blueprint = await step.run("generate-blueprint", async () => {
      await updateProgress("blueprint", "in_progress");
      await updateExamStatus("generating");

      const bp = await generateBlueprint(
        examData.concepts,
        examData.config.questionCount,
        examData.config.questionTypes,
        examData.config.difficulty
      );

      // Save blueprint to exam
      await supabase
        .from("exams")
        .update({ blueprint: bp })
        .eq("id", examId);

      await updateProgress("blueprint", "completed", {
        totalQuestions: bp.items.length,
        totalPoints: bp.totalPoints,
      });

      return bp;
    });

    // Step 2: Generate questions in batches
    const QUESTION_BATCH_SIZE = 3;
    const totalBatches = Math.ceil(
      blueprint.items.length / QUESTION_BATCH_SIZE
    );
    const allQuestions: {
      blueprintItem: BlueprintItem;
      questionData: Record<string, unknown>;
      sourceRefs: unknown[];
    }[] = [];

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const batchQuestions = await step.run(
        `generate-questions-batch-${batchIdx}`,
        async () => {
          const start = batchIdx * QUESTION_BATCH_SIZE;
          const end = Math.min(
            start + QUESTION_BATCH_SIZE,
            blueprint.items.length
          );
          const batchItems = blueprint.items.slice(start, end);

          await updateProgress("generating", "in_progress", {
            batch: batchIdx + 1,
            totalBatches,
            questionsGenerated: start,
            totalQuestions: blueprint.items.length,
          });

          const results: {
            blueprintItem: BlueprintItem;
            questionData: Record<string, unknown>;
            sourceRefs: unknown[];
          }[] = [];

          for (const item of batchItems) {
            // Build context based on difficulty
            const context =
              item.secondaryConceptName &&
              (item.difficulty === "hard" || item.difficulty === "very_hard")
                ? await buildCrossConceptContext(
                    [item.conceptName, item.secondaryConceptName],
                    examData.documentIds
                  )
                : await buildQuestionContext({
                    conceptName: item.conceptName,
                    focusHint: item.focusHint,
                    documentIds: examData.documentIds,
                  });

            const sourceChunkIds = context.sourceChunks.map((c) => ({
              chunkId: c.id,
              documentId: c.documentId,
              pageStart: c.pageStart,
              pageEnd: c.pageEnd,
            }));

            const questionData = await generateQuestion(
              item,
              context.contextText,
              sourceChunkIds
            );

            results.push({
              blueprintItem: item,
              questionData: questionData as Record<string, unknown>,
              sourceRefs: context.sourceChunks.map((c) => ({
                chunkId: c.id,
                documentId: c.documentId,
                pageStart: c.pageStart,
                pageEnd: c.pageEnd,
                sectionTitle: c.sectionTitle,
                excerpt: c.content.slice(0, 200),
              })),
            });
          }

          return results;
        }
      );

      allQuestions.push(...batchQuestions);
    }

    // Step 3: Validate and save questions
    await step.run("validate-and-save", async () => {
      await updateProgress("validating", "in_progress");

      const questionRows = [];
      let totalPoints = 0;

      for (let i = 0; i < allQuestions.length; i++) {
        const { blueprintItem, questionData, sourceRefs } = allQuestions[i];

        // Validate
        let qualityScore = 0.8; // Default if validation fails
        try {
          const validation = await validateQuestion(
            JSON.stringify(questionData),
            "" // Context already used in generation
          );
          qualityScore = validation.qualityScore;
        } catch {
          // Validation failure is non-fatal
          console.warn(`Validation failed for question ${i}`);
        }

        const points = blueprintItem.difficulty === "very_hard" ? 3 : blueprintItem.difficulty === "hard" ? 2 : 1;
        totalPoints += points;

        questionRows.push({
          exam_id: examId,
          question_index: i,
          question_type: blueprintItem.questionType,
          difficulty: blueprintItem.difficulty,
          points,
          question_text: (questionData as Record<string, unknown>).questionText as string,
          question_data: questionData,
          source_refs: sourceRefs,
          quality_score: qualityScore,
          metadata: {
            cognitiveLevel: blueprintItem.cognitiveLevel,
            topic: blueprintItem.conceptName,
            subtopic: blueprintItem.focusHint,
          },
        });
      }

      // Save all questions
      const { error: questionsError } = await supabase
        .from("exam_questions")
        .insert(questionRows);

      if (questionsError) {
        throw new Error(`Failed to save questions: ${questionsError.message}`);
      }

      // Update exam
      await updateExamStatus("ready", {
        total_questions: questionRows.length,
        total_points: totalPoints,
      });

      await updateProgress("validating", "completed", {
        totalQuestions: questionRows.length,
        totalPoints,
      });
    });

    return { success: true, examId };
  }
);
