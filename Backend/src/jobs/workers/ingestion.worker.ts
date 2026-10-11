import { Worker } from "bullmq";
import { getRedis, isRedisConfigured } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { INGESTION_QUEUE } from "../queues.js";

/**
 * Ingestion worker entrypoint: `npm run worker`.
 * Long-running OCR/embedding work stays out of HTTP requests (spec §6.5).
 */
async function main() {
  if (!isRedisConfigured()) {
    logger.info("REDIS_URL empty — worker idle (inline fallback handles dev jobs). Press Ctrl+C to exit.");
    setInterval(() => undefined, 60_000);
    return;
  }
  const connection = getRedis();
  if (!connection) throw new Error("Redis unavailable");

  const { processBookIngestion } = await import("../../modules/ingestion/service.js");

  const worker = new Worker(
    INGESTION_QUEUE,
    async (job) => {
      const bookId = (job.data as { bookId?: string }).bookId;
      if (!bookId) throw new Error("job missing bookId");
      logger.info({ jobId: job.id, bookId }, "Processing ingestion job");
      await processBookIngestion(bookId, String(job.id));
    },
    { connection, concurrency: 2 }
  );

  worker.on("completed", (job) => logger.info({ jobId: job.id }, "Ingestion job completed"));
  worker.on("failed", (job, err) => logger.warn({ jobId: job?.id, err: String(err) }, "Ingestion job failed"));
  logger.info("Ingestion worker started");
}

main().catch((err) => {
  logger.error({ err: String(err) }, "Worker crashed");
  process.exit(1);
});
