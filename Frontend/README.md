# Class 3 AI Tutor — Frontend

Responsive web frontend (Next.js 14 App Router + TypeScript + Tailwind) for the
Class 3 AI Tutor backend (`/api/v1`). Implements `frontend_readme.md` v1.0 with the
**Playful Geometric** design system and **dark/light mode**.

## Quick start

```bash
cd Frontend
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL to your backend
npm install
npm run dev                  # http://localhost:3000
```

Backend must be running (default `http://localhost:5000`):

```bash
cd ../Backend
npm run dev
```

## What's inside

- **Public:** `/` (hero, modes, live book catalogue, safety), `/welcome` (Google/email/guest),
  `/login`, `/signup`, `/auth/callback`, `/books`, `/books/[bookId]`, `/403`, 404/error/loading boundaries.
- **Learner:** `/tutor` (guest + auth chat, citations, follow-ups, feedback, language setting,
  book context, image/voice gated behind sign-in), `/tutor/[conversationId]` (saved history),
  `/practice` (quiz + lessons), `/learn/[lessonId]` (slide player), `/progress`, `/parent`
  (child profiles), `/settings` (theme, language, account/sign-out).
- **Admin** (`/admin/*`, backend-permission gated): dashboard, books table + upload/publish/
  unpublish/reindex/archive/delete with confirms, book detail with live processing polling +
  text preview, ingestion jobs + retry, AI settings (allowlist only, never secrets), usage,
  feedback, audit logs.
- **Design system:** centralized tokens (`globals.css` + `tailwind.config.ts`), candy buttons,
  sticker cards, dot-grid/stripes textures, bouncy physics, `prefers-reduced-motion` support,
  Outfit + Plus Jakarta Sans + **Noto Sans Bengali** (complete Bengali glyphs).
- **Dark/light mode:** system-aware default, persisted toggle in header.

## Rules enforced

- Browser calls **only** the backend API (+ Firebase Auth). No vendor AI/storage keys in
  `NEXT_PUBLIC_*` — validated at startup (`src/lib/env.ts`).
- One reusable API layer (`src/lib/api/`); TanStack Query per §18.3 (catalogue cached,
  chat/admin fresh; full cache clear on sign-out).
- User chat text is rendered **exactly as typed** (no Banglish rewriting).
- Lesson slides render through an approved-type registry; unknown types show a controlled
  message — model output is never executed as HTML/JS.
- Friendly Bangla error copy with request IDs; raw provider payloads never shown to children.
- Camera/mic requested only after explicit tap + authentication; previews revoked on close.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Dev / production build / prod server (`:3000`) |
| `npm run typecheck` | Strict TS check |
| `npm test` | Vitest unit tests (error mapping, citations, slide registry) |

## Deploy

Independent from the backend via env: set `NEXT_PUBLIC_API_BASE_URL=https://<api>/api/v1`
and add the site domain to Firebase **Authorized domains**. Works on Vercel or any
Next.js host.
