import { createServiceClient } from "@/lib/supabase/server";
import {
  generateBlueprint,
  generateQuestion,
  validateQuestion,
} from "@/lib/ai/generate";
import {
  buildQuestionContext,
  buildCrossConceptContext,
} from "@/lib/retrieval/context-builder";
import type { Concept } from "@/lib/ai/schemas/concept-map";
import type { BlueprintItem } from "@/lib/ai/schemas/blueprint";

interface GenerateExamInput {
  examId: string;
  userId: string;
}

/**
 * Generate exam questions through the full pipeline:
 * Load config → Blueprint → Generate questions → Validate → Save
 */
export async function generateExamPipeline(
  input: GenerateExamInput
): Promise<{ success: boolean; error?: string }> {
  const { examId, userId } = input;
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

  async function updateExamStatus(
    status: string,
    extra: Record<string, unknown> = {}
  ) {
    await supabase
      .from("exams")
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq("id", examId);
  }

  try {
    // ── Load exam data ─────────────────────────────────────
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("*, exam_documents(document_id)")
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      throw new Error("Klausur nicht gefunden");
    }

    const documentIds = exam.exam_documents.map(
      (ed: { document_id: string }) => ed.document_id
    );

    const { data: concepts, error: conceptsError } = await supabase
      .from("document_concepts")
      .select("*")
      .in("document_id", documentIds);

    if (conceptsError) {
      throw new Error("Konzepte konnten nicht geladen werden");
    }

    const config = exam.config as {
      questionCount: number;
      questionTypes: string[];
      difficulty: string;
      mode: string;
      modelId?: string;
    };

    const mappedConcepts: Concept[] = (concepts || []).map(
      (c: Record<string, unknown>) => ({
        name: c.name as string,
        description: (c.description as string) || "",
        importanceScore: Number(c.importance_score),
        difficulty:
          (((c.metadata as Record<string, unknown>)?.difficulty as string) ||
          "medium") as "easy" | "medium" | "hard",
        pageReferences: (c.page_references as number[]) || [],
        parentConceptName: null,
        relatedConcepts:
          ((c.metadata as Record<string, unknown>)?.relatedConcepts as string[]) ||
          [],
        hasFormulas: !!(
          (c.metadata as Record<string, unknown>)?.hasFormulas
        ),
        hasCaseExamples: !!(
          (c.metadata as Record<string, unknown>)?.hasCaseExamples
        ),
      })
    );

    // ── Generate Blueprint ─────────────────────────────────
    await updateProgress("blueprint", "in_progress");
    await updateExamStatus("generating");

    const blueprint = await generateBlueprint(
      mappedConcepts,
      config.questionCount,
      config.questionTypes,
      config.difficulty,
      config.modelId
    );

    await supabase
      .from("exams")
      .update({ blueprint })
      .eq("id", examId);

    await updateProgress("blueprint", "completed", {
      totalQuestions: blueprint.items.length,
      totalPoints: blueprint.totalPoints,
    });

    // ── Generate Questions ─────────────────────────────────
    const allQuestions: {
      blueprintItem: BlueprintItem;
      questionData: Record<string, unknown>;
      sourceRefs: unknown[];
    }[] = [];

    for (let i = 0; i < blueprint.items.length; i++) {
      const item = blueprint.items[i];

      await updateProgress("generating", "in_progress", {
        currentQuestion: i + 1,
        totalQuestions: blueprint.items.length,
      });

      try {
        // Build context based on difficulty
        const context =
          item.secondaryConceptName &&
          (item.difficulty === "hard" || item.difficulty === "very_hard")
            ? await buildCrossConceptContext(
                [item.conceptName, item.secondaryConceptName],
                documentIds
              )
            : await buildQuestionContext({
                conceptName: item.conceptName,
                focusHint: item.focusHint,
                documentIds,
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
          sourceChunkIds,
          config.modelId
        );

        allQuestions.push({
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
      } catch (questionError) {
        console.error(
          `Failed to generate question ${i + 1}:`,
          questionError
        );
        // Skip this question rather than failing the whole exam
      }
    }

    if (allQuestions.length === 0) {
      throw new Error(
        "Keine Fragen konnten generiert werden. Das Material ist möglicherweise nicht ausreichend."
      );
    }

    // ── Validate and Save ──────────────────────────────────
    await updateProgress("validating", "in_progress");

    const questionRows = [];
    let totalPoints = 0;

    for (let i = 0; i < allQuestions.length; i++) {
      const { blueprintItem, questionData, sourceRefs } = allQuestions[i];

      // Try to validate (non-blocking)
      let qualityScore = 0.8;
      try {
        const validation = await validateQuestion(
          JSON.stringify(questionData),
          ""
        );
        qualityScore = validation.qualityScore;
      } catch {
        console.warn(`Validation failed for question ${i}`);
      }

      const points =
        blueprintItem.difficulty === "very_hard"
          ? 3
          : blueprintItem.difficulty === "hard"
            ? 2
            : 1;
      totalPoints += points;

      questionRows.push({
        exam_id: examId,
        question_index: i,
        question_type: blueprintItem.questionType,
        difficulty: blueprintItem.difficulty,
        points,
        question_text: (questionData as Record<string, unknown>)
          .questionText as string,
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

    const { error: questionsError } = await supabase
      .from("exam_questions")
      .insert(questionRows);

    if (questionsError) {
      throw new Error(
        `Fragen konnten nicht gespeichert werden: ${questionsError.message}`
      );
    }

    await updateExamStatus("ready", {
      total_questions: questionRows.length,
      total_points: totalPoints,
    });

    await updateProgress("validating", "completed", {
      totalQuestions: questionRows.length,
      totalPoints,
    });

    await updateProgress("complete", "completed");

    return { success: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error(`Exam generation failed for ${examId}:`, errorMessage);

    await updateExamStatus("error", { error_message: errorMessage });
    await updateProgress("error", "error", { message: errorMessage });

    return { success: false, error: errorMessage };
  }
}
