# Class 3 AI Tutor — Backend

Modular-monolith REST API (`/api/v1`) for a book-grounded, multilingual (Bangla / English / Banglish) Class 3 tutor — Bangladesh-first. Implements `backend_readme.md` v1.0: Firebase Auth + guardian/child profiles, guest mode, admin book pipeline, hybrid RAG (pgvector + full-text), provider-independent LLM layer (OpenRouter first, Claude later), lessons/quizzes, voice/vision hooks, quotas, audit, and hardening.

**DBMS: NeonDB** (serverless PostgreSQL + pgvector). Redis (BullMQ) optional in dev, required in production.

## Quick start (local, no keys needed)

```bash
cd Backend
cp .env.example .env   # placeholders already include a runnable dev default
npm install
npx prisma generate
npm run dev            # API on http://localhost:5000
```

Mock AI + hash embeddings + local storage are active by default, so the full loop works immediately:

```bash
curl http://localhost:5000/health
curl -X POST http://localhost:5000/api/v1/guest/session
# → use guestToken below:
curl -X POST http://localhost:5000/api/v1/tutor/chat \
  -H "Authorization: Bearer guest_<...>" -H "Content-Type: application/json" \
  -d '{"message":"vognangsho ki? easy kore bujhao"}'
```

Docs: `http://localhost:5000/docs` · OpenAPI JSON: `/openapi.json`.

## NeonDB setup (PostgreSQL + pgvector)

1. Create a project at [neon.tech](https://neon.tech) (region closest to users, e.g. Singapore for BD).
2. In the Neon dashboard → **Connect** → copy:
   - **Pooled** URL (contains `-pooler`) → `DATABASE_URL`
   - **Direct** URL (no `-pooler`) → `DIRECT_URL` (used for migrations)
   - Both need `?sslmode=require`.
3. Enable pgvector: Neon supports the `vector` extension — our migration runs `CREATE EXTENSION IF NOT EXISTS vector`. (If your Neon plan restricts extensions, enable `vector` + `pg_trgm` in **Settings → Extensions** first.)
4. Apply schema:
   ```bash
   npx prisma migrate deploy        # uses DIRECT_URL
   # or for first-time prototyping: npx prisma db push
   ```
5. Verify: `GET /api/v1/health/ready` → `database: ok`.

> `EMBEDDING_DIMENSION` (default 1536) must match the embedding model. Changing the embedding model later requires a **full re-embedding** (new migration + reindex), never mixing dimensions.

## Environment variables

All keys live in `Backend/.env` (gitignored). Template + per-field guide: `.env.example`. After the build the assistant will ask you for each real value — summary:

| Variable | Where to get it | Required when |
|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Neon dashboard → Connect (pooled / direct) | Always (full backend) |
| `FIREBASE_PROJECT_ID` | Firebase console → Project settings | Any real sign-in |
| `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_BASE64` | Firebase console → Service accounts → Generate key (local file) **or** base64 it; production: workload identity / secret manager | Backend token verification |
| `GUEST_JWT_SECRET` | You generate: `openssl rand -base64 48` | Always (guest sessions) |
| `STORAGE_PROVIDER=local` vs `s3` + `S3_*` | Local: nothing. S3/R2: Cloudflare R2 (or AWS S3) → API tokens / bucket | Prod file storage |
| `REDIS_URL` | Upstash / Redis Cloud / self-hosted (empty = in-process fallback, dev only) | Prod background jobs |
| `AI_PROVIDER` / `AI_MODEL` | `mock` (no key) → `openrouter` / `anthropic` / `gemini` as you add keys | Real AI answers |
| `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) → Keys | `AI_PROVIDER=openrouter` |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API keys (API billing, **not** a Claude chat subscription) | `AI_PROVIDER=anthropic` (prod path) |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → API keys | Optional Gemini adapter |
| `EMBEDDING_PROVIDER` / `EMBEDDING_MODEL` / `EMBEDDING_API_KEY` | `hash` (no key, dev) or OpenAI-compatible embeddings endpoint + key | Better Bengali/Banglish recall |
| `OCR/STT/TTS_*` | Your chosen OCR/STT/TTS provider (mock by default) | Voice/vision features |
| `BOOTSTRAP_FIREBASE_UID` (+`BOOTSTRAP_ADMIN_EMAIL`) | Firebase console → Authentication → user UID | First super-admin seed |

Full per-field instructions + how to generate each secret are in `DEPLOYMENT.md`.

## Core flows

- **First milestone (spec):** secure foundation + Super Admin uploads a sample textbook → sees processing → publishes → tested RAG chat.
  ```bash
  # 1) create super admin (server-side, idempotent)
  BOOTSTRAP_FIREBASE_UID=<uid> npm run bootstrap:admin
  # 2) sign in on the web client (Firebase Google/email) → Bearer token
  # 3) POST /api/v1/admin/books (multipart: metadata + file) → { book, jobId }
  # 4) GET /api/v1/admin/books/:id (status) → READY_TO_PUBLISH
  # 5) POST /api/v1/admin/books/:id/publish
  # 6) POST /api/v1/tutor/chat → ANSWERED + real page citations
  ```
- **Provider switch:** `PATCH /api/v1/admin/ai-config` (allowlisted only) + restart with new `AI_PROVIDER`/`AI_MODEL`. Frontend contract unchanged.
- **Background worker (prod):** `npm run worker` (Redis required). Dev without Redis processes inline automatically.
- **Cleanup cron:** `npm run cleanup:temp` (guest TTL, temp uploads).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `start` / `worker` | API (watch/prod) / ingestion worker |
| `npm run bootstrap:admin` | Idempotent super-admin seed |
| `npm run seed:dev` | Curriculum/subject/mock provider seed |
| `npm run cleanup:temp` | TTL cleanup (schedule daily) |
| `npm test` / `test:coverage` | Vitest: unit + integration + e2e + RAG dataset health |
| `npm run typecheck` | Strict TS check |
| `npx prisma migrate dev/dev deploy` | Migrations (DIRECT_URL) |

## Project layout

```
Backend/
├── prisma/{schema.prisma,migrations/0001_init/migration.sql}
├── src/{app.ts,server.ts,config/,common/,modules/,jobs/,docs/,types/}
│   └── modules: auth, child-profiles, curricula, subjects, books, ingestion,
│       retrieval, tutor, ai-providers, embeddings, media, voice, conversations,
│       feedback(+progress/sessions), admin, health
├── tests/{unit,integration,e2e,rag-evaluation}
├── scripts/{bootstrap-super-admin,seed-development,cleanup-temp,export-openapi}.ts
├── .env.example (+ local gitignored .env) · README.md · DEPLOYMENT.md · PRIVACY_NOTICE.md
└── openapi served at /docs + /openapi.json
```

## Production checklist (release gates, spec §18.4)

Authz pass · no self-promotion · private validated uploads · prompt-injection tests · no secret leaks · RAG citation tests green · rate limits + `AI_DAILY_BUDGET_USD` enforced · privacy notice + deletion path (`DELETE /me/child-profiles/:id`, conversation delete) · backups (Neon PITR / branching) + recovery runbook (`DEPLOYMENT.md`).

See also: `../backend_readme.md` (authoritative spec), `DEPLOYMENT.md`, `PRIVACY_NOTICE.md`.
