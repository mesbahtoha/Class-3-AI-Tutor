import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";

/**
 * Global IP rate limiter (cheap abuse control). Per-account / per-guest daily
 * quotas are enforced separately in the tutor orchestrator (usage_logs).
 */
export function globalRateLimiter() {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again shortly.",
        requestId: "req_rate_limited",
      },
    },
  });
}

/** Stricter limiter for guest session creation + guest chat. */
export function strictRateLimiter() {
  return rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again shortly.",
        requestId: "req_rate_limited",
      },
    },
  });
}
