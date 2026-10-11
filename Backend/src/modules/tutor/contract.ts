import { z } from "zod";

/** Standard tutor response contract (spec §9) — validated with Zod. */
export const sourceSchema = z.object({
  bookId: z.string(),
  bookTitle: z.string(),
  chapterId: z.string().optional(),
  chapterTitle: z.string().optional(),
  pageStart: z.number(),
  pageEnd: z.number().optional(),
  chunkId: z.string(),
});

export const slideSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TITLE"), data: z.object({ heading: z.string(), subheading: z.string().optional() }) }),
  z.object({ type: z.literal("EXPLANATION"), data: z.object({ body: z.string(), points: z.array(z.string()).optional() }) }),
  z.object({ type: z.literal("IMAGE"), data: z.object({ imageRef: z.string(), caption: z.string().optional(), alt: z.string().optional() }) }),
  z.object({ type: z.literal("DIAGRAM"), data: z.object({ title: z.string(), description: z.string(), labels: z.array(z.string()).optional() }) }),
  z.object({ type: z.literal("EXAMPLE"), data: z.object({ title: z.string(), steps: z.array(z.string()) }) }),
  z.object({ type: z.literal("INTERACTIVE"), data: z.object({ prompt: z.string(), hint: z.string().optional() }) }),
  z.object({ type: z.literal("QUIZ"), data: z.object({ question: z.string(), options: z.array(z.string()).optional(), answer: z.string().optional() }) }),
  z.object({ type: z.literal("SUMMARY"), data: z.object({ points: z.array(z.string()) }) }),
]);

export const tutorResponseSchema = z.object({
  answer: z.string().min(1).max(8000),
  language: z.enum(["bn", "en", "banglish"]),
  answerStatus: z.enum(["ANSWERED", "INSUFFICIENT_BOOK_CONTEXT", "CLARIFICATION_NEEDED"]),
  sources: z.array(sourceSchema),
  followUpQuestion: z.string().optional(),
  requestId: z.string(),
});

export type TutorResponse = z.infer<typeof tutorResponseSchema>;
export type Source = z.infer<typeof sourceSchema>;

export const lessonPlanSchema = z.object({
  title: z.string().min(1).max(200),
  slides: z.array(slideSchema).min(1).max(20),
});

export type LessonPlan = z.infer<typeof lessonPlanSchema>;

export const quizQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["mcq", "true_false", "short_answer"]),
  prompt: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().min(1),
  explanation: z.string().optional(),
});

export const quizSchema = z.object({
  title: z.string(),
  questions: z.array(quizQuestionSchema).min(1).max(20),
});

export type QuizPayload = z.infer<typeof quizSchema>;
