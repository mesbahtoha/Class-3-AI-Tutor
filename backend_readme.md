# Class 3 AI Tutor — Backend PRD & Technical Requirements

> **Document type:** Product Requirements Document (PRD) + Backend Technical Specification  
> **Version:** 1.0  
> **Status:** Initial implementation baseline  
> **Primary market:** Bangladesh  
> **Initial audience:** Class 3 learners, with a parent/guardian account model  
> **Initial experience:** Website first; the same backend API must support a future Android/iOS app  
> **Primary content source:** Authorized Class 3 curriculum books (start with one selected curriculum and subject, then expand)

---

## 1. Product Overview

Build a child-friendly AI tutoring platform that teaches Class 3 students using approved textbooks. The system must do more than return chatbot answers: it should explain concepts in simple language, cite the relevant book and page when possible, generate structured lessons and quizzes, and re-explain concepts when a student struggles.

The first client is a responsive website. The backend must be client-independent so the same REST API can later be consumed by a React Native/Expo mobile application without rewriting the RAG, authentication, book ingestion, AI-provider, or learning logic.

### 1.1 Core learning loop

The tutoring experience should follow this cycle:

1. Understand the learner's question and preferred language.
2. Retrieve relevant content from the published textbook knowledge base.
3. Explain the concept at a Class 3 reading level.
4. Include a source reference when the answer is based on textbook content.
5. Offer a suitable example, diagram/slide, or practice question when requested or helpful.
6. Evaluate the learner's answer and provide supportive feedback.
7. Explain again in a different way if the learner does not understand.

### 1.2 Product principles

- **Book-grounded:** Prefer approved textbook content for curriculum questions. Do not invent a book citation.
- **Child-appropriate:** Use kind, safe, age-appropriate explanations. Never shame a learner for a wrong answer.
- **Multilingual:** Support Bangla script, English, Banglish/Romanized Bangla, and mixed-language questions.
- **Provider-independent:** The application must not be tightly coupled to OpenRouter, Claude, Gemini, or any single LLM vendor.
- **Admin-controlled:** Books and curriculum content are uploaded, reviewed, published, reprocessed, and retired through the Admin Panel.
- **Privacy-first:** Collect the minimum learner data required. Guest text chat should not create a permanent user profile.
- **Accessible and lightweight:** Design APIs for mobile networks and lower-end devices. Keep media generation optional and bounded.

---

## 2. Scope

### 2.1 MVP scope

1. Firebase Authentication integration for Google and email/password sign-in.
2. Guest mode with limited text-only tutoring.
3. Server-side identity and role authorization.
4. Admin-created Super Admin role through a secure bootstrap/seed process.
5. Admin-managed textbook upload, processing, preview, publish/unpublish, re-indexing, replacement, and archive/delete workflow.
6. RAG question answering from published books, with source references.
7. A provider adapter layer so OpenRouter can be used initially and Anthropic Claude can be configured later.
8. Separate embedding and media adapters, not coupled to the chosen LLM provider.
9. Structured lesson/slide and quiz generation for frontend rendering.
10. Learner image upload/camera question flow for authenticated users.
11. Voice transcription and speech generation behind configurable adapters. Provider availability can vary; the API must report unsupported capabilities gracefully.
12. Conversation history, feedback, usage limits, logging, and basic learning progress.
13. Rate limits, file validation, safe error handling, tests, and deployment configuration.

### 2.2 Post-MVP / later phases

- Advanced real-time conversational voice.
- Streaming voice-to-voice sessions.
- Teacher/classroom management.
- Multiple curricula, grades, and school-level tenancy.
- Offline lesson packs / PWA support.
- Advanced personalization and mastery models.
- Automated animation/video generation. MVP should render predefined components and animations from validated lesson JSON instead.
- Large-scale analytics and data warehouse.

### 2.3 Out of scope for initial release

- Open public social/chat features between children.
- Unmoderated public upload-to-knowledge-base workflows.
- Face recognition, emotion detection, or continuous camera monitoring.
- Allowing learners to upload books directly into the official shared knowledge base.
- Autonomous changes to model/API keys by ordinary users.

---

## 3. Technology Stack

Use a modular monolith for the initial backend. Keep clear module boundaries so individual components can be split into services later if the project needs it.

| Area | Recommended technology | Notes |
|---|---|---|
| Runtime | Node.js LTS + TypeScript | Use strict TypeScript settings. |
| API | Express.js + REST | All public endpoints versioned under `/api/v1`. |
| Validation | Zod | Validate request bodies, query parameters, environment values, and structured AI output. |
| Database | PostgreSQL | Main relational database. |
| ORM | Prisma ORM | Use Prisma migrations. For pgvector-specific operations, use reviewed SQL migrations/raw queries where needed. |
| Vector search | pgvector | Vector dimension must match the configured embedding model. |
| Text search | PostgreSQL full-text search | Combine with vector retrieval for hybrid search. |
| Authentication | Firebase Authentication | Google and email/password sign-in on the client; verify Firebase ID tokens on the backend. |
| Background work | Redis + BullMQ (recommended for book ingestion) | Do long-running parsing/OCR/embedding work outside ordinary HTTP requests. If Redis is not available in the earliest MVP, keep a replaceable job interface and do not block requests for long periods. |
| File storage | S3-compatible object storage, e.g. Cloudflare R2 | Use local storage only for local development. Do not store large PDFs/audio/images as database blobs by default. |
| LLM | Provider adapters: OpenRouter first, Anthropic Claude later; optional Gemini adapter | Model IDs must be configurable, not hard-coded into business logic. |
| Embeddings | Dedicated embedding adapter | Embedding provider/model is configured separately from the LLM. |
| OCR | OCR adapter | Evaluate Bengali printed/scanned text, page order, tables, and mathematical notation before selecting a provider. |
| Speech-to-text | STT adapter | Test `bn-BD`, English, and mixed Bangla-English speech with real samples. |
| Text-to-speech | TTS adapter | Voice availability, language, latency, and pricing must be checked for the selected provider. |
| Tests | Vitest or Jest + Supertest | Unit, integration, and API tests. |
| API documentation | OpenAPI/Swagger | Keep request/response schemas aligned with validation schemas. |
| Logging | Pino or equivalent structured logger | Redact secrets, tokens, and sensitive learner content. |

### 3.1 Architectural rule

Do not put all code into one large route/controller file. Use feature modules and service interfaces. The first deployment can still be one API application plus one background worker process.

---

## 4. High-Level Architecture

```mermaid
flowchart TD
    WEB[Next.js Website] --> API[Express REST API]
    MOBILE[Future Expo / React Native App] --> API
    ADMIN[Admin Panel] --> API

    API --> AUTH[Firebase Token Verification + RBAC]
    API --> TUTOR[AI Tutor Orchestrator]
    API --> DB[(PostgreSQL + pgvector)]
    API --> STORAGE[Object Storage]
    API --> JOBS[Job Queue]

    TUTOR --> RETRIEVAL[Multilingual Hybrid RAG]
    RETRIEVAL --> DB
    TUTOR --> LLM[LLM Provider Adapter]
    LLM --> OR[OpenRouter]
    LLM --> CLAUDE[Anthropic Claude]
    LLM --> OTHER[Other Compatible Providers]

    JOBS --> WORKER[Ingestion Worker]
    WORKER --> EXTRACT[PDF/Text Extraction + OCR]
    WORKER --> CHUNK[Chunking + Metadata]
    WORKER --> EMBED[Embedding Adapter]
    EMBED --> DB

    API --> MEDIA[Vision / STT / TTS Adapters]
```

### 4.1 Important separation of responsibilities

- **LLM adapter:** Generates explanations, structured lessons, and quizzes.
- **Embedding adapter:** Converts documents and queries into vectors. This is independent from the LLM adapter.
- **Retrieval service:** Searches and ranks approved book chunks.
- **OCR/document extraction adapter:** Extracts source text and page data from uploaded books.
- **Media adapters:** Handle vision, speech-to-text, and text-to-speech.
- **Tutor orchestrator:** Coordinates authorization, context, retrieval, prompt rules, model calls, output validation, citations, usage limits, and persistence.

Switching the text-generation provider must not require a change to the frontend, database business logic, book ingestion workflow, or API contract. Changing the **embedding model** is different: the existing vectors may need a full re-embedding/re-indexing job.

---

## 5. User Types, Authentication, and Authorization

### 5.1 User types

- `GUEST`: No account; limited text-only chat.
- `GUARDIAN`: Registered adult account that may manage one or more child profiles.
- `TEACHER`: Reserved for a future classroom/teacher experience; disabled unless implemented.
- `CONTENT_EDITOR`: Can manage book content within granted permissions; cannot manage Super Admin access or secret keys.
- `SUPPORT`: Restricted support role; no default access to private conversations.
- `SUPER_ADMIN`: Full platform administration, subject to audit logging.

Use an enum or a normalized roles/permissions table. Do not accept a role value from a public signup request.

### 5.2 Firebase Auth flow

1. The client signs in using Firebase Authentication (Google or email/password).
2. The client sends the Firebase ID token as `Authorization: Bearer <token>` to protected backend endpoints.
3. Backend middleware verifies the token using Firebase Admin SDK.
4. Backend maps the verified Firebase UID to a local `users` record.
5. Backend loads the user's role/permissions from the database.
6. The API authorizes the specific resource and action before returning or modifying data.

Do not treat a decoded-but-unverified token as authentication. Do not accept `userId`, `role`, or `isAdmin` from the request body as proof of identity or permission.

### 5.3 Guest text chat

- Provide `POST /api/v1/guest/session` to issue a short-lived server-controlled guest session token or equivalent signed session.
- Guest mode may use text chat only in MVP.
- Guest requests must have stricter limits by session and IP/network where feasible.
- Guest conversation data is temporary and must expire automatically after a configured TTL.
- Do not store long-term learner progress or a permanent user profile for a guest.
- Voice, image/camera uploads, saved history, personalized lessons, and progress require authentication.
- Never rely only on a client-supplied `guestId`; sign/verify guest session credentials server-side.

### 5.4 Guardian and child profile model

Class 3 learners may not have their own email addresses. Prefer a guardian-owned account with separate child profiles.

Minimum child profile fields:

- `id`
- `guardianUserId`
- `nickname` (avoid requiring the child's full legal name)
- `grade` (initially Class 3)
- `curriculumId`
- `preferredLanguage` (`bn`, `en`, `banglish`, or `auto`)
- optional learning preferences
- timestamps and deletion status

Do not collect exact birth date, school name, address, contacts, photos of faces, or other sensitive data unless a specific product requirement and a reviewed privacy basis justify it.

### 5.5 Super Admin bootstrap

Create the first Super Admin through a controlled server-side seed/bootstrap script, not a public signup form.

Recommended process:

1. An authorized operator sets the target verified Firebase UID (and optionally expected email) in secure deployment configuration.
2. The script verifies the Firebase user exists.
3. The script creates/updates the local user record and assigns `SUPER_ADMIN` in the database.
4. The script is idempotent and refuses unsafe or ambiguous inputs.
5. Every later role change is permission-checked and written to `audit_logs`.

Environment variable names are examples and must not be committed with real values. Never allow an ordinary user to promote themselves by changing a request payload.

---

## 6. Admin-Controlled Book Management

**Requirement:** Admins must be able to manage all official knowledge-base books from the Admin Panel. A developer should not have to add each book manually to source code or redeploy the backend simply to upload a new book.

### 6.1 Book metadata

Each book should store at least:

- `title`
- `grade` / class
- `curriculum` (e.g. the selected NCTB track)
- `subject`
- `language`
- `editionYear` or edition label
- `publisher` / source organization where applicable
- `sourceUrl` or source notes, if relevant
- `rightsStatus` / permission notes
- `storageKey` for the original file
- `mimeType`, `fileSize`, checksum/hash
- `processingStatus`
- `publicationStatus`
- `uploadedBy`, `reviewedBy`, `publishedBy`
- timestamps and soft-delete/archive status

Do not assume every Class 3 curriculum or track uses the same book list. Admins must be able to distinguish curriculum, edition, language, and subject.

### 6.2 Book processing state machine

Suggested states:

`UPLOADED -> QUEUED -> PROCESSING -> REVIEW_REQUIRED -> READY_TO_PUBLISH -> PUBLISHED`

Failure/recovery states can include `FAILED`, `NEEDS_RETRY`, `UNPUBLISHED`, `ARCHIVED`.

A book must not be retrievable by student queries until it has passed the configured validation/review process and is `PUBLISHED`.

### 6.3 Ingestion pipeline

1. **Upload:** Validate file size, file signature/content type, allowed format, and authorization.
2. **Store original:** Save the original file in private object storage. Save its metadata in PostgreSQL.
3. **Queue job:** Add an ingestion job. Return a job ID without waiting for OCR/embedding to finish.
4. **Extract:** Extract text from digital PDFs and supported text files. Use OCR for scanned pages where required.
5. **Page mapping:** Preserve physical page numbers and any printed page labels when available. Do not silently lose page boundaries.
6. **Review extraction:** Store extraction warnings and low-confidence OCR information. Provide a preview in the Admin Panel.
7. **Structure:** Extract or allow editors to define chapters, topics, page ranges, diagrams, examples, and exercises.
8. **Chunk:** Create semantically meaningful chunks without mixing unrelated chapters unnecessarily.
9. **Metadata:** Attach `bookId`, `edition`, `grade`, `curriculum`, `subject`, `chapterId`, `pageStart`, `pageEnd`, language, and content type to every chunk.
10. **Embed:** Generate vectors using the configured embedding adapter/model.
11. **Index:** Save chunks and vectors to PostgreSQL/pgvector and update full-text search data.
12. **Validate:** Run ingestion checks: empty pages, duplicate pages, extraction failure, missing references, malformed vectors, and expected page count.
13. **Review/publish:** Admin reviews the result and publishes it.
14. **Re-index/replace:** A new edition must have a clear version and must not silently mix with a prior edition. Use safe replacement/rollback semantics.

### 6.4 File rules

- Initial admin book ingestion: PDF; optionally TXT/DOCX only if extraction support is implemented and tested.
- Learner question upload: JPEG, PNG, and WebP; PDF only if explicitly enabled and tested.
- Validate file content/signature, not only the extension or browser-supplied MIME type.
- Enforce configurable maximum size and page count.
- Use private storage and short-lived signed URLs where necessary.
- Run malware scanning if supported by the deployment environment.
- Do not execute or render arbitrary uploaded HTML/SVG as trusted content.
- Keep learner uploads in a separate namespace from official books.
- Never automatically add learner-uploaded files to the shared official knowledge base.

### 6.5 Background processing

OCR, parsing, embeddings, and re-indexing may take longer than a normal HTTP request. Use a queue/worker abstraction, preferably Redis + BullMQ. Jobs need:

- stable job ID
- status/progress/error code
- retry policy with bounded attempts
- idempotency
- per-job logs without secret leakage
- cancellation where safe
- recovery after a worker restart

Do not hold a database transaction open while calling an external AI/OCR API.

---

## 7. RAG and Bangla / English / Banglish Support

### 7.1 Required supported input styles

Examples that must be included in the evaluation set:

- Bangla script: `ভগ্নাংশ কী? সহজ করে বোঝাও।`
- English: `What is a fraction? Explain for Class 3.`
- Banglish: `vognangsho ki? easy kore bujhao`
- Mixed: `এই math ta step by step explain koro`
- Spelling variation: `bujhao`, `bojhao`, `bujhai`, `kivabe`, `kibhabe`
- Follow-up: `amar answer vul holo keno?`

Banglish can be inconsistent and ambiguous. Do not assume a simple character-by-character transliteration is always correct.

### 7.2 Query-processing pipeline

1. Preserve the original question exactly for context and audit/debugging with appropriate privacy controls.
2. Detect likely language/script: Bangla, English, Banglish, mixed, or unknown.
3. Normalize harmless whitespace and common spelling forms while preserving meaning.
4. Optionally generate one or more candidate variants (for example, romanized query plus Bengali-script variant). Do not replace the only original query.
5. Apply conversation context and explicit selected book/subject filters when available.
6. Run hybrid retrieval: vector similarity plus PostgreSQL full-text/keyword search.
7. Filter by published books, grade, curriculum, subject, language/edition where relevant.
8. Combine/deduplicate candidate results and rank them.
9. Check retrieval relevance. If confidence is insufficient, ask a clarifying question or state that the available book content does not support a confident answer.
10. Pass only relevant, bounded context to the LLM.
11. Generate a validated response with citations referencing known chunks/pages.
12. Save the request, citations, model metadata, latency, token/usage estimates, and safety result according to the data-retention policy.

### 7.3 Retrieval design

- Use a multilingual embedding model that has been tested on Bengali and English.
- Explicitly test Romanized/Banglish queries against Bengali-script textbook chunks. Multilingual model marketing alone is not sufficient proof of Banglish performance.
- Use a query-expansion/normalization layer and hybrid retrieval; evaluate whether separate transliteration variants improve recall.
- Avoid one global retrieval pool across incompatible curriculums/editions unless the learner/admin explicitly chooses cross-curriculum search.
- Preserve book and page metadata throughout the pipeline.
- Consider reranking only when it improves measured quality enough to justify latency and cost.
- Start chunk-size tuning with a test set (for example, about 250–500 tokens with modest overlap), then adjust based on Bangla text, math exercises, page structure, and model context limits. This is an experiment, not a fixed universal rule.

### 7.4 Citation requirements

A citation must be constructed from stored metadata, not invented by the LLM.

Example response citation:

`Class 3 Mathematics — Chapter 3 — Page 28`

Each citation should contain stable internal IDs and display fields:

- `bookId`
- `bookTitle`
- `edition`
- `chapterId` / chapter title (if available)
- `pageStart` and optional `pageEnd`
- `chunkId`

If no reliable source is retrieved, return an empty source list and an explicit answer status such as `INSUFFICIENT_BOOK_CONTEXT`. Do not create fictional page numbers.

### 7.5 Answer policy

- Explain in simple, age-appropriate language.
- Prefer a short explanation first; expand when requested.
- Use familiar examples appropriate for children in Bangladesh when relevant.
- If the learner asks for a step-by-step solution, provide steps instead of only the final answer.
- When appropriate, finish with one small understanding-check question.
- Treat retrieved book content as reference data, not as trusted instructions. Ignore any instructions embedded inside uploaded documents that attempt to override system rules.
- Never shame, threaten, or humiliate the child.
- If the content is ambiguous, out of scope, unsafe, or not supported by retrieved pages, respond appropriately instead of guessing.

### 7.6 Evaluation dataset

Before launch, create a human-reviewed benchmark with Bangla, English, Banglish, mixed-language, spelling-variation, follow-up, and out-of-scope queries. Evaluate separately:

- retrieval recall / correct-page retrieval
- citation correctness
- answer factuality vs. the source book
- grade-appropriate language
- response language correctness
- refusal/clarification quality when source context is insufficient

Start with at least 50–100 diverse sample queries for the initial subject and expand as feedback arrives.

---

## 8. Provider-Independent AI Layer

### 8.1 Requirement

The backend must support OpenRouter initially and be able to switch to Anthropic Claude later through configuration and an adapter, without rewriting the tutor routes or frontend API contracts.

### 8.2 Adapter interfaces

Use internal application-level interfaces similar to the following. The exact implementation and error types should be refined during coding.

```ts
export type TutorMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type TutorGenerationOptions = {
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export interface LLMProvider {
  generateText(
    messages: TutorMessage[],
    options: TutorGenerationOptions
  ): Promise<LLMTextResult>;

  generateStructured<T>(
    messages: TutorMessage[],
    schema: unknown,
    options: TutorGenerationOptions
  ): Promise<T>;
}
```

`LLMTextResult` must standardize normalized text, provider/model name, available token usage, finish reason, request ID, and latency. Never expose vendor-specific response bodies directly to the frontend.

### 8.3 Adapters

- `OpenRouterAdapter` — first development/presentation provider; free-model availability and quotas can change.
- `AnthropicAdapter` — direct Claude API for later production use if selected.
- `GeminiAdapter` — optional later adapter.
- `MockLLMProvider` — deterministic test provider; avoids API charges in automated tests.

### 8.4 Capability registry

Providers/models do not necessarily support the same capabilities. Define a capability registry that can represent:

- text generation
- structured JSON output
- image/vision input
- streaming text
- audio input/output, if provided by the model/API
- tool/function calling

Before using a capability, check the configured model's declared/tested capability. If not supported, route to a dedicated media adapter or return a clear unsupported-capability response.

### 8.5 Configuration and secrets

- Provider/model IDs are configuration, not business-logic constants.
- API keys are server-side secrets only.
- Never send provider API keys to the browser/mobile app.
- Do not put keys in source control, logs, error reports, screenshots, or ordinary database text fields.
- The Admin Panel may select an allowlisted provider/model and configure safe options, but cannot reveal the secret key.
- Store non-secret active settings in the database only if runtime switching is required. Keep secret values in environment/secret management.
- Add bounded timeouts, limited retries, provider error classification, request IDs, circuit breaking/fallback rules where appropriate, and cost/usage limits.
- Do not silently fall back to a model that has not been approved/tested for the task.

### 8.6 Free-model limitations

OpenRouter free models can have availability, rate-limit, capability, or quality constraints. The application must handle `429`, timeout, unsupported capability, provider outage, invalid structured output, and empty responses. Provide a helpful error or a controlled fallback. Do not promise uninterrupted production service when relying on a free quota.

### 8.7 Embeddings must remain separate

Changing the LLM provider from OpenRouter to Claude should not by itself require re-embedding the books. Changing the embedding provider/model may require a new vector column/index or a full re-embedding job. Store the embedding model/version with each indexed collection and prevent vectors with incompatible dimensions/models from being mixed accidentally.

---

## 9. Standard Tutor Response Contract

All providers must be normalized to one application response schema. Validate responses with Zod before returning them.

Example conceptual schema:

```ts
export type TutorResponse = {
  answer: string;
  language: "bn" | "en" | "banglish";
  answerStatus: "ANSWERED" | "INSUFFICIENT_BOOK_CONTEXT" | "CLARIFICATION_NEEDED";
  sources: Array<{
    bookId: string;
    bookTitle: string;
    chapterId?: string;
    chapterTitle?: string;
    pageStart: number;
    pageEnd?: number;
    chunkId: string;
  }>;
  lesson?: LessonPlan;
  quiz?: QuizPreview;
  followUpQuestion?: string;
  requestId: string;
};
```

Use a validated discriminated union for slide types. Do not use arbitrary HTML, JavaScript, or executable code in model-generated lesson output.

Supported MVP slide types can include:

- `TITLE`
- `EXPLANATION`
- `IMAGE`
- `DIAGRAM`
- `EXAMPLE`
- `INTERACTIVE`
- `QUIZ`
- `SUMMARY`

The frontend owns the slide renderer and its allowed components/animations. The model returns structured content and references; it does not directly generate trusted frontend code.

---

## 10. Voice, Vision, and Learner Uploads

### 10.1 Voice flow

MVP flow:

1. Authenticated learner records audio after granting microphone permission.
2. Client uploads audio using an authorized endpoint or a short-lived signed upload URL.
3. Backend checks duration, content type, size, and request quota.
4. STT adapter transcribes the audio.
5. The transcript is passed to the same Tutor Orchestrator/RAG pipeline used by text chat.
6. Optionally, TTS adapter generates an audio answer.
7. Temporary audio is deleted after processing or after a short configured TTL.

Store a transcript only according to conversation settings and privacy/retention policy. Do not retain raw audio by default when it is not required.

### 10.2 Camera/image question flow

1. Authenticated learner uploads an image of a book page or exercise.
2. Validate the file and store it privately as a temporary user upload.
3. Run OCR and/or a vision-capable model through an adapter.
4. If recognized text is ambiguous, return the transcription for user confirmation or ask a clarification.
5. Use recognized question text and image context to query the approved book corpus.
6. Return explanation and citations where a matching source is found.
7. Apply the configured retention/deletion policy to the image.

Do not use face recognition or attempt to identify the child. Do not assume that a photo of a random exercise belongs to the official textbook; source matching must be verified.

### 10.3 Upload separation

Two independent upload domains are required:

- **Official book ingestion:** Admin-only, review/publish workflow, shared knowledge base.
- **Learner uploads:** Private, tied to the authenticated guardian/child session, temporary by default, never automatically indexed as official content.

Use separate storage prefixes/buckets and authorization rules.

### 10.4 Limits and abuse controls

Configure maximum file size, maximum audio duration, image count, page count, per-user uploads/day, and processing concurrency. Return an explicit `413` for oversized content and `415` for unsupported media type. Do not depend only on frontend validation.

---

## 11. API Design

Base path: `/api/v1`

All request bodies, query parameters, path parameters, and external AI outputs must be validated. Use a consistent error envelope and request ID. Use pagination on list endpoints.

### 11.1 Standard error format

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Please try again shortly.",
    "requestId": "req_example"
  }
}
```

Do not return stack traces, SQL errors, provider secrets, filesystem paths, or raw vendor error payloads to clients.

### 11.2 Authentication and guest sessions

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/guest/session` | Public, rate-limited | Create a temporary guest session |
| `GET` | `/me` | Authenticated | Current user, role, allowed features |
| `POST` | `/me/child-profiles` | Guardian | Create a child profile |
| `GET` | `/me/child-profiles` | Guardian | List owned child profiles |
| `PATCH` | `/me/child-profiles/:id` | Guardian/owner | Update permitted profile fields |
| `DELETE` | `/me/child-profiles/:id` | Guardian/owner | Request deletion and cascade/retention handling |

Firebase handles client sign-in/signup. Backend protected APIs verify Firebase ID tokens. Any account linking or custom session endpoint must be added only if a documented requirement exists.

### 11.3 Tutoring and conversation

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/tutor/chat` | Guest or authenticated, with different limits | Ask a text question and receive a RAG answer |
| `POST` | `/tutor/lesson` | Authenticated | Generate a validated lesson/slide plan |
| `POST` | `/tutor/quiz` | Authenticated | Generate a quiz for a topic/lesson |
| `POST` | `/tutor/quiz/:id/attempts` | Authenticated | Submit answers and receive feedback |
| `GET` | `/conversations` | Authenticated | List the current user's conversations |
| `GET` | `/conversations/:id` | Owner only | Get messages and stored citations |
| `PATCH` | `/conversations/:id` | Owner only | Rename/archive a conversation where supported |
| `DELETE` | `/conversations/:id` | Owner only | Delete conversation under retention policy |
| `POST` | `/feedback` | Guest/authenticated as policy allows | Rate/report a tutor answer |

Example chat request:

```json
{
  "conversationId": null,
  "childProfileId": "optional-owned-profile-id",
  "message": "vognangsho ki? easy kore bujhao",
  "languagePreference": "auto",
  "subjectId": "optional-subject-id",
  "bookId": "optional-book-id",
  "mode": "TUTOR"
}
```

Example chat response (illustrative only; actual citations must come from retrieval results):

```json
{
  "conversationId": "conv_example",
  "messageId": "msg_example",
  "answer": "ভগ্নাংশ দিয়ে কোনো কিছুর সমান ভাগের অংশ বোঝানো হয়...",
  "language": "bn",
  "answerStatus": "ANSWERED",
  "sources": [],
  "followUpQuestion": "একটি রুটি ৪ ভাগ করলে ১ ভাগকে কীভাবে লিখবে?",
  "requestId": "req_example"
}
```

### 11.4 Books and content discovery

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/books` | Public/guest, published books only | Browse books with filters |
| `GET` | `/books/:id` | Public/guest, published only | Book detail |
| `GET` | `/books/:id/chapters` | Public/guest, published only | Chapter list |
| `GET` | `/books/:id/chapters/:chapterId` | Public/guest, published only | Chapter metadata and permitted content preview |
| `GET` | `/subjects` | Public/guest | Available subjects |
| `GET` | `/curricula` | Public/guest | Available curricula |

Do not expose original copyrighted PDFs publicly unless the platform has permission to do so. Access to a book record/reference does not automatically grant permission to download the source file.

### 11.5 Learner media

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/media/image-question` | Authenticated | Analyze an uploaded book/exercise image and tutor the learner |
| `POST` | `/voice/transcribe` | Authenticated | Convert uploaded audio into text |
| `POST` | `/voice/speak` | Authenticated | Generate speech for validated response text |
| `POST` | `/uploads/presign` | Authenticated | Optional short-lived signed upload URL |
| `GET` | `/uploads/:id/status` | Owner only | Check processing status |
| `DELETE` | `/uploads/:id` | Owner only | Delete temporary upload where allowed |

If a request needs multiple long-running media operations, use a job ID and polling/status endpoint instead of holding an HTTP request open indefinitely.

### 11.6 Admin book management

All routes under `/admin` require server-side `SUPER_ADMIN` or explicit permission checks.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/admin/books` | List all books and processing/publication states |
| `POST` | `/admin/books` | Create book metadata and register an upload |
| `POST` | `/admin/books/:id/upload-url` | Create a signed upload destination, if direct upload is used |
| `POST` | `/admin/books/:id/process` | Queue ingestion processing |
| `GET` | `/admin/books/:id` | Get metadata, status, and warnings |
| `GET` | `/admin/books/:id/preview` | Preview extracted pages/chunks |
| `PATCH` | `/admin/books/:id` | Update metadata |
| `POST` | `/admin/books/:id/publish` | Publish after validation/review |
| `POST` | `/admin/books/:id/unpublish` | Remove from student retrieval immediately |
| `POST` | `/admin/books/:id/reindex` | Reprocess/re-embed safely |
| `POST` | `/admin/books/:id/archive` | Archive a book/edition |
| `DELETE` | `/admin/books/:id` | Controlled deletion; requires reference and dependency checks |
| `GET` | `/admin/ingestion-jobs` | List ingestion jobs |
| `GET` | `/admin/ingestion-jobs/:jobId` | Job detail/progress/error |
| `POST` | `/admin/ingestion-jobs/:jobId/retry` | Retry a failed idempotent job |

### 11.7 Admin AI configuration and monitoring

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/admin/ai-config` | Read active non-secret provider/model settings and capabilities |
| `PATCH` | `/admin/ai-config` | Select an allowlisted provider/model and safe generation limits |
| `GET` | `/admin/usage` | Usage, latency, error counts, and cost estimates |
| `GET` | `/admin/feedback` | Review feedback/reported answers under appropriate permissions |
| `GET` | `/admin/audit-logs` | Review admin actions |
| `GET` | `/admin/health` | Internal operational health; protect from public access where needed |

Do not offer an API that returns secret keys. Do not allow arbitrary provider URLs or unapproved models from the public request body.

### 11.8 Learning progress

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/progress` | Authenticated guardian/authorized profile owner | View summaries for owned profiles |
| `GET` | `/progress/topics/:topicId` | Authorized profile owner | Topic-level practice history |
| `POST` | `/learning-sessions` | Authenticated | Start a lesson session |
| `PATCH` | `/learning-sessions/:id` | Session owner | Save completion status and permitted progress data |

Only expose a child's progress to the authorized guardian or explicitly authorized teacher role. Apply object-level authorization on every resource ID.

---

## 12. Database Entities

Exact field names and normalization can be finalized during implementation, but the following domain entities are required.

| Entity | Purpose / key fields |
|---|---|
| `users` | `id`, `firebaseUid` (unique), email if available, role/status, timestamps |
| `child_profiles` | guardian owner, nickname, grade, curriculum, language preference |
| `curricula` | name, track, locale, active status |
| `subjects` | curriculum-aware subject list |
| `books` | metadata, edition, rights/source notes, storage key, states, review audit fields |
| `chapters` | book ID, chapter number/title, ordering, page ranges |
| `book_pages` | book ID, source page number/label, extracted text and extraction quality status |
| `document_chunks` | book/chapter/page metadata, content, content hash, embedding model/version, vector, search fields |
| `ingestion_jobs` | file/book IDs, state, progress, attempts, safe error code, timestamps |
| `uploads` | owner, storage key, media kind, status, expiration/deletion fields |
| `conversations` | owner/guest session, child profile where applicable, title/status, timestamps/TTL |
| `messages` | conversation, role, message text, normalized language, response status, provider/model metadata, token usage estimates |
| `message_sources` | message ID, chunk ID, book/page metadata snapshot where needed |
| `lessons` | topic, title, structured content JSON, sources, state, generated-by model metadata |
| `lesson_slides` | ordered validated slide type and JSON data (or an equivalent normalized design) |
| `quizzes` | topic/lesson, question schema, answer key stored server-side, status |
| `quiz_attempts` | owner/profile, answers, score, feedback, timestamps |
| `learning_sessions` | profile, lesson/topic, completion state and timestamps |
| `learning_progress` | permitted topic-level aggregate/summary data |
| `feedback` | message/report type, rating, comments, moderation state |
| `provider_configs` | non-secret active provider/model settings, allowed capability settings, limits |
| `usage_logs` | provider/model, operation type, usage, latency, status, estimated cost |
| `safety_events` | minimal event type and action metadata; avoid unnecessary raw content retention |
| `audit_logs` | actor, action, target, timestamp, request ID, safe before/after summary |

### 12.1 Data integrity requirements

- Enforce foreign keys and useful indexes.
- Add a unique constraint to `users.firebaseUid`.
- Use ownership checks before returning conversations, uploads, child profiles, attempts, or progress.
- Add indexes for book publication state, curriculum/grade/subject filters, book/chapter/page mapping, conversation owner/date, and job status.
- Vector dimension and vector index settings must match the embedding model configuration.
- Keep the original book edition separate from its replacement; use version/status changes rather than overwriting content without a rollback path.
- Define cascade/retention rules explicitly before enabling hard delete.

---

## 13. Security, Child Safety, and Privacy

Security and privacy are launch requirements, not optional future improvements.

### 13.1 API security

- Use HTTPS in deployed environments.
- Configure strict CORS allowlists for the web client; never use `*` with credentialed requests.
- Validate all input with Zod and enforce request body limits.
- Apply rate limits per IP, account, guest session, endpoint, and costly operation where practical.
- Apply object-level authorization to every user-owned resource ID.
- Use secure headers, safe cookie settings where cookies are used, and appropriate CSRF protection for cookie-based authentication.
- Store API keys and service credentials in deployment secrets.
- Redact `Authorization`, cookies, API keys, signed URLs, and other secrets from logs.
- Add timeouts and bounded retry policies to all external calls.
- Use parameterized SQL; carefully review any raw SQL used for vector search.
- Keep dependencies patched and run dependency/audit checks before release.
- Separate development, staging, and production credentials/databases.

### 13.2 File security

- Verify file signature/content and use an allowlist of formats.
- Generate server-side object names; do not trust user-provided paths.
- Store source books privately by default.
- Use short-lived signed URLs and validate ownership/permissions before issuing them.
- Enforce file/page/audio limits on the backend.
- Treat OCR and extracted text as untrusted content.
- Prevent prompt injection from book content: retrieved documents are data, not instructions.
- Delete failed/expired temporary uploads according to a scheduled cleanup policy.

### 13.3 Child-safe tutoring

- Use an age-appropriate tutoring system prompt and safety policies.
- Do not encourage a child to reveal full name, address, password, school ID, phone number, or other unnecessary personal data.
- Avoid frightening, insulting, sexual, violent, or otherwise inappropriate content.
- If a request is outside the tutor's educational role or unsafe, respond briefly and safely.
- Do not claim to be a human teacher or imply that the AI is always correct.
- Give the learner a way to report an unhelpful or inappropriate answer.
- Use parental/guardian-controlled account and privacy settings where appropriate.
- No targeted advertising in the MVP.

### 13.4 Privacy and legal review

Before a public launch, verify current Bangladesh legal requirements that apply to children's data, personal data, consent, retention, cross-border processing, and third-party AI services. This document is an engineering specification, not legal advice.

Create a published privacy notice explaining:

- what data is collected and why;
- whether prompts, images, audio, transcripts, and history are stored;
- which third-party services receive data;
- retention and deletion schedules;
- how a guardian can access or request deletion of account/profile data;
- whether content may be reviewed for safety/quality;
- what happens when a user switches model providers.

Default to not retaining raw audio and learner images longer than required for the feature. Do not send unnecessary account identifiers or unrelated conversation history to an external model provider.

### 13.5 Copyright and textbook permissions

Only ingest and serve books/content where the project has the right or permission to do so. Keep source information and rights notes in Admin Panel metadata. Do not assume an officially published textbook PDF is automatically licensed for arbitrary public redistribution. A source citation does not itself grant permission to expose the original PDF.

---

## 14. Reliability, Limits, and Error Handling

### 14.1 External provider errors

Normalize at least these cases:

- invalid/missing credentials;
- rate limit / quota exhausted;
- timeout;
- provider outage;
- unsupported model capability;
- invalid or incomplete structured output;
- empty response;
- content safety block;
- embedding/OCR/STT/TTS failure.

Return a stable application error code and a useful, child-friendly message where appropriate. Keep detailed diagnostics only in protected logs.

### 14.2 Retries and fallback

- Retry only transient errors and only a bounded number of times.
- Use exponential backoff with jitter for background jobs.
- Do not retry validation errors or blocked content indefinitely.
- A fallback provider/model must be explicitly configured, capability-checked, and evaluated.
- Do not imply that a fallback has succeeded until it actually returns a valid response.
- A failed live AI call should not prevent the website from showing a safe error and a prebuilt sample lesson where relevant.

### 14.3 Limits to configure

Values must be environment/admin configuration rather than scattered hard-coded constants:

- guest requests per minute/day;
- signed-in requests per minute/day;
- max input/output tokens;
- per-user and global daily usage budget;
- max file size and PDF page count;
- max image/audio duration/count;
- max concurrent ingestion jobs;
- request timeout;
- temporary file/conversation TTL;
- allowed upload MIME types;
- allowed AI provider/model IDs.

Initial limits must be calibrated through testing and adjusted based on the hosting/provider quotas.

---

## 15. Observability and Cost Management

Capture structured logs and metrics with a request/correlation ID.

Recommended metrics:

- total requests and errors by route;
- P50/P95 latency;
- RAG retrieval latency and number of retrieved chunks;
- citations attached and insufficient-context rate;
- model/provider latency, failures, and usage when returned by provider;
- estimated cost by provider/model/feature;
- OCR/STT/TTS usage and failure rate;
- ingestion job duration, retries, and failed pages;
- guest vs. authenticated usage;
- feedback/report counts.

Do not log complete sensitive content by default. If temporary content sampling is needed for quality improvement, require explicit policy, tight access controls, redaction, and retention limits.

Build an Admin dashboard for provider/model selection, daily usage, errors, ingestion job status, and feedback trends. Do not display secrets.

---

## 16. Configuration and Environment Variables

Create `.env.example` with placeholder values only. Never commit a real `.env` file.

```dotenv
# Application
NODE_ENV=development
PORT=5000
API_BASE_PATH=/api/v1
WEB_ORIGINS=http://localhost:3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE

# Firebase Admin - use workload/application credentials in production where possible
FIREBASE_PROJECT_ID=your-firebase-project-id
# Do not commit a service-account JSON file or private key.

# Storage (use local adapter in local development if needed)
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://your-s3-compatible-endpoint
S3_REGION=auto
S3_BUCKET=your-private-bucket
S3_ACCESS_KEY_ID=replace-me
S3_SECRET_ACCESS_KEY=replace-me
S3_FORCE_PATH_STYLE=false

# Background jobs
REDIS_URL=redis://localhost:6379

# LLM provider - values must match implemented/allowlisted adapters
AI_PROVIDER=openrouter
AI_MODEL=replace-with-supported-model-id
AI_FALLBACK_PROVIDER=
AI_FALLBACK_MODEL=
OPENROUTER_API_KEY=replace-me
ANTHROPIC_API_KEY=replace-me
GEMINI_API_KEY=replace-me
AI_REQUEST_TIMEOUT_MS=30000
AI_MAX_OUTPUT_TOKENS=1200
AI_DAILY_BUDGET_USD=1

# Embeddings (separate from text-generation provider)
EMBEDDING_PROVIDER=replace-with-implemented-provider
EMBEDDING_MODEL=replace-with-supported-embedding-model
EMBEDDING_DIMENSION=replace-with-tested-dimension
EMBEDDING_API_KEY=replace-me

# OCR / speech adapters - enable only after implementation and provider verification
OCR_PROVIDER=replace-with-implemented-provider
OCR_API_KEY=replace-me
STT_PROVIDER=replace-with-implemented-provider
STT_API_KEY=replace-me
TTS_PROVIDER=replace-with-implemented-provider
TTS_API_KEY=replace-me

# Limits (illustrative defaults; tune after testing)
GUEST_CHAT_LIMIT_PER_DAY=10
AUTH_CHAT_LIMIT_PER_DAY=100
MAX_UPLOAD_SIZE_MB=10
MAX_BOOK_PDF_PAGES=600
TEMP_UPLOAD_TTL_HOURS=24
GUEST_SESSION_TTL_HOURS=24
```

Environment parsing must fail fast on missing required configuration, invalid values, or unsupported providers. Do not use `replace-me` values in a deployed environment.

### 16.1 Configuration rules

- Keep development/test/production keys separate.
- Use a paid provider only after an explicit deployment/configuration change.
- Make it possible to start the app with a `MockLLMProvider` for automated tests without calling a real API.
- `EMBEDDING_DIMENSION` must be validated against the embedding provider/model; it is not a random default.
- Do not store provider secrets in `provider_configs` or return them from Admin APIs.

---

## 17. Suggested Backend Project Structure

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts
│   │   ├── logger.ts
│   │   └── permissions.ts
│   ├── common/
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── validation/
│   │   └── utils/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── child-profiles/
│   │   ├── curricula/
│   │   ├── books/
│   │   ├── ingestion/
│   │   ├── retrieval/
│   │   ├── tutor/
│   │   ├── ai-providers/
│   │   ├── embeddings/
│   │   ├── media/
│   │   ├── voice/
│   │   ├── conversations/
│   │   ├── lessons/
│   │   ├── quizzes/
│   │   ├── progress/
│   │   ├── feedback/
│   │   ├── admin/
│   │   ├── usage/
│   │   └── audit-logs/
│   ├── jobs/
│   │   ├── queues.ts
│   │   └── workers/
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── rag-evaluation/
├── scripts/
│   ├── bootstrap-super-admin.ts
│   └── seed-development.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

This is a suggested structure, not a requirement to create empty modules immediately. Implement features incrementally and keep each module functional.

---

## 18. Testing Requirements

### 18.1 Unit tests

- Input validation and normalization of Bangla/Banglish queries.
- Permission checks and role rules.
- Citation construction from retrieved metadata.
- Tutor response schema validation.
- AI provider error normalization.
- Usage/rate-limit logic.
- File type/size validation.
- Book state transitions and publishing rules.

### 18.2 Integration tests

- Firebase token verification (mocked/emulator/test project as appropriate).
- Database queries and ownership protections.
- Book ingestion from a small test PDF.
- Extraction/OCR adapter mocked and at least one manually tested real sample.
- Chunk creation, embedding storage, and retrieval filters.
- OpenRouter/Claude adapter tests using mocks; a small opt-in smoke test can call the real provider.
- Guest TTL and temporary data cleanup.
- Upload ownership and private storage behavior.

### 18.3 End-to-end acceptance tests

1. A Super Admin uploads a permitted Class 3 PDF.
2. The backend extracts/indexes it and shows job status.
3. Admin previews pages and publishes the book.
4. A guest asks a text question and receives a rate-limited answer with a real page citation when context is available.
5. A signed-in guardian/learner asks in Bangla, English, and Banglish and retrieves the expected book section.
6. A user cannot access another user's conversation, upload, profile, quiz attempt, or progress by changing an ID.
7. An unsupported model capability returns a controlled response instead of crashing the API.
8. When the free model returns a rate limit or times out, the API returns a safe error/fallback according to configuration.
9. Admin switches the configured LLM provider/model without changing frontend API contracts.
10. Changing the embedding model triggers an explicit re-index/re-embedding process rather than mixing incompatible vectors.
11. Unpublishing a book removes it from student retrieval.
12. Temporary learner media expires/deletes under the configured retention policy.

### 18.4 Release gates

Do not launch publicly until:

- Auth and role checks pass;
- no public endpoint can promote a user to admin;
- uploaded files are private and validated;
- prompt-injection defenses and age-appropriate behavior are tested;
- critical environment secrets are not exposed;
- core RAG citation and retrieval tests pass;
- rate limits and cost caps are enabled;
- privacy notice and data-deletion path are ready;
- backups and recovery procedures are documented.

---

## 19. Implementation Roadmap

### Phase 1 — Backend foundation

- Initialize Express + TypeScript project.
- Validate environment configuration.
- Set up Prisma/PostgreSQL migrations.
- Add request IDs, structured logging, centralized errors, Zod validation, CORS, and security middleware.
- Add Firebase token verification and role middleware.
- Add `/health` readiness checks and an automated test setup.

**Exit condition:** The API starts reliably, connects to the database, and protected/public routes behave correctly.

### Phase 2 — Admin bootstrap and book catalogue

- Define `users`, roles, curricula, subjects, books, chapters, pages, and upload/job entities.
- Implement the Super Admin bootstrap script.
- Build admin book metadata/upload/status APIs.
- Add private object storage adapter.
- Implement book state transitions and audit logs.

**Exit condition:** Super Admin can upload/register a book and see its status, but it is not yet searchable until ingestion/publishing is complete.

### Phase 3 — Ingestion and multilingual RAG

- Implement PDF extraction, OCR adapter, page mapping, chunking, metadata, embeddings, hybrid retrieval, and citation construction.
- Add the ingestion worker/job queue.
- Create the initial Bangla/English/Banglish evaluation set.
- Add publish/unpublish and safe re-indexing.

**Exit condition:** Approved textbook questions retrieve the correct source pages consistently enough for the agreed test benchmark.

### Phase 4 — Provider-independent tutor

- Implement the LLM interface and OpenRouter adapter.
- Implement the tutor orchestrator and standard response schema.
- Add rate limits, usage logs, structured-output validation, insufficient-context behavior, and model capability checks.
- Add a mock provider for testing.
- Add the Anthropic adapter before production if Claude is a project requirement.

**Exit condition:** LLM provider can be changed through supported configuration without changing API response contracts or RAG business logic.

### Phase 5 — Conversations and learning content

- Add guest sessions and temporary TTL cleanup.
- Add saved conversations for authenticated accounts.
- Add structured lesson and quiz generation.
- Add learning sessions, feedback, and basic progress summary.

**Exit condition:** A learner can ask, learn from slides, complete a quiz, and receive supportive feedback.

### Phase 6 — Vision and voice

- Add learner image upload and OCR/vision question handling.
- Add STT/TTS adapters and capability checks.
- Add temporary media deletion and strict quotas.

**Exit condition:** Each implemented media feature has successful, unsupported, error, timeout, and limit-exceeded test cases.

### Phase 7 — Production hardening and launch

- Review authentication/authorization, privacy, file security, prompt injection, cost limits, rate limiting, monitoring, backups, and recovery.
- Run staging end-to-end tests and a controlled pilot with a teacher/guardian.
- Tune retrieval and model prompts from reviewed feedback.
- Deploy production secrets separately from development.

**Exit condition:** All release gates in Section 18.4 are satisfied.

---

## 20. Definition of Done

The backend MVP is considered complete only when all applicable items below are true:

- [ ] REST API is versioned and documented with OpenAPI or equivalent.
- [ ] Firebase-authenticated users and guest sessions are handled separately.
- [ ] Guest can use limited text chat only; protected capabilities require login.
- [ ] Super Admin is created via a secure server-side bootstrap script.
- [ ] Backend authorization is enforced on every admin and user-owned resource endpoint.
- [ ] Admin can upload, inspect processing status, review, publish, unpublish, re-index, replace, and archive books.
- [ ] Book parsing preserves trustworthy page/chapter references.
- [ ] Student retrieval only searches published and permitted content.
- [ ] Bangla, English, Banglish, mixed queries, common spelling variation, and follow-up questions are in the retrieval evaluation dataset.
- [ ] RAG citations are built from database retrieval metadata and never invented by the model.
- [ ] OpenRouter can be used for initial development/presentation.
- [ ] Claude can be added through an adapter without rewriting the tutor route or frontend API contract.
- [ ] Embedding configuration is separate from LLM provider configuration.
- [ ] Unsupported model capabilities and provider errors are handled safely.
- [ ] Lesson and quiz content uses validated JSON schemas and predefined frontend slide types.
- [ ] Learner image/audio uploads are private, validated, rate-limited, and separate from official books.
- [ ] Usage/cost, failures, latency, feedback, and admin actions are observable without leaking secrets.
- [ ] Data retention/deletion rules and a privacy notice exist before public launch.
- [ ] Unit, integration, RAG evaluation, and end-to-end tests pass for the MVP scope.
- [ ] `.env.example` exists; real credentials are excluded from source control.
- [ ] Backup, migration, deployment, and basic recovery procedures are documented.

---

## 21. Final Engineering Decisions

1. **Admin-managed books:** New books are managed through Admin APIs/UI and processed automatically by backend jobs. Do not hard-code the book collection in source files.
2. **MVP architecture:** Modular monolith + background worker; avoid premature microservices.
3. **Primary data layer:** PostgreSQL + Prisma, with reviewed pgvector/full-text search support.
4. **Initial AI provider:** OpenRouter adapter for development/presentation, subject to free-model quota/capability limits.
5. **Production provider:** Add/use Anthropic Claude through a separate adapter if chosen. Do not confuse a Claude chat subscription with API billing; production API access and usage are managed separately.
6. **Provider independence:** LLM switching must not change frontend contracts. Embeddings, OCR, STT, TTS, and vision are separate capability adapters.
7. **Banglish:** Use language/script detection, conservative normalization, multilingual embeddings, query variants, and hybrid retrieval. Validate with actual learner-style examples rather than assuming transliteration alone solves it.
8. **Child profiles:** Prefer guardian-owned profiles and minimum data collection.
9. **Visual teaching:** AI outputs validated lesson JSON; the frontend renders approved slide types and animations. Do not execute model-generated HTML/JavaScript.
10. **Safe publication:** A book is visible to the RAG system only after ingestion checks and an authorized publish action.
11. **Production readiness:** Privacy, cost controls, quotas, citations, authorization, and recovery are release requirements.

---

## 22. Notes for the Coding Agent / Developer

When implementing from this document:

- Build one phase at a time and keep the application runnable after each phase.
- Before adding new dependencies, check whether the feature can be implemented with the current stack.
- Use strict TypeScript, modular services, and Zod schemas.
- Keep business rules in services, not inside route handlers.
- Do not fabricate successful results when a provider, upload, or ingestion job fails.
- Do not hard-code production secrets, provider model IDs, quotas, or book metadata into the frontend.
- Add migrations and tests with each database feature.
- For every new endpoint, define access policy, request validation, response contract, failure cases, and tests.
- Keep this document updated if a technology, endpoint contract, or security rule changes.
- If a requirement cannot be implemented as written, document the limitation and propose the smallest safe alternative before silently changing the architecture.

**The immediate first milestone is not the complete tutor. It is a secure backend foundation plus a Super Admin who can upload a sample textbook, see its processing status, and publish it for a tested RAG chat endpoint.**
