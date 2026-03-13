import { NextRequest, NextResponse, after } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { examConfigSchema } from "@/types/exam";
import { generateBlueprint, generateQuestion, validateQuestion } from "@/lib/ai/generate";
import { buildQuestionContext, buildCrossConceptContext } from "@/lib/retrieval/context-builder";
import type { Concept } from "@/lib/ai/schemas/concept-map";
import type { BlueprintItem } from "@/lib/ai/schemas/blueprint";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = examConfigSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Ungültige Konfiguration",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const config = parseResult.data;

    // Verify all documents exist and belong to user
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("id, status, filename")
      .in("id", config.documentIds)
      .eq("user_id", user.id);

    if (docsError) {
      return NextResponse.json(
        { error: "Fehler beim Prüfen der Dokumente" },
        { status: 500 }
      );
    }

    if (!docs || docs.length !== config.documentIds.length) {
      return NextResponse.json(
        { error: "Eines oder mehrere Dokumente wurden nicht gefunden" },
        { status: 404 }
      );
    }

    const notReady = docs.filter((d) => d.status !== "ready");
    if (notReady.length > 0) {
      return NextResponse.json(
        { error: "Alle Dokumente müssen fertig verarbeitet sein" },
        { status: 400 }
      );
    }

    // Build exam title from document filenames
    const docNames = docs
      .map((d) => d.filename?.replace(/\.pdf$/i, ""))
      .filter(Boolean);
    const title =
      docNames.length > 0
        ? `Probeklausur — ${docNames.slice(0, 2).join(", ")}${docNames.length > 2 ? ` (+${docNames.length - 2})` : ""}`
        : `Probeklausur ${new Date().toLocaleDateString("de-DE")}`;

    // Create exam record
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .insert({
        user_id: user.id,
        title,
        status: "created",
        config: {
          questionCount: config.questionCount,
          questionTypes: config.questionTypes,
          difficulty: config.difficulty,
          mode: config.mode,
          timeLimitMinutes: config.timeLimitMinutes,
          modelId: config.modelId,
        },
        total_questions: config.questionCount,
        total_points: 0,
      })
      .select("id")
      .single();

    if (examError || !exam) {
      console.error("Failed to create exam:", examError);
      return NextResponse.json(
        { error: "Klausur konnte nicht erstellt werden" },
        { status: 500 }
      );
    }

    // Create exam_documents entries
    const examDocuments = config.documentIds.map((docId) => ({
      exam_id: exam.id,
      document_id: docId,
    }));

    const { error: edError } = await supabase
      .from("exam_documents")
      .insert(examDocuments);

    if (edError) {
      console.error("Failed to link documents:", edError);
      // Clean up the exam
      await supabase.from("exams").delete().eq("id", exam.id);
      return NextResponse.json(
        { error: "Dokumente konnten nicht verknüpft werden" },
        { status: 500 }
      );
    }

    // Run generation in background using after()
    const examId = exam.id;
    const userId = user.id;
    const examConfig = config;

    after(async () => {
      const service = createServiceClient();

      async function updateProgress(
        stepName: string,
        status: string,
        details: Record<string, unknown> = {}
      ) {
        await service.from("processing_progress").upsert(
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
        await service
          .from("exams")
          .update({ status, updated_at: new Date().toISOString(), ...extra })
          .eq("id", examId);
      }

      try {
        const documentIds = examConfig.documentIds;

        // Load concepts
        const { data: conceptRows } = await service
          .from("document_concepts")
          .select("*")
          .in("document_id", documentIds);

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
            hasFormulas: !!((c.metadata as Record<string, unknown>)?.hasFormulas),
            hasCaseExamples: !!((c.metadata as Record<string, unknown>)?.hasCaseExamples),
          })
        );

        if (concepts.length === 0) {
          await updateExamStatus("error", {
            error_message: "Keine Konzepte in den Dokumenten gefunden",
          });
          return;
        }

        // Step 1: Blueprint
        await updateProgress("blueprint", "in_progress");
        await updateExamStatus("generating");

        const blueprint = await generateBlueprint(
          concepts,
          examConfig.questionCount,
          examConfig.questionTypes,
          examConfig.difficulty,
          examConfig.modelId
        );

        await service.from("exams").update({ blueprint }).eq("id", examId);
        await updateProgress("blueprint", "completed");

        // Step 2: Generate questions
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
          });

          try {
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

            const questionData = await generateQuestion(
              item,
              context.contextText,
              context.sourceChunks.map((c) => ({
                chunkId: c.id,
                documentId: c.documentId,
                pageStart: c.pageStart,
                pageEnd: c.pageEnd,
              })),
              examConfig.modelId
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
          }
        }

        await updateProgress("generating", "completed");

        // Step 3: Validate and save
        await updateProgress("validating", "in_progress");

        const questionRows = [];
        let totalPoints = 0;

        for (let i = 0; i < allQuestions.length; i++) {
          const { blueprintItem, questionData, sourceRefs } = allQuestions[i];

          let qualityScore = 0.8;
          try {
            const validation = await validateQuestion(
              JSON.stringify(questionData),
              ""
            );
            qualityScore = validation.qualityScore;
          } catch {
            /* skip */
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

        if (questionRows.length === 0) {
          await updateExamStatus("error", {
            error_message: "Keine Fragen konnten generiert werden",
          });
          return;
        }

        const { error: questionsError } = await service
          .from("exam_questions")
          .insert(questionRows);

        if (questionsError) {
          await updateExamStatus("error", {
            error_message: "Fragen konnten nicht gespeichert werden",
          });
          return;
        }

        await updateExamStatus("ready", {
          total_questions: questionRows.length,
          total_points: totalPoints,
        });
        await updateProgress("validating", "completed");
      } catch (error) {
        console.error("Generation pipeline error:", error);
        await updateExamStatus("error", {
          error_message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        });
      }
    });

    return NextResponse.json({ examId: exam.id });
  } catch (error) {
    console.error("Exam generation error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
