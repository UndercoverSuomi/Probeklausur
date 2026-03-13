import { NextRequest, NextResponse } from "next/server";
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

export const maxDuration = 300; // 5 minute timeout for long generation

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await params;

  // Verify internal call
  const secret = request.headers.get("x-internal-secret");
  const expectedSecret = process.env.INTERNAL_API_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const userId = body.userId as string;

  const supabase = createServiceClient();

  // ── Helpers ──

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
    // ── Load exam data ──
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("*, exam_documents(document_id)")
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      console.error("Exam not found:", examError);
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const config = exam.config as {
      questionCount: number;
      questionTypes: string[];
      difficulty: string;
      mode: string;
      modelId?: string;
    };

    const documentIds = exam.exam_documents.map(
      (ed: { document_id: string }) => ed.document_id
    );

    // Load concepts
    const { data: conceptRows, error: conceptsError } = await supabase
      .from("document_concepts")
      .select("*")
      .in("document_id", documentIds);

    if (conceptsError) {
      await updateExamStatus("error", {
        error_message: "Konzepte konnten nicht geladen werden",
      });
      return NextResponse.json(
        { error: "Failed to load concepts" },
        { status: 500 }
      );
    }

    const concepts: Concept[] = (conceptRows || []).map(
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

    if (concepts.length === 0) {
      await updateExamStatus("error", {
        error_message: "Keine Konzepte in den ausgewählten Dokumenten gefunden",
      });
      return NextResponse.json(
        { error: "No concepts found" },
        { status: 400 }
      );
    }

    // ── Step 1: Generate blueprint ──
    await updateProgress("blueprint", "in_progress");
    await updateExamStatus("generating");

    const blueprint = await generateBlueprint(
      concepts,
      config.questionCount,
      config.questionTypes,
      config.difficulty,
      config.modelId
    );

    // Save blueprint
    await supabase
      .from("exams")
      .update({ blueprint })
      .eq("id", examId);

    await updateProgress("blueprint", "completed", {
      totalQuestions: blueprint.items.length,
      totalPoints: blueprint.totalPoints,
    });

    // ── Step 2: Generate questions ──
    const allQuestions: {
      blueprintItem: BlueprintItem;
      questionData: Record<string, unknown>;
      sourceRefs: unknown[];
    }[] = [];

    for (let i = 0; i < blueprint.items.length; i++) {
      const item = blueprint.items[i];

      await updateProgress("generating", "in_progress", {
        current: i + 1,
        total: blueprint.items.length,
        percentage: Math.round(((i + 1) / blueprint.items.length) * 100),
      });

      try {
        // Build context
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
      } catch (err) {
        console.error(`Failed to generate question ${i}:`, err);
        // Continue with remaining questions
      }
    }

    await updateProgress("generating", "completed", {
      generated: allQuestions.length,
      total: blueprint.items.length,
    });

    // ── Step 3: Validate and save ──
    await updateProgress("validating", "in_progress");

    const questionRows = [];
    let totalPoints = 0;

    for (let i = 0; i < allQuestions.length; i++) {
      const { blueprintItem, questionData, sourceRefs } = allQuestions[i];

      // Validate (non-fatal)
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

    if (questionRows.length === 0) {
      await updateExamStatus("error", {
        error_message: "Keine Fragen konnten generiert werden",
      });
      return NextResponse.json(
        { error: "No questions generated" },
        { status: 500 }
      );
    }

    // Save all questions
    const { error: questionsError } = await supabase
      .from("exam_questions")
      .insert(questionRows);

    if (questionsError) {
      console.error("Failed to save questions:", questionsError);
      await updateExamStatus("error", {
        error_message: "Fragen konnten nicht gespeichert werden",
      });
      return NextResponse.json(
        { error: "Failed to save questions" },
        { status: 500 }
      );
    }

    // Update exam to ready
    await updateExamStatus("ready", {
      total_questions: questionRows.length,
      total_points: totalPoints,
    });

    await updateProgress("validating", "completed", {
      totalQuestions: questionRows.length,
      totalPoints,
    });

    return NextResponse.json({
      success: true,
      examId,
      questionsGenerated: questionRows.length,
      totalPoints,
    });
  } catch (error) {
    console.error("Generation pipeline error:", error);
    await updateExamStatus("error", {
      error_message:
        error instanceof Error ? error.message : "Unbekannter Fehler",
    });
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
