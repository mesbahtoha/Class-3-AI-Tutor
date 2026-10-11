import IORedis from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

/**
 * Redis connection (BullMQ). Optional: if REDIS_URL is empty the queue layer
 * falls back to an in-process queue (single-instance dev/test). Production
 * MUST set REDIS_URL (Upstash / Redis Cloud / self-hosted).
 */
let redis: IORedis | null = null;

export function getRedis(): IORedis | null {
  if (!env.REDIS_URL) return null;
  if (redis) return redis;
  redis = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  });
  redis.on("error", (err) => logger.warn({ err: String(err) }, "Redis error"));
  return redis;
}

export function isRedisConfigured(): boolean {
  return Boolean(env.REDIS_URL);
}
