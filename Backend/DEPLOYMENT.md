# Deployment & Operations — Class 3 AI Tutor Backend

## 1) Environments

Keep **dev / staging / prod** fully separate: separate Neon branches/databases, separate Firebase projects (or at minimum separate service accounts), separate storage buckets/prefixes, separate Redis, separate API keys.

## 2) NeonDB (PostgreSQL + pgvector)

- Create project → copy **pooled** (`-pooler`) URL → `DATABASE_URL`; **direct** URL → `DIRECT_URL` (both `?sslmode=require`).
- Enable extensions `vector`, `pg_trgm` (migration also runs `CREATE EXTENSION IF NOT EXISTS`).
- Migrations run against `DIRECT_URL`:
  ```bash
  npx prisma migrate deploy
  ```
- Backups: enable Neon **Point-in-Time Recovery + branching**. Test restore to a branch before launch. Document RPO/RTO for your team.
- Connection pooling: app runtime uses the pooled host; migrations/worker-admin use direct host.

## 3) Firebase Authentication

- Client enables Google + email/password sign-in (Firebase console → Authentication).
- Backend verifies ID tokens with Firebase Admin SDK:
  - **Local:** `FIREBASE_PROJECT_ID` + `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json` (gitignored) **or** `FIREBASE_SERVICE_ACCOUNT_BASE64`.
  - **Production:** workload identity (`GOOGLE_APPLICATION_CREDENTIALS` via secret manager / attached SA), never commit JSON keys.
- First super-admin: `BOOTSTRAP_FIREBASE_UID=<verified uid> npm run bootstrap:admin` (idempotent, audited).

## 4) Storage (S3-compatible / R2)

- Dev: `STORAGE_PROVIDER=local` (./storage, gitignored).
- Prod: `STORAGE_PROVIDER=s3` + `S3_ENDPOINT/S3_REGION/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY`. Cloudflare R2: endpoint `https://<account>.r2.cloudflarestorage.com`, region `auto`. Use **private** buckets + short-lived signed GETs (5 min). Separate prefixes: `official-books/` vs `learner-uploads/`.
- Never expose original textbook PDFs publicly unless rights permit (spec §13.5).

## 5) Redis + worker

- Prod: set `REDIS_URL` (Upstash/Redis Cloud/self-hosted), run **2 processes**: `npm start` (API) + `npm run worker` (ingestion). BullMQ: 3 attempts, exponential backoff, idempotent jobs.
- Dev: empty `REDIS_URL` → in-process fallback (single instance only).

## 6) AI providers & embeddings

- Start: `AI_PROVIDER=mock` (free, deterministic). Then `openrouter` (needs `OPENROUTER_API_KEY`, `AI_MODEL=<openrouter model id>`). Production path: `anthropic` (`ANTHROPIC_API_KEY` = **API billing**, not a Claude chat subscription).
- Admin selects allowlisted provider/model via `PATCH /admin/ai-config`; restart to take effect. Secrets never in DB/APIs/logs.
- Embeddings are independent: `hash` (dev) or `openai-compatible` (`EMBEDDING_BASE_URL` + `EMBEDDING_API_KEY` + matching `EMBEDDING_DIMENSION`). Model change → full re-embed job (`POST /admin/books/:id/reindex`).

## 7) Secrets management

`.env` is gitignored. Production secrets live in your host's secret manager (Render/Fly/Railway/VPS env, GitHub Actions secrets for CI). Rotate: guest JWT, S3 keys, provider keys. Never log `Authorization`, keys, or signed URLs (Pino redaction is preconfigured).

## 8) Run / scale

```bash
npm ci && npx prisma generate && npm run build
npx prisma migrate deploy
npm start            # API
npm run worker       # ingestion worker (separate process/container)
```

- Stateless API → horizontal scale behind a load balancer; sticky sessions not required. Worker concurrency `2` (tune by OCR/embedding quotas).
- Schedule `npm run cleanup:temp` daily (guest TTL, temp uploads).
- Health: `/health` (liveness) + `/api/v1/health/ready` (readiness incl. DB). Alert on `degraded`, P95 latency, provider 429s, ingestion failures, quota exhaustion.

## 9) Cost controls

`GUEST/AUTH_CHAT_LIMIT_PER_DAY`, `AI_MAX_OUTPUT_TOKENS`, `AI_DAILY_BUDGET_USD`, upload/page caps, bounded retries, no silent fallback to unapproved models. Dashboard: `GET /admin/usage`.

## 10) Recovery runbook (minimal)

1. DB issue → fail over to Neon branch/restore; `migrate deploy`; verify `/health/ready`.
2. Provider outage → switch `AI_PROVIDER`/`AI_MODEL` to fallback (allowlisted), restart; monitor `/admin/usage`.
3. Bad book edition → `unpublish` → `reindex`/replace → `publish`; old edition archived, never silently mixed.
