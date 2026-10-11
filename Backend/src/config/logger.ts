import pino from "pino";
import { env } from "./env.js";

/**
 * Structured logger (Pino). Secrets/tokens are redacted at the serializer
 * boundary — never log Authorization headers, API keys, or signed URLs.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "class3-ai-tutor-backend" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.apiKey",
      "*.api_key",
      "*.secret",
      "*.token",
      "*.idToken",
      "*.signedUrl",
      "*.privateKey",
      "DATABASE_URL",
      "DIRECT_URL",
      "S3_SECRET_ACCESS_KEY",
      "OPENROUTER_API_KEY",
      "ANTHROPIC_API_KEY",
      "GEMINI_API_KEY",
      "EMBEDDING_API_KEY",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, singleLine: true } }
      : undefined,
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
