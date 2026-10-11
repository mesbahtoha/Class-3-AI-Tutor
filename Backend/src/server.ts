import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { checkDatabase } from "./config/db.js";

/** API process entrypoint (`npm run dev` / `npm start`). Worker is separate. */
async function main() {
  const app = createApp();
  const db = await checkDatabase();
  if (!db.ok) {
    logger.warn("Starting without database (degraded mode). Fill Neon DATABASE_URL and run migrations.");
  } else {
    logger.info({ latencyMs: db.latencyMs }, "Database connected (Neon)");
  }
  app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, base: env.API_BASE_PATH, env: env.NODE_ENV },
      `Class 3 AI Tutor backend listening`
    );
  });
}

main().catch((err) => {
  logger.error({ err: String(err) }, "Failed to start server");
  process.exit(1);
});
