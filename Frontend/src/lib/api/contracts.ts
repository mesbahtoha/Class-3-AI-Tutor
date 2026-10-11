/** Shared API contracts — mirror of backend Zod schemas (never invent fields). */

export type Language = "bn" | "en" | "banglish";
export type LanguagePreference = "auto" | Language;
export type AnswerStatus = "ANSWERED" | "INSUFFICIENT_BOOK_CONTEXT" | "CLARIFICATION_NEEDED";
export type Role = "GUARDIAN" | "TEACHER" | "CONTENT_EDITOR" | "SUPPORT" | "SUPER_ADMIN";

export interface Source {
  bookId: string;
  bookTitle: string;
  chapterId?: string;
  chapterTitle?: string;
  pageStart: number;
  pageEnd?: number;
  chunkId: string;
}

export interface TutorChatRequest {
  conversationId: string | null;
  childProfileId?: string | null;
  message: string;
  languagePreference: LanguagePreference;
  subjectId?: string | null;
  bookId?: string | null;
  mode: "TUTOR" | "PRACTICE" | "EXPLAIN";
}

export interface TutorChatResponse {
  answer: string;
  language: Language;
  answerStatus: AnswerStatus;
  sources: Source[];
  followUpQuestion?: string;
  requestId: string;
  conversationId?: string;
  messageId?: string;
}

export type SlideType =
  | "TITLE" | "EXPLANATION" | "IMAGE" | "DIAGRAM"
  | "EXAMPLE" | "INTERACTIVE" | "QUIZ" | "SUMMARY";

export interface LessonSlide {
  type: SlideType | string;
  data: Record<string, unknown>;
}

export interface LessonPlan {
  id?: string | null;
  title: string;
  slides: LessonSlide[];
}

/** Quiz question WITHOUT answer (backend never leaks the key on creation). */
export interface QuizQuestionPublic {
  id: string;
  type: "mcq" | "true_false" | "short_answer";
  prompt: string;
  options?: string[];
}

export interface QuizPublic {
  id: string | null;
  title: string;
  questions: QuizQuestionPublic[];
}

export interface QuizAttemptResult {
  id: string | null;
  score: number;
  correct: number;
  total: number;
  feedback: string;
  perQuestion: Array<{ questionId: string; correct: boolean; explanation?: string }>;
}

export interface MeResponse {
  id?: string;
  firebaseUid: string;
  email?: string | null;
  role: Role | "GUARDIAN";
  status?: string;
  allowedFeatures?: string[];
  dbPersisted?: boolean;
}

export interface BookPublic {
  id: string;
  title: string;
  grade: string;
  curriculumName: string;
  subjectName: string;
  language: string;
  editionYear?: string | null;
  editionLabel?: string | null;
  pageCount?: number | null;
  updatedAt?: string;
}

export interface ChildProfile {
  id: string;
  guardianUserId: string;
  nickname: string;
  grade: string;
  curriculumId?: string | null;
  preferredLanguage: string;
}

export interface ConversationSummary {
  id: string;
  title?: string | null;
  status: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface ApiErrorBody {
  error: { code: string; message: string; requestId: string };
}
