import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  API_BASE_PATH: z.string().default("/api/v1"),
  WEB_ORIGINS: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL (Neon pooled URL) is required"),
  DIRECT_URL: z.string().optional().default(""),

  FIREBASE_PROJECT_ID: z.string().optional().default(""),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional().default(""),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional().default(""),
  GUEST_JWT_SECRET: z.string().min(16, "GUEST_JWT_SECRET must be >= 16 chars (openssl rand -base64 48)").default("dev-only-guest-secret-change-me-000000"),
  GUEST_SESSION_TTL_HOURS: z.coerce.number().positive().default(24),

  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional().default(""),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),

  REDIS_URL: z.string().optional().default(""),

  AI_PROVIDER: z.enum(["mock", "openrouter", "anthropic", "gemini"]).default("mock"),
  AI_MODEL: z.string().default("mock-tutor-v1"),
  AI_FALLBACK_PROVIDER: z.string().optional().default(""),
  AI_FALLBACK_MODEL: z.string().optional().default(""),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  OPENROUTER_APP_URL: z.string().optional().default(""),
  OPENROUTER_APP_NAME: z.string().optional().default(""),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_BASE_URL: z.string().default("https://api.anthropic.com"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_BASE_URL: z.string().default("https://generativelanguage.googleapis.com"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().positive().default(30000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().positive().default(1200),
  AI_DAILY_BUDGET_USD: z.coerce.number().nonnegative().default(1),

  EMBEDDING_PROVIDER: z.enum(["hash", "openai-compatible"]).default("hash"),
  EMBEDDING_MODEL: z.string().default("hash-1536-v1"),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(1536),
  EMBEDDING_API_KEY: z.string().optional().default(""),
  EMBEDDING_BASE_URL: z.string().optional().default(""),

  OCR_PROVIDER: z.string().default("mock"),
  OCR_API_KEY: z.string().optional().default(""),
  OCR_ENDPOINT: z.string().optional().default(""),
  STT_PROVIDER: z.string().default("mock"),
  STT_API_KEY: z.string().optional().default(""),
  STT_ENDPOINT: z.string().optional().default(""),
  TTS_PROVIDER: z.string().default("mock"),
  TTS_API_KEY: z.string().optional().default(""),
  TTS_ENDPOINT: z.string().optional().default(""),

  GUEST_CHAT_LIMIT_PER_DAY: z.coerce.number().int().nonnegative().default(10),
  AUTH_CHAT_LIMIT_PER_DAY: z.coerce.number().int().nonnegative().default(100),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(10),
  MAX_BOOK_PDF_PAGES: z.coerce.number().int().positive().default(600),
  MAX_IMAGE_COUNT_PER_DAY: z.coerce.number().int().positive().default(20),
  MAX_AUDIO_SECONDS: z.coerce.number().positive().default(120),
  TEMP_UPLOAD_TTL_HOURS: z.coerce.number().positive().default(24),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(120),

  BOOTSTRAP_FIREBASE_UID: z.string().optional().default(""),
  BOOTSTRAP_ADMIN_EMAIL: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast per spec §16 — print readable errors (no secrets).
    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      // eslint-disable-next-line no-console
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    // eslint-disable-next-line no-console
    console.error("See Backend/.env.example and Backend/README.md for required values.");
    process.exit(1);
  }
  const env = parsed.data;

  // Production guardrails (fail fast, no silent fallbacks).
  if (env.NODE_ENV === "production") {
    const problems: string[] = [];
    if (env.GUEST_JWT_SECRET.includes("dev-only") || env.GUEST_JWT_SECRET.includes("replace-me")) {
      problems.push("GUEST_JWT_SECRET must be a strong random secret in production");
    }
    if (env.STORAGE_PROVIDER === "s3") {
      if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY || !env.S3_ENDPOINT) {
        problems.push("S3 storage selected but S3_ENDPOINT/BUCKET/credentials are missing");
      }
    }
    if (env.AI_PROVIDER !== "mock" && !env.AI_FALLBACK_MODEL) {
      // informational only — fallback is optional but recommended
    }
    if (problems.length > 0) {
      // eslint-disable-next-line no-console
      console.error("❌ Production env guardrails failed:");
      for (const p of problems) console.error(`  - ${p}`);
      process.exit(1);
    }
  }
  return env;
}

export const env: Env = loadEnv();

export function webOrigins(): string[] {
  return env.WEB_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
}
