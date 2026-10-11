# Class 3 AI Tutor — Frontend PRD & Technical Requirements

> **Document type:** Product Requirements Document (PRD) + Frontend Technical Specification  
> **Version:** 1.0  
> **Status:** Initial implementation baseline  
> **Primary market:** Bangladesh  
> **Initial audience:** Class 3 learners and their parents/guardians  
> **Initial platform:** Responsive web application  
> **Future platform:** Android/iOS app using the existing backend API  
> **Backend contract:** Express REST API under `/api/v1` as defined in `backend_readme.md`

---

## 1. Product Overview

Build a friendly, colourful, safe, and accessible AI learning website for Class 3 students in Bangladesh. The product must feel like an interactive tutor rather than a generic chatbot. Students should be able to ask questions from approved textbooks, receive simple explanations, see relevant book/page references, and learn through predefined visual slides, illustrations, diagrams, animations, and quizzes.

The first deliverable is a responsive website. Keep the UI and API integration modular so a future Expo/React Native application can consume the same backend APIs. The mobile app will require a separate mobile UI, but it must not require a separate RAG engine, AI provider integration, book ingestion pipeline, or authentication backend.

### 1.1 Core learning loop

1. A learner selects a subject/book or enters a question.
2. The learner asks using Bangla, English, Banglish/Romanized Bangla, or a supported mixed style.
3. The frontend sends the question and relevant preferences to the backend.
4. The backend retrieves relevant published textbook content and returns a validated tutor response.
5. The frontend renders the answer, book references, optional lesson slides, diagrams, quiz, and follow-up question.
6. The learner answers a question or requests another explanation.
7. The tutor helps the learner try again in a supportive way.

### 1.2 Frontend principles

- **Child-friendly, not childish:** Use welcoming illustrations, rounded components, friendly microcopy, clear hierarchy, and bright accents without making every screen visually noisy.
- **Learning first:** Chat, visual explanations, and practice should be easy to discover and use.
- **Book-grounded:** Clearly display source references returned by the API. Never fabricate book names, chapters, or page numbers in the client.
- **Multilingual:** Support Bangla script, English, Banglish, and mixed-language input without forcing users to change their keyboard or transliterate manually.
- **Guest-friendly:** Allow limited text chat without sign-in. Authentication is required for saved history, camera/image uploads, voice features, and personalized progress in the MVP.
- **Provider-neutral:** UI code must not depend on whether responses come from OpenRouter, Claude, Gemini, or another provider.
- **Responsive and lightweight:** Optimise for common Android phones, smaller screens, slower networks, and lower-end devices.
- **Privacy-first:** Do not request camera/microphone permission until the user starts the relevant feature. Explain what data is submitted and how it is used.

---

## 2. Goals and Non-Goals

### 2.1 MVP goals

1. Create a polished marketing/home page and a usable student tutor interface.
2. Provide a welcome/login card with `Continue with Google`, email sign-in/sign-up, and `Continue as Guest`.
3. Integrate Firebase Authentication for Google and email/password sign-in.
4. Support text chat in guest and authenticated modes with appropriate limits enforced by the backend.
5. Display answers, book citations, follow-up questions, and clear API error states.
6. Render safe, structured lesson slides using a fixed set of frontend components.
7. Browse published books, subjects, curricula, and chapter lists.
8. Add authenticated image question/camera upload, voice transcription, and text-to-speech UI when the matching backend capability is enabled.
9. Build an admin area for book ingestion, book metadata, processing status, preview, publication, provider settings, usage, and feedback review, based on backend permissions and implemented endpoints.
10. Support Bangla, English, and Banglish input with a preferred answer-language setting.
11. Provide parent/guardian account and child profile flows according to backend support.
12. Implement responsive, accessible, testable UI states for loading, empty results, errors, disabled capabilities, and rate limits.

### 2.2 Later features

- A separate Expo/React Native mobile client.
- Advanced real-time voice conversations.
- Offline lesson packs and installable PWA functionality.
- Teacher/classroom management.
- More grades, curricula, and book collections.
- More advanced learner analytics and personalised revision plans.
- Streaming token-by-token response UI, if supported by a documented backend endpoint.
- Advanced motion/interactive simulations, beyond the initial approved lesson renderer.

### 2.3 Out of scope for the first release

- Public social feeds or child-to-child messaging.
- Payments, subscriptions, advertisements, or public creator uploads.
- Direct editing of official book content by students.
- Unrestricted code/HTML execution from model-generated output.
- Showing private admin data to learners.
- Storing API provider secrets in the browser.

---

## 3. Recommended Frontend Technology Stack

| Area | Technology | Requirements |
|---|---|---|
| Framework | Next.js App Router + React | Use route layouts, loading/error boundaries, and server rendering where suitable. |
| Language | TypeScript, strict mode | Avoid `any` where practical; share validated API types in a dedicated module. |
| Styling | Tailwind CSS | Use design tokens and reusable variants rather than scattered one-off values. |
| UI primitives | shadcn/ui or an equivalent accessible component system | Adapt the components to the product’s child-friendly visual language. Do not ship a generic dashboard unchanged. |
| Icons | Lucide React | Consistent, recognisable icons with text labels for important actions. |
| Motion | Motion for React; Lottie or Rive for selected illustrations | Respect reduced-motion preferences and avoid unnecessary movement. |
| Auth | Firebase Authentication Web SDK | Google and email/password sign-in. The backend verifies ID tokens. |
| API data fetching | TanStack Query | Caching, retry policy, pagination, invalidation, and mutations. |
| Forms | React Hook Form + Zod | Validated sign-in, sign-up, profile, book metadata, and admin forms. |
| Local UI state | React state; Zustand only if justified | Keep server state in TanStack Query; avoid duplicating it into a global store. |
| File handling | Browser File APIs + backend-supported signed upload flow | Client-side checks improve UX but are not security controls. |
| Testing | Vitest/Jest, React Testing Library, Playwright | Unit, component, and end-to-end tests. |
| API typing | Shared TypeScript types generated from OpenAPI if available | Types must match backend schemas; do not invent response fields. |
| Deployment | Vercel or compatible Next.js host | Use environment-specific public API URL configuration. |

### 3.1 Important architecture rules

- Do not call OpenRouter, Anthropic, Gemini, embedding, OCR, STT, or TTS vendor APIs directly from browser code. The browser calls the application backend only, except for Firebase Authentication and a specifically authorised direct-to-object-storage upload URL.
- Keep all provider keys on the server. `NEXT_PUBLIC_*` values must never contain secrets.
- Do not render model-generated HTML, scripts, JSX, or executable code. Render only supported structured content using trusted frontend components.
- Do not rely on frontend route guards for security. Every protected operation must still be authorised by the backend.
- Keep the API client independent from individual pages so web and future mobile clients use consistent request/response contracts.
- Use the backend specification as the source of truth for routes and fields. When an endpoint is unavailable, show a disabled/coming-soon state rather than mocking a success in production.

---

## 4. Information Architecture and Routes

Use a clear separation between public pages, learner experiences, account pages, and admin pages.

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Homepage, product introduction, subject cards, learning-mode previews, and call-to-action. |
| `/welcome` | Public | Google/email sign-in and guest entry card. |
| `/login` | Public | Email sign-in and Google sign-in. |
| `/signup` | Public | Guardian account registration and email verification guidance. |
| `/auth/callback` or suitable Firebase auth handling route | Public/temporary | Complete any configured sign-in redirect flow. |
| `/tutor` | Guest/authenticated | Main AI chat/tutor workspace. |
| `/tutor/[conversationId]` | Authenticated for saved history; temporary guest session where applicable | Open a particular conversation. Never allow cross-user access. |
| `/books` | Public | Browse available published books and subjects. |
| `/books/[bookId]` | Public | Book information and chapter list, subject to publication/access policy. |
| `/books/[bookId]/chapters/[chapterId]` | Public | Permitted chapter metadata/content preview and learning entry points. |
| `/learn/[lessonId]` | Authenticated | Structured lesson/slide viewer, where supported by the backend. |
| `/practice` | Authenticated | Quiz and practice entry point. |
| `/progress` | Authenticated | Learning progress for the selected/owned child profile. |
| `/parent` | Guardian | Child profile selection, activity summaries, and permitted progress views. |
| `/settings` | Authenticated | Language preference, account, privacy controls, saved preferences, and sign-out. |
| `/admin` | Admin permissions required | Admin dashboard overview. |
| `/admin/books` | Admin permissions required | Search, filter, add, inspect, publish, unpublish, archive, and re-index books. |
| `/admin/books/new` | Admin permissions required | Create book metadata and begin upload. |
| `/admin/books/[bookId]` | Admin permissions required | Book metadata, processing jobs, extracted text preview, warnings, and actions. |
| `/admin/ingestion-jobs` | Admin permissions required | Processing jobs, statuses, retries, and error summaries. |
| `/admin/ai-settings` | Super Admin/explicit permission | View and change allowlisted provider/model settings without revealing secrets. |
| `/admin/usage` | Admin permissions required | Request volume, estimated costs, errors, latency, and configured limits. |
| `/admin/feedback` | Admin permissions required | Review answer ratings/reports and triage issues. |
| `/admin/audit-logs` | Super Admin/explicit permission | Review administrative activity. |
| `/403` | Any | Permission-denied page. |
| `/404` | Any | Friendly not-found page. |

Routes may be renamed during implementation, but API-facing features and permission rules must remain equivalent.

---

## 5. User Roles and Frontend Permissions

### 5.1 Guest

Can:

- Browse public homepage, subjects, and published book metadata.
- Open the tutor workspace and ask limited text questions.
- Start a temporary guest session from the backend.
- See a helpful prompt encouraging sign-in to save learning.

Cannot in MVP:

- Save permanent chat history.
- Use camera/image upload or voice features.
- Save lessons, quiz progress, or personal learning history.
- Access guardian or admin pages.

Guest quota and expiration are enforced by the backend. The UI should communicate limits without claiming that a request succeeded if the API rejects it.

### 5.2 Guardian / authenticated user

Can:

- Sign in with Google or email/password.
- Create/select child profiles if enabled by the backend.
- Use text chat, supported voice and image-question features.
- View their own saved conversations and permitted progress.
- Delete conversations/profile data through supported backend flows.
- Manage language and other supported preferences.

Can only access their own conversations, uploads, child profiles, and progress. The UI must not infer ownership from a URL ID.

### 5.3 Admin roles

The frontend may display role-based navigation for `SUPER_ADMIN`, `CONTENT_EDITOR`, and `SUPPORT`, but must follow the explicit permissions returned by `/api/v1/me` or the relevant backend contract.

- `SUPER_ADMIN`: administrative controls granted by the backend.
- `CONTENT_EDITOR`: book ingestion/content workflow only, if permissions are configured.
- `SUPPORT`: only explicitly allowed support/feedback features.

Do not show AI secret values in forms or responses. Provider settings must not provide a field for arbitrary URLs or unsupported models unless the backend explicitly allows them through a secure allowlist.

---

## 6. Design System and Visual Direction

### 6.1 Overall look and feel

Create an original, polished educational product identity. The experience should feel colourful and fun for children but remain readable and practical for guardians/admins.

- Use a light, warm neutral canvas with blue, teal, yellow, violet, and coral as controlled accent colours.
- Use dark, high-contrast body text.
- Use rounded cards and friendly illustrations; reserve bright filled colour for primary actions, selected states, and important status indicators.
- Use a small set of consistent border radii, shadows, spacing values, and typography sizes.
- Use a friendly mascot in welcome/empty states, not as decoration in every section.
- Keep the student-facing experience playful; keep the Admin Panel more restrained and information-dense.
- Use a responsive sidebar/drawer instead of compressing desktop navigation onto small screens.
- Avoid flashing, distracting backgrounds, excessive gradients, or continuous animation behind reading content.

### 6.2 Typography and multilingual text

- Choose a readable sans-serif font with complete Bengali glyph coverage. Verify Bangla vowel marks, conjuncts, punctuation, and English numerals render properly.
- Use appropriate line height for Bangla body text and long textbook explanations.
- Avoid fixed-width text containers that break on long words or mixed-script input.
- Test Bangla, English, Banglish, mathematical notation, numbered lists, and citations at phone and desktop widths.
- Never convert the user’s Banglish input automatically in the text box. Normalisation belongs to backend retrieval logic; the UI must preserve what the user typed.

### 6.3 Shared components

Build reusable components for:

- `AppShell`, `StudentSidebar`, `MobileNavigation`, `PageHeader`
- `PrimaryButton`, `SecondaryButton`, `IconButton`, `Tooltip`
- `SubjectCard`, `BookCard`, `ChapterList`, `SourceCitation`
- `ChatMessage`, `ChatComposer`, `TypingIndicator`, `ChatEmptyState`
- `LoginCard`, `AuthForm`, `GuestModeNotice`, `FeatureGateDialog`
- `LessonPlayer`, `LessonSlide`, `SlideProgress`, `QuizCard`, `AnswerFeedback`
- `ImageUploadDialog`, `CameraCapture`, `AudioRecorder`, `VoicePlayback`
- `FileDropzone`, `UploadProgress`, `ProcessingStatus`, `ConfirmDialog`
- `DataTable`, `Pagination`, `FilterBar`, `StatusBadge`, `EmptyState`, `ErrorState`
- `Toast` or accessible inline status messaging

Use consistent, documented variants instead of duplicating button/card styles in every page.

---

## 7. Homepage Requirements (`/`)

The homepage should make the product's value clear to a parent and inviting to a child.

### 7.1 Sections

1. **Header:** Logo/product name, Books, How It Works, Language selector, Sign in, and Start Learning CTA. Mobile menu should be keyboard accessible.
2. **Hero:** Friendly headline such as “Learn from your books, one fun step at a time,” short Bangla/English supporting copy, an illustrated tutor/learning preview, and clear `Start Learning` action.
3. **Learning options:** Subject/book cards populated from public API data where available. Do not hard-code a book as available unless returned from the backend.
4. **How it works:** Ask a question, understand the explanation, practice with a quiz.
5. **Learning modes:** Text tutor, visual lessons, voice, and camera question. If a capability is not active in the current deployment, label it as preview/coming soon or disable it honestly.
6. **Trust and safety:** Explain that the tutor is designed for learning, uses approved published material when available, and may make mistakes that should be checked.
7. **Footer:** About, privacy, contact/support route if implemented, and terms/policy links when available.

### 7.2 Homepage behavior

- Use server-rendered/static-friendly content where it benefits performance; fetch live subject/book catalogue using the documented API.
- Provide skeletons and a retryable error state if the catalogue cannot load.
- Main CTA opens `/welcome` or `/tutor` according to the agreed entry flow.
- Do not require account creation merely to browse the homepage.
- Do not display unsupported claims such as guaranteed correct answers or official endorsement unless formally verified.

---

## 8. Welcome, Authentication, and Guest Flow

### 8.1 Welcome card

Show a clear, child-friendly welcome screen with:

- Product logo/mascot and short value statement.
- `Continue with Google` button.
- Email sign-in and email sign-up links.
- `Continue as Guest` button.
- A short, readable explanation of guest limitations.
- Links to privacy/terms pages if those pages exist.

The login card should be visually simple and not trap a child in a complex registration flow.

### 8.2 Firebase authentication

- Use Firebase Authentication for Google and email/password sign-in.
- Use Firebase-supported verification and password reset flows.
- Send the current Firebase ID token as `Authorization: Bearer <token>` on protected API requests.
- Refresh the token using the Firebase SDK when appropriate; do not persist raw API secrets in the browser.
- Obtain the application user and permissions from `GET /api/v1/me` after login.
- If Firebase sign-in succeeds but the application profile endpoint fails, show a retryable state and do not assume the user has an admin role.
- Sign-out must clear client-side query caches and user-specific state so one user cannot see the previous user's data on a shared device.

### 8.3 Email sign-up

Because many Class 3 learners may not have their own email address, guide registration toward a parent/guardian account. The child profile, if enabled, is created under that account. Do not require a child's full legal name for an MVP profile.

### 8.4 Guest session flow

1. User selects `Continue as Guest`.
2. Frontend calls `POST /api/v1/guest/session`.
3. Store the returned short-lived session credential according to the backend contract; do not treat a random client-generated ID as a trusted session.
4. Attach guest credentials using the documented request header/cookie mechanism.
5. Enable text chat only.
6. When guest limit is reached, explain the limit and show a sign-in option.
7. When the session expires, offer to start a new guest session.

Guest sessions must not persist across browsers/devices unless explicitly supported by the backend contract.

### 8.5 Feature-gating dialog

When a guest taps voice, camera, saved history, or a personalized feature, open a small explanatory sign-in dialog. Do not upload a file or request a camera/microphone permission before authentication and an explicit user action.

---

## 9. Student Tutor Workspace (`/tutor`)

This is the core product surface and must receive the most design and testing attention.

### 9.1 Desktop layout

- Left sidebar: product/home navigation, New Chat, Recent Conversations, Books/Subjects, Saved Lessons where implemented, and profile/menu.
- Main panel: selected subject/book context, messages, source references, lesson/quiz cards, and composer.
- Header controls: language preference, selected child profile if available, and relevant settings.
- Composer fixed to the bottom of the conversation panel without hiding the latest message.

### 9.2 Mobile layout

- Sidebar becomes a drawer.
- Composer remains reachable above the mobile safe area and virtual keyboard.
- Microphone/camera/upload controls are touch-friendly and do not crowd the send button.
- Use a single-column layout; citations and slide controls must not cause horizontal scrolling.
- Keep the input accessible when the browser keyboard opens.

### 9.3 Empty state

Provide example prompt chips such as:

- `ভগ্নাংশ কী? সহজ করে বোঝাও`
- `Explain a plant's life cycle`
- `vognangsho ki? example dao`
- `আমাকে ৫টা গণিতের practice question দাও`

Example prompts should be configurable/content-safe. Selecting a prompt fills or sends it according to a consistent interaction pattern. Do not present these suggestions as if an answer has already been generated.

### 9.4 Message rendering

Each assistant message can contain:

- Text answer and supported basic formatting.
- Book/source references returned by the backend.
- A visible answer status for insufficient context or clarification requests.
- Optional follow-up question.
- Optional `Show as lesson`, `Give another example`, or `Practice this` actions if the corresponding supported endpoint is implemented.
- Feedback controls, for example Helpful / Not helpful, when the feedback endpoint is active.

Each user message should preserve the exact typed language and script. Do not silently rewrite Banglish into Bengali before showing it in the conversation.

### 9.5 Source citations

Render citations as a small expandable area such as `Source: Class 3 Mathematics · Chapter 3 · p. 28`. Use only backend response values. If a source has a page range, show it accurately. Do not link to or download a copyrighted PDF unless the backend exposes a permitted route and the platform has the required rights.

### 9.6 Chat composer

Required behavior:

- Multiline text input with Enter-to-send and Shift+Enter for a line break on desktop; on mobile, use the platform's sensible send behavior.
- Send button disabled for blank input or while a conflicting request is in progress.
- User can stop/cancel an in-flight request only if the client and backend support cancellation; otherwise do not display a non-functional Stop button.
- Upload/camera/microphone controls are enabled only when the feature is available and user is authenticated.
- Show clear network, rate-limit, empty-response, unavailable-model, and insufficient-context states.
- Prevent accidental duplicate sends on repeated taps.
- Respect maximum message size and display remaining/allowed characters if a limit is defined.

### 9.7 Chat request

Use the backend contract, conceptually:

```ts
export type TutorChatRequest = {
  conversationId: string | null;
  childProfileId?: string;
  message: string;
  languagePreference: "auto" | "bn" | "en" | "banglish";
  subjectId?: string;
  bookId?: string;
  mode: "TUTOR";
};
```

Do not send client-supplied role, billing status, usage allowance, or admin claims. Those are authoritative only on the server.

### 9.8 Tutor response rendering

The UI should be typed against the backend's normalized response contract, conceptually:

```ts
export type TutorResponse = {
  answer: string;
  language: "bn" | "en" | "banglish";
  answerStatus:
    | "ANSWERED"
    | "INSUFFICIENT_BOOK_CONTEXT"
    | "CLARIFICATION_NEEDED";
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

Treat this as a shared API type/example. Use the exact backend schema and validate unknown responses at the network boundary. Never assume optional `lesson`, `quiz`, or `sources` fields are present.

### 9.9 Chat history

- Fetch saved conversations only for authenticated users.
- Support loading skeletons, empty history, pagination if provided by the API, and retry.
- A conversation URL must be checked against the current user by the backend.
- Deleting a conversation requires a confirmation dialog and must update the query cache after a successful response.
- If a guest conversation cannot be persisted, keep it temporary and communicate this clearly.

---

## 10. Bangla, English, and Banglish UI Requirements

### 10.1 Input policy

Accept:

- Bengali script: `ভগ্নাংশ কী?`
- English: `What is a fraction?`
- Banglish/Romanized Bangla: `vognangsho ki?`
- Mixed language: `ei math ta easy kore explain koro`

The composer must not require a language dropdown before typing. `Auto` should be the default input-language behavior unless a user preference says otherwise.

### 10.2 Answer preference

Provide an optional answer-language setting:

- `Auto` — answer in the detected/requested language according to backend policy.
- `বাংলা`
- `English`
- `Banglish`

The actual answer language is returned by the backend and should be displayed consistently. Do not claim the backend detected a language unless the response contract exposes it.

### 10.3 Text rendering

- Use font stacks that reliably display Bangla glyphs and English characters.
- Preserve punctuation, numbered steps, fractions, multiplication/division symbols, and formulas.
- Test long Banglish words and mixed-script sentences for wrapping/overflow.
- Use appropriate line-height and spacing for Bengali text.
- Do not transliterate all content at the frontend. Search normalization and query expansion belong to the backend RAG pipeline.

### 10.4 Error and fallback copy

Errors should be short and friendly, for example:

- “সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করো।”
- “এই মুহূর্তে Tutor ব্যস্ত। একটু পরে আবার চেষ্টা করো।”
- “বইয়ের পাওয়া অংশ থেকে নিশ্চিত উত্তর দিতে পারছি না। অন্যভাবে প্রশ্ন করবে?”

Avoid technical provider names, raw error bodies, and alarming messages in child-facing UI. Admins may see a safe diagnostic code and request ID, but never secret keys or raw stack traces.

---

## 11. Book Catalogue and Chapter Browsing

### 11.1 `/books`

- Fetch `GET /api/v1/curricula`, `GET /api/v1/subjects`, and `GET /api/v1/books` as available.
- Provide filters for curriculum, class/grade, subject, language, and edition only where the backend supports them.
- Show title, subject, grade, language, and edition information returned by the API.
- Include loading skeletons, empty state, retry, and pagination where the API supports pagination.
- Do not imply that the platform contains every Class 3 book unless the catalogue confirms it.

### 11.2 Book detail

- Fetch `GET /api/v1/books/:id` and `GET /api/v1/books/:id/chapters`.
- Show chapter list and permitted metadata/content preview.
- Add `Ask this book` or `Start learning` actions that pass the book context through supported tutor/lesson request fields.
- Do not expose original PDFs or private storage URLs unless the backend specifically grants permitted access.
- If a book is unpublished or removed, show a clear unavailable state and do not keep using stale cached content as though it were current.

### 11.3 Search

If catalogue search is supported, debounce typed search, keep the URL query state shareable where appropriate, and provide a clear button. Book catalogue search is separate from the AI tutor's RAG retrieval; do not confuse a list search with question answering.

---

## 12. Lesson and Slide Renderer

The AI may return validated structured lesson content. The frontend owns the renderer and decides exactly which UI components can be produced.

### 12.1 Supported slide types for MVP

Implement a discriminated union and renderer registry for these types:

- `TITLE`
- `EXPLANATION`
- `IMAGE`
- `DIAGRAM`
- `EXAMPLE`
- `INTERACTIVE`
- `QUIZ`
- `SUMMARY`

The field names must match the backend lesson schema once finalized. If an unknown slide type is returned, skip it safely or show a controlled unsupported-slide message; do not render raw HTML/code.

### 12.2 Lesson player UX

- One slide at a time for mobile; responsive side-by-side or wider canvas on desktop when useful.
- Show current slide and total slide count.
- Provide Previous, Next, Replay animation, and Exit/Back controls where applicable.
- Keep text short, readable, and appropriate for Class 3.
- Support reduced-motion settings.
- Use a fallback illustration/placeholder if an optional image asset fails.
- Avoid autoplaying audio. User must choose to play it.
- Save progress only through a supported learning-session endpoint and only for authenticated users.
- On refresh, restore progress only if the backend supports it.

### 12.3 Safe diagram and animation components

Use trusted components for diagrams such as fraction bars, countable objects, labelled parts of a plant, timelines, or simple shapes. Validate any data received from the API before passing it to SVG/canvas/animation components. Never use model-returned SVG markup, script, arbitrary URLs, or CSS as trusted executable content.

### 12.4 Animation direction

- Use a small library of prebuilt Lottie/Rive assets and CSS/Motion transitions.
- Render animation only when relevant to the current lesson.
- Respect `prefers-reduced-motion`.
- Pause background animations when hidden/off-screen where possible.
- Do not make lessons dependent on generated video in the MVP.

---

## 13. Quiz and Practice Experience

### 13.1 Quiz UI

- Present one question at a time or a short paginated set, according to the backend quiz schema.
- Support only the question types actually returned by the backend, such as single-choice and short-answer. Add more types only after their schemas and scoring behavior are defined.
- Keep the correct answer hidden until submission/reveal policy allows it.
- Prevent duplicate submissions while a request is in progress.
- Display supportive feedback for both correct and incorrect responses.
- Avoid red/green as the only correctness indicator; use text and icons as well.

### 13.2 Submission flow

1. Learner selects/types an answer.
2. Frontend submits it to `POST /api/v1/tutor/quiz/:id/attempts` with the exact backend-defined payload.
3. Show server-returned score/feedback and next action.
4. Update progress caches only after the backend confirms success.

Do not trust a frontend-calculated score as the authoritative result. The backend should own correct answers and scoring.

### 13.3 Empty/error states

Provide a friendly state when no quizzes exist, the API cannot generate a quiz, or the current provider does not support the requested output. A sample static quiz can be used for design development, but it must be clearly marked as demo data and never silently presented as a successful live result.

---

## 14. Camera, Image Upload, and File Upload UX

### 14.1 Authentication gate

Camera/image-question features require an authenticated user in the MVP. If a guest selects them, show the sign-in gate before requesting camera permission or reading/uploading a file.

### 14.2 Image question flow

1. User chooses `Take a photo` or `Upload an image`.
2. Explain that the image will be sent for processing to help answer the question.
3. Ask for camera permission only after explicit user action.
4. Show image preview, retake/remove options, and upload status.
5. Send the image through the backend-supported upload endpoint or signed URL flow.
6. Display recognized text/clarification prompt if the API returns one.
7. Show the tutoring response and valid citations when processing finishes.
8. Provide delete/remove controls where supported; do not imply deletion from the server unless the API confirms it.

### 14.3 File selection and validation

- Accept only file types supported by backend configuration.
- Show maximum size/type before upload if those values are available from config or documented limits.
- Validate file extension and MIME type for UX; the backend is the security authority.
- Show upload progress if the upload mechanism provides it.
- Handle offline, interrupted, unsupported type, `413`, `415`, rate-limit, and processing failure states.
- Never add learner uploads to the shared official book index.
- Avoid showing permanent public image URLs. Use short-lived, owner-authorised URLs where applicable.

### 14.4 Camera privacy

- Never request continuous camera access.
- Do not use face recognition or attempt to identify the child.
- Do not store image previews in long-lived browser storage.
- Clear local object URLs and temporary preview data when the dialog closes/unmounts.

---

## 15. Voice Input and Spoken Answers

Voice support depends on backend capabilities and provider availability. The UI must show the actual state and never pretend speech processing worked when it did not.

### 15.1 MVP voice interaction

- Authenticated learner taps `Record`.
- Request microphone permission at that moment.
- Show recording indicator and elapsed time; offer Stop/Cancel.
- Upload audio using a supported endpoint or signed URL.
- Display the returned transcript before sending it to the tutor, or provide an explicit review/confirm stage if the backend returns uncertain transcription.
- Send the confirmed text through the same tutor flow.
- Provide a `Listen` action only when TTS audio is available and supported.

### 15.2 Requirements

- Press-to-talk first; do not build always-listening behavior in the MVP.
- Always include a text alternative.
- Allow the learner to cancel recording and discard audio.
- Do not autoplay spoken answers.
- Use accessible labels and visible recording status; do not rely on colour alone.
- Handle unsupported browser, permission denied, no microphone, timeout, oversized recording, and provider-unavailable states.
- Raw audio should not be stored by the frontend. Server retention follows backend policy.
- Test Bangla, English, and mixed Bangla-English speech with realistic accents and background noise.

---

## 16. Parent / Guardian and Child Profiles

These pages depend on the backend child-profile contract. Implement them only against actual supported endpoints.

### 16.1 Child profile management

- Create/edit a nickname, class, curriculum, and language preference where supported.
- Let the guardian select the active child profile before starting personalised learning.
- Do not require full legal name, birth date, school name, address, or a child email for basic learning.
- Confirm before deleting a profile and clearly explain the data affected where policy information exists.

### 16.2 Progress page

- Show summary cards such as lessons completed, quiz attempts, and topics practised only when those metrics come from backend responses.
- Distinguish learning activity from mastery/grade claims. Do not label a child “weak” or “bad” at a subject.
- Use supportive language such as “Let’s practise fractions a little more”.
- Do not fabricate analytics by deriving them from incomplete browser cache.
- Restrict each view to profiles the signed-in guardian is authorised to access.

---

## 17. Admin Panel Requirements

Admin UI is part of the frontend scope, but the backend is the authority for all permission checks and book processing state.

### 17.1 Admin dashboard (`/admin`)

Show summary tiles if returned by implemented endpoints:

- Total/published books and books awaiting review.
- Ingestion jobs by state (queued, processing, succeeded, failed).
- Recent failed jobs needing attention.
- Usage/cost estimate, request volume, latency, and errors.
- Recent feedback/reported answers.

If the backend has not implemented a metric endpoint, do not show fake zero values; hide the metric or label it as unavailable.

### 17.2 Book list (`/admin/books`)

Required capabilities:

- Search and filter by title, curriculum, grade, subject, language, edition, publication state, and processing state where API supports it.
- Paginated data table with status badges.
- Add Book action.
- Open details/preview.
- Publish/unpublish, re-index, archive, and delete actions according to permission.
- Confirmation dialog for destructive/state-changing actions.
- Show job state and latest safe error summary.

### 17.3 Upload book (`/admin/books/new`)

Form fields should map to backend book metadata. At minimum, as supported by backend:

- Book title.
- Grade/class.
- Curriculum.
- Subject.
- Language.
- Edition year/label.
- Publisher/source information.
- Rights/permission notes or status.
- PDF upload.

Flow:

1. Validate required metadata.
2. Create/register the book using the documented endpoint.
3. Request a signed upload URL if that flow is configured, or use the upload mechanism explicitly defined by backend.
4. Upload the original file without exposing storage credentials.
5. Trigger processing through the documented endpoint if the backend does not queue it automatically.
6. Navigate to the book details/processing page.
7. Poll a status endpoint or update through supported job events; use a reasonable interval and stop polling after completion/unmount.
8. Show a clear success/failure state and next action.

Do not assume an uploaded file is indexed or published. Processing, review, and publication are separate states.

### 17.4 Book processing/details page (`/admin/books/[bookId]`)

- Display book metadata and current processing/publication status.
- Show job stage/progress if the backend returns it.
- Show extracted text/page preview only through an authorised endpoint.
- Show OCR warnings, low-confidence extraction, and safe error details when available.
- Allow metadata edits, retry failed job, reprocess/re-index, publish/unpublish, archive, and delete only when permitted.
- Warn that replacing a book edition may affect existing citations/index results.
- After unpublishing, invalidate relevant public book/tutor caches as appropriate; the backend must immediately exclude it from retrieval.

### 17.5 AI settings (`/admin/ai-settings`)

- Display the currently selected provider and model, provider capability status, and configured non-secret limits if returned by the backend.
- Allow a permitted admin to select only backend-allowlisted provider/model combinations.
- Never fetch or display secret values.
- Do not ask the browser to store API keys.
- Ask for confirmation when a setting change can affect availability/cost.
- Show the result from the backend and allow a safe rollback where the API supports it.
- Handle unsupported capabilities (e.g., chosen provider cannot fulfil vision/TTS) with clear status rather than assuming every model is equivalent.

### 17.6 Usage, feedback, and audit logs

- Usage: show time range, request count, error rate, latency and estimated costs only if the backend returns them.
- Feedback: filter/search by status/date/subject where available; display only fields the current role may see.
- Audit logs: read-only for authorised roles; do not expose tokens, secrets, raw private uploads, or unnecessary child content.
- Admin actions should show a success state only after the API confirms success.

---

## 18. API Client and Data Management

### 18.1 API base URL

Use a configured public API base URL, for example:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

The value above is a local development example only. Production must use the deployed HTTPS API URL.

### 18.2 Recommended frontend structure

- `lib/api/client.ts`: base URL, request IDs if required, headers, JSON parsing, common error handling.
- `lib/api/auth.ts`: Firebase token retrieval and protected request helper.
- `lib/api/contracts.ts`: shared request/response types or generated schema types.
- `lib/api/books.ts`: book/subject/curriculum requests.
- `lib/api/tutor.ts`: chat, lessons, quizzes, and feedback.
- `lib/api/conversations.ts`: saved history operations.
- `lib/api/media.ts`: uploads, image questions, voice transcription, speech playback.
- `lib/api/admin.ts`: admin-only endpoints.
- `lib/api/progress.ts`: child profile and learning progress.

Do not scatter bare `fetch()` calls through dozens of components. Use a reusable API layer and feature hooks.

### 18.3 TanStack Query rules

- Use query hooks for remote state and mutation hooks for write operations.
- Set appropriate stale times: book catalogue may be cached longer; admin processing status and active conversations need fresher data.
- Invalidate/re-fetch affected queries after book metadata, publish state, role, conversation, profile, or progress changes.
- Avoid retrying non-idempotent mutations blindly.
- Do not cache authenticated child data across users. Clear the query client on sign-out/account switch.
- Avoid putting raw audio/image blobs or tokens in query cache.

### 18.4 Standard error handling

Backend error shape is conceptually:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Please try again shortly.",
    "requestId": "req_example"
  }
}
```

The API client should parse this envelope safely. Map known codes to friendly UI copy, retain request IDs for support/debug, and never display stack traces or provider payloads to students.

Handle at least:

- No network / timeout.
- `400` validation error.
- `401` unauthenticated / expired session.
- `403` permission denied.
- `404` unavailable book/conversation/upload.
- `409` conflicting state where applicable.
- `413` file too large.
- `415` unsupported file type.
- `429` rate limit/quota reached.
- `5xx` backend or provider failure.
- Valid HTTP response with malformed/unknown JSON.

### 18.5 Loading states

Every data-driven page needs an explicit loading state. Prefer skeletons that resemble the final content. Avoid full-page spinners for short requests when a local indicator is sufficient. Disable only controls involved in the in-flight operation unless broader locking is needed to prevent an invalid state.

---

## 19. Security, Child Safety, and Privacy Requirements

- Use HTTPS in production.
- Keep provider keys, storage credentials, Firebase Admin credentials, and other secrets out of the browser bundle.
- Treat client-side role checks as UX only; backend must authorise every protected API call.
- Never trust arbitrary IDs in URLs; backend must enforce ownership and object-level access control.
- Do not use localStorage for sensitive child data or long-lived raw tokens unless the authentication architecture explicitly requires it and the risk has been reviewed.
- Clear cached private data on sign-out.
- Request camera/microphone permissions only after an explicit user action.
- Explain image/audio submission purpose before sending media.
- Do not render arbitrary HTML from model output; escape text and use the approved markdown/rendering component with a safe configuration.
- Do not automatically open model-provided URLs or download unknown files.
- Validate image/file size and type before sending for user experience; backend validation remains authoritative.
- Never upload a learner's file into the official shared textbook corpus.
- Do not expose other learners' conversations, files, or progress in client-side caches or admin views beyond explicit permissions.
- Provide sign-out and data deletion actions where supported.
- Include privacy/terms pages before a public pilot, and get appropriate legal/privacy review for processing children's data in Bangladesh and for transfers to external AI/speech providers.
- Avoid analytics that record full child prompts by default. If conversation content must be logged for debugging, apply access restrictions and documented retention.

### 19.1 Child-facing response display

The backend owns safety policy and answer generation. The frontend should:

- Display friendly, non-shaming copy.
- Allow users to report an inappropriate or incorrect answer if the feedback endpoint is active.
- Avoid showing raw model/provider error messages.
- Avoid encouraging a child to reveal private information.
- Clearly distinguish generated explanations from source citations and learning progress.

---

## 20. Accessibility, Responsiveness, and Performance

### 20.1 Accessibility

Target WCAG 2.2 AA where practical and validate key flows with keyboard and screen reader checks.

- Use semantic headings, landmarks, labels, and buttons.
- All icon-only actions must have accessible names and focus states.
- Dialogs must manage focus, close appropriately, and announce errors.
- Do not rely on colour alone to communicate status/correctness.
- Ensure text contrast and scalable text.
- Support keyboard navigation and visible focus outlines.
- Respect reduced-motion preferences.
- Provide captions/transcripts for spoken content when available.
- Announce recording and upload state to assistive technology.
- Keep touch targets comfortably sized for young users.

### 20.2 Responsive breakpoints

Use Tailwind’s responsive system and design for mobile-first layouts. Test narrow Android devices, common phone sizes, tablets, laptops, and large desktop widths. Breakpoints are implementation details; no layout may rely on a single fixed desktop width.

### 20.3 Performance

- Use Next.js image optimisation where suitable and compress large illustrations.
- Lazy-load lesson illustrations and non-essential media.
- Avoid loading all animation assets on the initial homepage.
- Keep JavaScript bundles small and split admin-only code from student pages where practical.
- Avoid expensive client-side rerenders for long chats; consider message-list windowing only if it becomes necessary.
- Paginate books, history, and admin tables where supported.
- Use optimistic UI updates only when rollback/error handling is implemented.
- Cache public catalogue data safely; never share authenticated data between users.
- Provide usable empty/error states on slow networks.

---

## 21. Suggested Frontend Project Structure

```text
frontend/
├── public/
│   ├── images/
│   ├── mascot/
│   └── animations/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx
│   │   │   ├── welcome/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── books/page.tsx
│   │   │   └── books/[bookId]/page.tsx
│   │   ├── (learner)/
│   │   │   ├── tutor/page.tsx
│   │   │   ├── tutor/[conversationId]/page.tsx
│   │   │   ├── learn/[lessonId]/page.tsx
│   │   │   ├── practice/page.tsx
│   │   │   ├── progress/page.tsx
│   │   │   ├── parent/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── books/page.tsx
│   │   │   ├── books/new/page.tsx
│   │   │   ├── books/[bookId]/page.tsx
│   │   │   ├── ingestion-jobs/page.tsx
│   │   │   ├── ai-settings/page.tsx
│   │   │   ├── usage/page.tsx
│   │   │   ├── feedback/page.tsx
│   │   │   └── audit-logs/page.tsx
│   │   ├── 403/page.tsx
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   ├── loading.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── books/
│   │   ├── lessons/
│   │   ├── quizzes/
│   │   ├── media/
│   │   ├── parent/
│   │   └── admin/
│   ├── features/
│   │   ├── auth/
│   │   ├── guest/
│   │   ├── tutor/
│   │   ├── conversations/
│   │   ├── books/
│   │   ├── lessons/
│   │   ├── quizzes/
│   │   ├── media/
│   │   ├── profiles/
│   │   ├── progress/
│   │   └── admin/
│   ├── hooks/
│   ├── lib/
│   │   ├── api/
│   │   ├── firebase/
│   │   ├── query-client.ts
│   │   ├── env.ts
│   │   ├── permissions.ts
│   │   └── utils.ts
│   ├── schemas/
│   ├── types/
│   └── middleware.ts
├── tests/
│   ├── unit/
│   ├── components/
│   └── e2e/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

This is a target structure, not a mandate to create every folder empty on day one. Build by feature, keep files focused, and avoid oversized components containing UI, API logic, and business rules in one file.

---

## 22. Environment Configuration

Example `.env.example` for the frontend:

```env
# Browser-visible public configuration only
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Do not put OpenRouter/Anthropic/Gemini keys or Firebase Admin credentials here.
# Do not prefix secrets with NEXT_PUBLIC_.
```

The Firebase web configuration is intended for the browser; Firebase security still depends on correct Authentication, API authorization, and Firebase configuration rules. Provider keys and service-account credentials must live only in backend secret configuration.

Validate required environment variables at application startup and show a developer-friendly error in non-production if a required value is missing. Never print secret values in logs.

---

## 23. Testing Requirements

### 23.1 Unit tests

Test:

- API error parsing and mapping to UI messages.
- Tutor response parsing and optional field handling.
- Citation display when fields are missing or page ranges exist.
- Slide renderer behavior for each supported slide type and unknown types.
- Language selection and UI text formatting.
- Permission-based menu visibility as a UI behavior (not as a security boundary).
- Upload validation messages and status transitions.
- Correct cleanup of temporary media previews and object URLs.

### 23.2 Component/integration tests

Test:

- Login form validation and Firebase error states.
- Guest session creation and expired/limited session behavior.
- Chat send, loading, success, error, and retry flows.
- Source citations and insufficient-context response.
- Book/subject catalogue loading and empty states.
- Lesson slide navigation and quiz submission UI.
- Image upload and voice UI under success, denied permission, unsupported capability, and server failure states.
- Admin upload, process, preview, publish, unpublish, re-index, and error-state flows using controlled test responses.
- Cache clearing on sign-out and account switching.

### 23.3 End-to-end tests

Minimum Playwright journeys:

1. A guest visits the homepage, opens the tutor, starts a temporary session, asks a text question, and reaches the guest limit state safely.
2. A guardian signs in with a test account and opens the tutor.
3. An authenticated user sends a Bangla question and receives a response with citations.
4. An authenticated user submits a Banglish question such as `vognangsho ki? easy kore bujhao` without the UI rewriting the message.
5. A learner opens and completes a structured sample lesson.
6. A guest clicks the camera/voice action and is asked to sign in before a browser permission prompt or upload starts.
7. An authorised admin uploads a test book, observes processing status, previews extracted content, and publishes only after the workflow allows it.
8. A normal user cannot access admin pages/actions or another user's conversation by changing a URL.
9. A user signs out and the next user does not see cached conversations or child data.
10. A provider timeout or quota error produces a friendly recovery state without leaking raw provider details.

### 23.4 Accessibility and responsive checks

- Test at narrow phone widths, tablet widths, laptop widths, and wide desktop widths.
- Navigate main flows using keyboard only.
- Check contrast, focus state, labels, dialog focus management, and reduced motion.
- Verify long Bengali text, mixed-language messages, equations, citations, and source labels do not cause overflow.
- Check mobile virtual keyboard behavior in chat and forms.

---

## 24. Implementation Roadmap

### Phase 1 — Frontend foundation

- Create Next.js App Router + TypeScript project.
- Add Tailwind, UI primitives, design tokens, responsive shell, and basic typography.
- Set up API client, TanStack Query, Firebase client configuration, and environment validation.
- Build homepage, welcome, login, signup, route loading/error boundaries, and basic layout.

**Done when:** Pages load responsively, environment config is validated, and no provider secret exists in the frontend.

### Phase 2 — Guest and authenticated tutor

- Implement Google/email sign-in and sign-out.
- Implement `GET /me` profile/permission loading.
- Implement guest session flow.
- Build tutor workspace, composer, message list, typing/loading state, citation component, and error mapping.
- Connect `POST /tutor/chat` with proper auth/guest credentials.
- Add history list for authenticated users using documented endpoints.

**Done when:** Guest text chat and authenticated chat both work through the backend with clear limit/error handling.

### Phase 3 — Books and multilingual experience

- Build subject/book catalogue and chapter browsing.
- Add book context selection in tutor UI.
- Add language preference control for `auto`, `bn`, `en`, and `banglish` according to API support.
- Test Bengali glyph rendering, mixed-language text, long messages, citations, and mobile layout.

**Done when:** Users can browse published books and send Bangla, English, and Banglish questions without the UI altering their original text.

### Phase 4 — Lessons and practice

- Create typed slide schema matching backend output.
- Build lesson player and allowed slide renderers.
- Add safe image/diagram components and basic animations.
- Connect lesson and quiz endpoints.
- Show server-returned scoring/feedback and progress where supported.

**Done when:** A validated lesson/quiz response renders without dynamic code execution or horizontal overflow.

### Phase 5 — Admin book management

- Build admin shell and permission-aware navigation.
- Add book list/search/filter and book metadata form.
- Implement upload/signed URL flow from the backend contract.
- Add processing status, extracted content preview, retries, re-index, publish/unpublish, archive, and safe delete confirmation.
- Add user-safe errors and job polling/status handling.

**Done when:** An authorised admin can manage book ingestion without a developer editing backend source code for each new book.

### Phase 6 — Voice, camera, and guardian tools

- Add authenticated image-question workflow and camera/file chooser.
- Add press-to-talk, transcript review, and audio playback when backend capabilities are enabled.
- Add child profile management, parent/progress views, and learning-session persistence according to supported endpoints.
- Verify permission prompts and cleanup of temporary media.

**Done when:** Optional media capabilities work when configured and gracefully report unsupported/unavailable states otherwise.

### Phase 7 — Production hardening

- Complete accessibility, security-minded UI review, route/error handling, and cache isolation tests.
- Add production metadata, privacy/terms routes, and support/feedback guidance.
- Optimise images, animation bundles, page loading, and mobile chat scrolling.
- Configure production API URL and Firebase authorised domains.
- Run all end-to-end acceptance tests against a staging backend.

**Done when:** The release gates below are met and unresolved limitations are documented.

---

## 25. Definition of Done

The frontend MVP is considered complete when:

- [ ] The homepage is responsive, polished, and driven by real catalogue data where required.
- [ ] The welcome screen provides Google, email, and guest entry flows.
- [ ] Firebase sign-in works and backend identity/permission data is loaded correctly.
- [ ] Guest users can use limited text chat without receiving permanent-history features.
- [ ] Authenticated users can send questions and see normalized tutor responses.
- [ ] Bangla, English, Banglish, and mixed-language text render without overflow or unwanted client-side rewriting.
- [ ] Book references display only backend-returned source information.
- [ ] Loading, empty, timeout, quota, permission, unsupported-feature, and server-error states are implemented.
- [ ] The lesson renderer supports approved slide types and never executes model-generated markup/code.
- [ ] Book catalogue and chapter browsing respect publication status returned by the API.
- [ ] Admin book upload and management match actual backend endpoints and require backend authorisation.
- [ ] Camera/microphone permission is requested only after explicit user action and applicable authentication.
- [ ] Private caches are cleared on sign-out and account switching.
- [ ] All provider and storage secrets remain outside the frontend bundle.
- [ ] Core flows pass unit/component/E2E tests and responsive/accessibility checks.
- [ ] The website can be deployed independently from the backend via environment configuration.
- [ ] The frontend uses no hard-coded fake success states for live production workflows.

---

## 26. Coding-Agent / Developer Instructions

When implementing from this document:

1. Read `backend_readme.md` first. It defines the canonical API contract, response schemas, role model, and data processing responsibilities.
2. Implement in the phases above. Do not try to build every feature in one giant component or one large code generation step.
3. Start with the working foundation and complete a small vertical slice: guest/auth flow → tutor request → response/citation display → error handling.
4. Keep UI components, API calls, schemas, and feature logic in separate modules.
5. Match actual backend endpoint names, HTTP methods, and payloads. If a mismatch is found, document it and coordinate the contract change; do not silently invent a new endpoint.
6. Use realistic demo fixtures only in development/test environments. Clearly flag demo data and do not confuse it with real indexed textbooks or live AI responses.
7. Use strict TypeScript, schema validation, accessible controls, and consistent design tokens.
8. Use the fixed slide renderer; never evaluate HTML, JavaScript, JSX, or arbitrary URLs generated by an AI model.
9. Test Bangla-script, English, and Banglish input on desktop and mobile.
10. Do not expose secret keys or private child data in logs, browser storage, URLs, screenshots, or error messages.
11. Do not claim a book has been indexed/published, an upload deleted, a quiz saved, or a setting changed until the backend confirms the operation.
12. Keep a short implementation checklist and update it as each phase is completed. Do not mark a feature complete based only on its visual appearance.

---

## 27. Final Frontend Decisions

1. **Web first:** Next.js App Router + TypeScript, responsive from the beginning.
2. **One backend contract:** All tutor, books, upload, progress, and admin data uses `/api/v1` endpoints.
3. **Firebase client auth, backend authorization:** Authentication UI is on the frontend; application role and resource permissions come from verified backend data.
4. **Guest mode is text-only in MVP:** Voice, camera, saved conversations, and personalised features require authentication.
5. **Multilingual-first UI:** Preserve user input and support Bangla, English, Banglish, and mixed-script content.
6. **Safe structured lessons:** The AI returns data; the frontend renders only approved slide components.
7. **Admin-managed content:** New books are uploaded and processed through admin workflows, not hard-coded into frontend source files.
8. **Provider-neutral client:** The UI does not know or care which LLM provider generated the answer.
9. **No fake production features:** Disabled capabilities are labelled clearly; only backend-confirmed actions show success.
10. **Mobile later without backend rewrite:** Expo/React Native can consume the same REST API, though its UI is implemented separately.
