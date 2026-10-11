/** Minimal OpenAPI 3.0 document (spec §20: versioned + documented API). */
export const openapiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Class 3 AI Tutor — Backend API",
    version: "1.0.0",
    description:
      "Book-grounded multilingual RAG tutor (Bangla/English/Banglish). Base path /api/v1. Auth: Firebase Bearer for users, server-signed guest token for guest chat.",
  },
  servers: [{ url: "/api/v1", description: "Versioned API" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Firebase ID token or guest token" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "RATE_LIMITED" },
              message: { type: "string" },
              requestId: { type: "string" },
            },
          },
        },
      },
      TutorChatRequest: {
        type: "object",
        required: ["message"],
        properties: {
          conversationId: { type: "string", nullable: true },
          childProfileId: { type: "string", nullable: true },
          message: { type: "string", maxLength: 2000, example: "vognangsho ki? easy kore bujhao" },
          languagePreference: { type: "string", enum: ["bn", "en", "banglish", "auto"], default: "auto" },
          subjectId: { type: "string", nullable: true },
          bookId: { type: "string", nullable: true },
          mode: { type: "string", enum: ["TUTOR", "PRACTICE", "EXPLAIN"], default: "TUTOR" },
        },
      },
      TutorChatResponse: {
        type: "object",
        properties: {
          answer: { type: "string" },
          language: { type: "string", enum: ["bn", "en", "banglish"] },
          answerStatus: { type: "string", enum: ["ANSWERED", "INSUFFICIENT_BOOK_CONTEXT", "CLARIFICATION_NEEDED"] },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                bookId: { type: "string" },
                bookTitle: { type: "string" },
                chapterTitle: { type: "string" },
                pageStart: { type: "number" },
                pageEnd: { type: "number" },
                chunkId: { type: "string" },
              },
            },
          },
          followUpQuestion: { type: "string" },
          requestId: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/health": { get: { summary: "Liveness", responses: { "200": { description: "ok" } } } },
    "/health/ready": { get: { summary: "Readiness", responses: { "200": { description: "ready" } } } },
    "/guest/session": {
      post: {
        summary: "Create guest session (public, rate-limited)",
        responses: { "201": { description: "guest token" } },
      },
    },
    "/me": { get: { summary: "Current user", security: [{ bearerAuth: [] }], responses: { "200": { description: "user" } } } },
    "/tutor/chat": {
      post: {
        summary: "Ask a text question (guest or auth)",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/TutorChatRequest" } } } },
        responses: {
          "200": { description: "tutor answer", content: { "application/json": { schema: { $ref: "#/components/schemas/TutorChatResponse" } } } },
        },
      },
    },
    "/tutor/lesson": { post: { summary: "Generate lesson plan (auth)", security: [{ bearerAuth: [] }], responses: { "201": { description: "lesson" } } } },
    "/tutor/quiz": { post: { summary: "Generate quiz (auth)", security: [{ bearerAuth: [] }], responses: { "201": { description: "quiz" } } } },
    "/books": { get: { summary: "List published books", responses: { "200": { description: "books" } } } },
    "/admin/books": {
      get: { summary: "Admin: list all books", security: [{ bearerAuth: [] }], responses: { "200": { description: "books" } } },
      post: { summary: "Admin: upload book", security: [{ bearerAuth: [] }], responses: { "201": { description: "created" } } },
    },
  },
} as const;
