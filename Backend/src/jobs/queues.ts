import { Queue, QueueEvents, JobsOptions } from "bullmq";
import { getRedis, isRedisConfigured } from "../config/redis.js";
import { logger } from "../config/logger.js";

/**
 * Ingestion job queue (spec §6.5). Redis + BullMQ in production;
 * in-process fallback when REDIS_URL is empty (single-instance dev/test).
 */

export const INGESTION_QUEUE = "book-ingestion";

type JobPayload = Record<string, unknown> & { bookId: string };

let queue: Queue | null = null;
// In-memory fallback registry (dev/test without Redis).
const memoryJobs = new Map<string, { id: string; payload: JobPayload; status: string }>();
let memSeq = 0;

function getQueue(): Queue | null {
  if (!isRedisConfigured()) return null;
  if (!queue) {
    const connection = getRedis();
    if (!connection) return null;
    queue = new Queue(INGESTION_QUEUE, { connection });
    const events = new QueueEvents(INGESTION_QUEUE, { connection: connection.duplicate() });
    events.on("failed", ({ jobId, failedReason }) =>
      logger.warn({ jobId, failedReason }, "Ingestion job failed")
    );
  }
  return queue;
}

export async function enqueueIngestion(
  bookId: string,
  extra: Record<string, unknown> = {},
  opts: JobsOptions = {}
): Promise<{ id: string; queued: "redis" | "memory" }> {
  const payload: JobPayload = { bookId, ...extra };
  const q = getQueue();
  if (q) {
    const job = await q.add(
      "ingest-book",
      payload,
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
        jobId: `ingest-${bookId}-${Date.now()}`,
        ...opts,
      }
    );
    // Lazily trigger inline processing attempt is handled by the worker process.
    return { id: job.id ?? `redis-${Date.now()}`, queued: "redis" };
  }
  // Fallback: record + process inline (import to avoid circular dep at top).
  const id = `mem_${++memSeq}_${Date.now()}`;
  memoryJobs.set(id, { id, payload, status: "QUEUED" });
  // Fire-and-forget inline processing (dev convenience; production uses worker).
  import("../modules/ingestion/service.js")
    .then((m) => m.processBookIngestion(bookId, id).catch((e: unknown) => logger.warn({ err: String(e) }, "Inline ingestion failed")))
    .catch(() => undefined);
  return { id, queued: "memory" };
}

export function memoryJobStatus(id: string) {
  return memoryJobs.get(id) ?? null;
}
