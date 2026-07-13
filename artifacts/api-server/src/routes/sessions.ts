import { Router } from "express";
import { db } from "@workspace/db";
import {
  sessionsTable,
  dialogueTurnsTable,
  modulesTable,
  beatsTable,
  evidenceRecordsTable,
  submissionsTable,
  credentialsTable,
} from "@workspace/db";
import { eq, asc, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

const MASTERY_THRESHOLD = 0.8;

function toSessionResponse(s: typeof sessionsTable.$inferSelect) {
  return {
    id: s.id,
    moduleId: s.moduleId,
    userId: s.userId,
    status: s.status,
    masteryScore: Number(s.masteryScore),
    currentBeatId: s.currentBeatId,
    turnCount: s.turnCount,
    createdAt: s.createdAt.toISOString(),
    completedAt: s.completedAt?.toISOString() ?? null,
  };
}

// GET /sessions
router.get("/sessions", requireAuth, async (req, res) => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, req.userId!))
    .orderBy(desc(sessionsTable.createdAt));
  res.json(sessions.map(toSessionResponse));
});

// POST /sessions
router.post("/sessions", requireAuth, async (req, res) => {
  const { moduleId } = req.body;
  // Get first beat
  const [firstBeat] = await db
    .select()
    .from(beatsTable)
    .where(eq(beatsTable.moduleId, moduleId))
    .orderBy(asc(beatsTable.order))
    .limit(1);

  const [session] = await db
    .insert(sessionsTable)
    .values({
      moduleId,
      userId: req.userId!,
      status: "active",
      masteryScore: "0",
      currentBeatId: firstBeat?.id ?? null,
    })
    .returning();

  // Create initial tutor greeting
  if (firstBeat) {
    const tutorOpening = buildTutorOpening(firstBeat);
    await db.insert(dialogueTurnsTable).values({
      sessionId: session.id,
      role: "tutor",
      content: tutorOpening,
      beatId: firstBeat.id,
    });
    await db
      .update(sessionsTable)
      .set({ turnCount: sql`${sessionsTable.turnCount} + 1` })
      .where(eq(sessionsTable.id, session.id));
  }

  res.status(201).json(toSessionResponse(session));
});

function buildTutorOpening(beat: typeof beatsTable.$inferSelect): string {
  if (beat.type === "scenario" && beat.scenario) {
    return `${beat.scenario}\n\nWhat would you do in this situation, and why?`;
  }
  if (beat.type === "title_card") {
    return `Welcome. Today we're exploring: **${beat.title}**.\n\n${beat.narration}\n\nBefore we dive in — what do you already know about this topic, and what question would you most want answered by the end?`;
  }
  return `Let's think about this together.\n\n${beat.narration}\n\nIn your own words, how would you apply this idea in your work tomorrow?`;
}

// GET /sessions/:sessionId
router.get("/sessions/:sessionId", requireAuth, async (req, res) => {
  const session = await db.query.sessionsTable.findFirst({
    where: eq(sessionsTable.id, req.params.sessionId),
  });
  if (!session) { res.status(404).json({ error: "Not found" }); return; }

  const turns = await db
    .select()
    .from(dialogueTurnsTable)
    .where(eq(dialogueTurnsTable.sessionId, session.id))
    .orderBy(asc(dialogueTurnsTable.createdAt));

  res.json({
    ...toSessionResponse(session),
    turns: turns.map(t => ({
      id: t.id,
      role: t.role,
      content: t.content,
      beatId: t.beatId,
      reasoning: t.reasoning,
      masteryDelta: t.masteryDelta ? Number(t.masteryDelta) : null,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

// POST /sessions/:sessionId/respond — SSE streaming Socratic response
router.post("/sessions/:sessionId/respond", requireAuth, async (req, res) => {
  const { response, beatId } = req.body;
  const { sessionId } = req.params;

  const session = await db.query.sessionsTable.findFirst({
    where: eq(sessionsTable.id, sessionId),
  });
  if (!session || session.userId !== req.userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (session.status === "mastered") {
    res.status(400).json({ error: "Session already completed" });
    return;
  }

  // Get beat context
  const beat = beatId
    ? await db.query.beatsTable.findFirst({ where: eq(beatsTable.id, beatId) })
    : null;

  // Get recent dialogue history (last 8 turns for context)
  const history = await db
    .select()
    .from(dialogueTurnsTable)
    .where(eq(dialogueTurnsTable.sessionId, sessionId))
    .orderBy(desc(dialogueTurnsTable.createdAt))
    .limit(8);
  const historyOrdered = history.reverse();

  // Save learner turn
  await db.insert(dialogueTurnsTable).values({
    sessionId,
    role: "learner",
    content: response,
    beatId: beatId ?? null,
  });

  // Setup SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const beatContext = beat
      ? `Current beat: "${beat.title}" (${beat.type})\nContent: ${beat.narration}${beat.scenario ? `\nScenario: ${beat.scenario}` : ""}${beat.bulletPoints?.length ? `\nKey points: ${beat.bulletPoints.join("; ")}` : ""}`
      : "";

    const systemPrompt = `You are a Socratic tutor using the philosophy of Knowles' andragogy. Your role is to guide learners to insights through questioning, never to lecture or simply tell them the answer.

Core principles:
1. NEVER say "correct" or "incorrect" — every response opens a new line of inquiry
2. If the learner's reasoning is flawed, ask a question that exposes the flaw gently (e.g. "Before we go further, let's test that idea...")
3. If the learner's reasoning is sound, deepen it (e.g. "Good instinct — now what happens when...")
4. Responses must be grounded STRICTLY in the source content. Do not introduce unrelated concepts.
5. Keep responses to 2-4 sentences maximum — this is dialogue, not a lecture
6. Use workplace-authentic South African English
7. End EVERY response with a single focused question
8. Do NOT use bullet points or lists — pure dialogue only

${beatContext}

Assess the learner's demonstrated understanding in your response. If they show genuine comprehension, their mastery improves. If reasoning is shallow or wrong, probe deeper.`;

    const chatMessages: { role: "user" | "assistant"; content: string }[] = [
      ...historyOrdered.map(t => ({
        role: t.role === "tutor" ? ("assistant" as const) : ("user" as const),
        content: t.content,
      })),
      { role: "user", content: response },
    ];

    let fullResponse = "";
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    // Estimate mastery delta based on response quality heuristics
    // In production: use a separate scoring pass
    const masteryDelta = estimateMasteryDelta(response, fullResponse);
    const currentMastery = Number(session.masteryScore);
    const newMastery = Math.min(1, currentMastery + masteryDelta);

    // Save tutor turn
    await db.insert(dialogueTurnsTable).values({
      sessionId,
      role: "tutor",
      content: fullResponse,
      beatId: beatId ?? null,
      masteryDelta: masteryDelta.toString(),
    });

    // Update session
    const nowMastered = newMastery >= MASTERY_THRESHOLD;
    await db
      .update(sessionsTable)
      .set({
        masteryScore: newMastery.toString(),
        turnCount: sql`${sessionsTable.turnCount} + 2`,
        status: nowMastered ? "mastered" : "active",
        completedAt: nowMastered ? new Date() : null,
      })
      .where(eq(sessionsTable.id, sessionId));

    // Record evidence
    await db.insert(evidenceRecordsTable).values({
      userId: req.userId!,
      sessionId,
      type: "session_response",
      description: `Learner response: "${response.slice(0, 100)}..."`,
      score: masteryDelta.toString(),
    });

    // If mastered, issue PraxisMark credential
    if (nowMastered && !session.completedAt) {
      await issueCredential(req.userId!, session, beat);
    }

    res.write(`data: ${JSON.stringify({ done: true, masteryScore: newMastery, mastered: nowMastered })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Session respond error");
    res.write(`data: ${JSON.stringify({ error: "Generation failed", done: true })}\n\n`);
    res.end();
  }
});

function estimateMasteryDelta(learnerResponse: string, tutorResponse: string): number {
  // Simple heuristic — in production use a scoring LLM pass
  const words = learnerResponse.trim().split(/\s+/).length;
  if (words < 5) return 0.02; // Too brief — shallow
  if (words < 20) return 0.06;
  if (words < 50) return 0.10;
  return 0.14; // Detailed response
}

async function issueCredential(userId: string, session: typeof sessionsTable.$inferSelect, beat: any) {
  try {
    const mod = await db.query.modulesTable.findFirst({
      where: eq(modulesTable.id, session.moduleId),
    });
    if (!mod) return;

    const decayDate = new Date();
    decayDate.setMonth(decayDate.getMonth() + 12); // 12-month validity

    await db.insert(credentialsTable).values({
      userId,
      moduleId: session.moduleId,
      moduleTitle: mod.title,
      partnerId: "platform",
      partnerName: "Synops Praxis",
      masteryScore: session.masteryScore,
      evidenceSummary: `Achieved mastery through ${session.turnCount} Socratic exchanges`,
      decayDate,
      status: "valid",
    });
  } catch (_err) {
    // Non-fatal
  }
}

// GET /sessions/:sessionId/progress
router.get("/sessions/:sessionId/progress", requireAuth, async (req, res) => {
  const session = await db.query.sessionsTable.findFirst({
    where: eq(sessionsTable.id, req.params.sessionId),
  });
  if (!session) { res.status(404).json({ error: "Not found" }); return; }

  const [beatCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(beatsTable)
    .where(eq(beatsTable.moduleId, session.moduleId));

  const masteryScore = Number(session.masteryScore);
  const beatsCompleted = Math.floor(masteryScore * Number(beatCountResult.count ?? 0));

  res.json({
    sessionId: session.id,
    masteryScore,
    beatsCompleted,
    totalBeats: Number(beatCountResult.count ?? 0),
    status: session.status,
    competencyScores: [],
  });
});

// POST /learner/submit-work
router.post("/learner/submit-work", requireAuth, async (req, res) => {
  const { moduleId, title, contentText } = req.body;
  const mod = await db.query.modulesTable.findFirst({ where: eq(modulesTable.id, moduleId) });
  const [submission] = await db
    .insert(submissionsTable)
    .values({
      userId: req.userId!,
      moduleId,
      moduleTitle: mod?.title ?? "",
      title,
      contentText,
      status: "submitted",
    })
    .returning();
  res.status(201).json({
    id: submission.id,
    userId: submission.userId,
    moduleId: submission.moduleId,
    moduleTitle: submission.moduleTitle,
    title: submission.title,
    contentText: submission.contentText,
    status: submission.status,
    coachFeedback: submission.coachFeedback,
    createdAt: submission.createdAt.toISOString(),
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
  });
});

export default router;
