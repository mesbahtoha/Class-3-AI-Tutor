import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../common/errors/errorHandler.js";
import { validate } from "../../common/middleware/validate.js";
import { requireGuestOrAuth, requireAuth } from "../../common/middleware/auth.js";
import { strictRateLimiter } from "../../common/middleware/rateLimit.js";
import { answerChat } from "./orchestrator.js";
import { getProvider, activeModel } from "../ai-providers/factory.js";
import { retrieveRelevantChunks } from "../retrieval/service.js";
import { prisma } from "../../config/db.js";
import { AppError } from "../../common/errors/AppError.js";
import { lessonPlanSchema, quizSchema } from "./contract.js";
import { detectLanguage, resolveResponseLanguage } from "../../common/utils/language.js";

const router = Router();

export const chatSchema = z.object({
  conversationId: z.string().nullable().optional(),
  childProfileId: z.string().nullable().optional(),
  message: z.string().min(1).max(2000),
  languagePreference: z.enum(["bn", "en", "banglish", "auto"]).default("auto"),
  subjectId: z.string().nullable().optional(),
  bookId: z.string().nullable().optional(),
  mode: z.enum(["TUTOR", "PRACTICE", "EXPLAIN"]).default("TUTOR"),
});

/** POST /tutor/chat — guest (tight limits) or authenticated. */
router.post(
  "/chat",
  strictRateLimiter(),
  requireGuestOrAuth,
  validate({ body: chatSchema }),
  asyncHandler(async (req, res) => {
    const body = chatSchema.parse(req.body);
    const auth = req.auth;
    const result = await answerChat({
      message: body.message,
      conversationId: body.conversationId,
      childProfileId: body.childProfileId,
      languagePreference: body.languagePreference,
      subjectId: body.subjectId ?? undefined,
      bookId: body.bookId ?? undefined,
      mode: body.mode,
      ownerId: auth.kind === "firebase" ? (auth as { userId?: string }).userId ?? null : null,
      guestSessionId: auth.kind === "guest" ? auth.sessionId : null,
      requestId: req.requestId,
    });
    res.json({ data: result, requestId: req.requestId });
  })
);

const lessonSchema = z.object({
  topic: z.string().min(1).max(300),
  bookId: z.string().optional(),
  languagePreference: z.enum(["bn", "en", "banglish", "auto"]).default("auto"),
});

/** POST /tutor/lesson — authenticated. Validated slide JSON for frontend renderer. */
router.post(
  "/lesson",
  requireAuth,
  validate({ body: lessonSchema }),
  asyncHandler(async (req, res) => {
    const body = lessonSchema.parse(req.body);
    const { chunks } = await retrieveRelevantChunks(body.topic, { bookId: body.bookId });
    const detected = detectLanguage(body.topic);
    const language = resolveResponseLanguage(body.languagePreference, detected);
    const provider = getProvider();
    const model = activeModel();

    const raw = await provider.generateStructured(
      [
        { role: "system", content: `Create a Class 3 lesson plan with 3-6 slides using ONLY these slide types: TITLE, EXPLANATION, IMAGE, DIAGRAM, EXAMPLE, INTERACTIVE, QUIZ, SUMMARY. Language: ${language}. Return JSON {title, slides:[{type, data}]}.` },
        { role: "user", content: `Topic: ${body.topic}\nBook context:\n${chunks.slice(0, 4).map((c) => c.content.slice(0, 600)).join("\n---\n") || "(no context)"}` },
      ],
      { title: "string", slides: [{ type: "TITLE|EXPLANATION|...", data: {} }] },
      { model }
    );
    const plan = lessonPlanSchema.parse(raw);

    let saved: { id: string } | null = null;
    try {
      const lesson = await prisma.lesson.create({
        data: {
          topic: body.topic,
          title: plan.title,
          content: plan as unknown as object,
          provider: provider.name,
          model,
        },
      });
      for (let i = 0; i < plan.slides.length; i++) {
        const s = plan.slides[i];
        if (!s) continue;
        await prisma.lessonSlide.create({
          data: { lessonId: lesson.id, order: i, type: s.type, data: s.data as unknown as object },
        });
      }
      saved = { id: lesson.id };
    } catch { /* DB down → still return plan */ }

    res.status(201).json({ data: { ...plan, id: saved?.id ?? null }, requestId: req.requestId });
  })
);

const quizGenSchema = z.object({
  topic: z.string().min(1).max(300),
  lessonId: z.string().optional(),
  numQuestions: z.coerce.number().int().min(1).max(10).default(5),
});

/** POST /tutor/quiz — authenticated. Answer key stays server-side. */
router.post(
  "/quiz",
  requireAuth,
  validate({ body: quizGenSchema }),
  asyncHandler(async (req, res) => {
    const body = quizGenSchema.parse(req.body);
    const provider = getProvider();
    const model = activeModel();
    const raw = await provider.generateStructured(
      [
        { role: "system", content: `Create a Class 3 quiz (encouraging, simple language). Return JSON {title, questions:[{id,type,prompt,options?,answer,explanation}]}. Types: mcq|true_false|short_answer.` },
        { role: "user", content: `Topic: ${body.topic}. ${body.numQuestions} questions.` },
      ],
      { title: "string", questions: [] },
      { model }
    );
    const parsed = quizSchema.parse(raw);
    const questions = parsed.questions.slice(0, body.numQuestions);

    let quizId: string | null = null;
    try {
      const quiz = await prisma.quiz.create({
        data: {
          topic: body.topic,
          lessonId: body.lessonId,
          title: parsed.title,
          questions: questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options })) as unknown as object,
          answerKey: questions.map((q) => ({ id: q.id, answer: q.answer, explanation: q.explanation })) as unknown as object,
          provider: provider.name,
          model,
        },
      });
      quizId = quiz.id;
    } catch { /* DB down */ }

    // Never leak answerKey on creation response.
    res.status(201).json({
      data: {
        id: quizId,
        title: parsed.title,
        questions: questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options })),
      },
      requestId: req.requestId,
    });
  })
);

const attemptSchema = z.object({
  answers: z.array(z.object({ questionId: z.string(), answer: z.string().max(1000) })).min(1).max(20),
  childProfileId: z.string().optional(),
});

/** POST /tutor/quiz/:id/attempts — supportive feedback, never shaming. */
router.post(
  "/quiz/:id/attempts",
  requireAuth,
  validate({ body: attemptSchema }),
  asyncHandler(async (req, res) => {
    const body = attemptSchema.parse(req.body);
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz) throw new AppError("NOT_FOUND", "Quiz not found.");
    const key = quiz.answerKey as unknown as Array<{ id: string; answer: string; explanation?: string }>;
    const keyById = new Map(key.map((k) => [k.id, k]));

    let correct = 0;
    const perQuestion = body.answers.map((a) => {
      const expected = keyById.get(a.questionId);
      const ok = expected !== undefined && expected.answer.trim().toLowerCase() === a.answer.trim().toLowerCase();
      if (ok) correct++;
      return { questionId: a.questionId, correct: ok, explanation: expected?.explanation };
    });
    const score = body.answers.length > 0 ? correct / body.answers.length : 0;
    const feedback =
      score >= 0.8 ? "Khub bhalo! Tumi darun korecho! 🌟"
      : score >= 0.5 ? "Bhalo chesta! Cholo bhul gulo ekshathe abar dekhi. 💪"
      : "Kono chinta nei — shikhte shomoy lage. Ami abar shohoj kore bujhiye dichhi. 🌱";

    const header = req.header("authorization") ?? "";
    void header;
    try {
      const attempt = await prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          ownerId: (req.auth as { userId?: string }).userId ?? "unknown",
          answers: body.answers as unknown as object,
          score,
          feedback: `${feedback} ${JSON.stringify(perQuestion).slice(0, 1000)}`,
        },
      });
      res.status(201).json({ data: { id: attempt.id, score, correct, total: body.answers.length, feedback, perQuestion }, requestId: req.requestId });
    } catch {
      res.status(201).json({ data: { id: null, score, correct, total: body.answers.length, feedback, perQuestion }, requestId: req.requestId });
    }
  })
);

export default router;
