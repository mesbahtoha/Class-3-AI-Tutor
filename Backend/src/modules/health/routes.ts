import { Router } from "express";
import { checkDatabase } from "../../config/db.js";
import { isRedisConfigured } from "../../config/redis.js";
import { firebaseStatus } from "../auth/firebase.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../common/errors/errorHandler.js";

const router = Router();

/** GET /health — public liveness. GET /health/ready — readiness with deps. */
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ data: { status: "ok", service: "class3-ai-tutor-backend", time: new Date().toISOString() }, requestId: _req.requestId });
  })
);

router.get(
  "/ready",
  asyncHandler(async (req, res) => {
    const db = await checkDatabase();
    const firebase = firebaseStatus();
    const checks = {
      database: db.ok ? "ok" : "degraded",
      redis: isRedisConfigured() ? "configured" : "fallback-memory",
      firebase: firebase.configured ? "ok" : "unconfigured-dev",
      storage: env.STORAGE_PROVIDER,
      aiProvider: env.AI_PROVIDER,
      embedding: `${env.EMBEDDING_PROVIDER}/${env.EMBEDDING_MODEL}/${env.EMBEDDING_DIMENSION}d`,
    };
    const ok = db.ok;
    res.status(ok ? 200 : 503).json({ data: { status: ok ? "ready" : "degraded", checks }, requestId: req.requestId });
  })
);

export default router;
