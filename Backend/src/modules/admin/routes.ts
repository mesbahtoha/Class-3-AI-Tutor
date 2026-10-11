import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../common/errors/errorHandler.js";
import { validate } from "../../common/middleware/validate.js";
import { requirePermission } from "../../common/middleware/auth.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { ALLOWLISTED_PROVIDERS } from "../ai-providers/factory.js";
import { mediaCapabilities } from "../media/adapters.js";
import { AppError } from "../../common/errors/AppError.js";

const router = Router();

/** GET /admin/ingestion-jobs — list + detail + retry. */
router.get(
  "/ingestion-jobs",
  requirePermission(PERMISSIONS.JOB_READ),
  asyncHandler(async (req, res) => {
    const jobs = await prisma.ingestionJob.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    res.json({ data: jobs, requestId: req.requestId });
  })
);

router.get(
  "/ingestion-jobs/:jobId",
  requirePermission(PERMISSIONS.JOB_READ),
  asyncHandler(async (req, res) => {
    const job = await prisma.ingestionJob.findUnique({ where: { id: req.params.jobId } });
    if (!job) throw new AppError("NOT_FOUND", "Job not found.");
    res.json({ data: job, requestId: req.requestId });
  })
);

router.post(
  "/ingestion-jobs/:jobId/retry",
  requirePermission(PERMISSIONS.JOB_RETRY),
  asyncHandler(async (req, res) => {
    const job = await prisma.ingestionJob.findUnique({ where: { id: req.params.jobId } });
    if (!job) throw new AppError("NOT_FOUND", "Job not found.");
    if (job.attempts >= job.maxAttempts) throw new AppError("CONFLICT", "Max retry attempts reached.");
    const { enqueueIngestion } = await import("../../jobs/queues.js");
    const next = await enqueueIngestion(job.bookId, { retryOf: job.id });
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { attempts: { increment: 1 }, status: "QUEUED", errorCode: null, errorDetail: null },
    });
    res.json({ data: { retried: true, jobId: next.id }, requestId: req.requestId });
  })
);

/** GET /admin/ai-config — non-secret settings + capabilities (never secrets). */
router.get(
  "/ai-config",
  requirePermission(PERMISSIONS.AI_CONFIG_READ),
  asyncHandler(async (req, res) => {
    let stored: unknown[] = [];
    try {
      stored = await prisma.providerConfig.findMany({ where: { isActive: true } });
    } catch { stored = []; }
    res.json({
      data: {
        active: { provider: env.AI_PROVIDER, model: env.AI_MODEL },
        fallback: { provider: env.AI_FALLBACK_PROVIDER || null, model: env.AI_FALLBACK_MODEL || null },
        allowlistedProviders: [...ALLOWLISTED_PROVIDERS],
        embedding: { provider: env.EMBEDDING_PROVIDER, model: env.EMBEDDING_MODEL, dimension: env.EMBEDDING_DIMENSION },
        media: mediaCapabilities(),
        limits: {
          guestChatPerDay: env.GUEST_CHAT_LIMIT_PER_DAY,
          authChatPerDay: env.AUTH_CHAT_LIMIT_PER_DAY,
          maxUploadMb: env.MAX_UPLOAD_SIZE_MB,
          maxBookPages: env.MAX_BOOK_PDF_PAGES,
        },
        stored,
      },
      requestId: req.requestId,
    });
  })
);

const aiConfigPatch = z.object({
  provider: z.enum(["mock", "openrouter", "anthropic", "gemini"]).optional(),
  model: z.string().min(1).max(200).optional(),
});

/** PATCH /admin/ai-config — allowlisted provider/model + safe limits only. */
router.patch(
  "/ai-config",
  requirePermission(PERMISSIONS.AI_CONFIG_WRITE),
  validate({ body: aiConfigPatch }),
  asyncHandler(async (req, res) => {
    const body = aiConfigPatch.parse(req.body);
    // Persisted as the selectable record; actual process env switch happens on
    // redeploy/restart (documented). Never accept secrets or arbitrary URLs.
    let saved: unknown = null;
    try {
      if (body.provider && body.model) {
        saved = await prisma.providerConfig.upsert({
          where: { provider_model: { provider: body.provider, model: body.model } },
          create: { provider: body.provider, model: body.model, isActive: true, updatedBy: "admin-api" },
          update: { isActive: true, updatedBy: "admin-api" },
        });
      }
    } catch { saved = null; }
    await prisma.auditLog.create({
      data: { action: "ai-config.update", requestId: req.requestId, summary: body as unknown as object },
    }).catch(() => undefined);
    res.json({
      data: { saved, effectiveNow: { provider: env.AI_PROVIDER, model: env.AI_MODEL }, note: "Restart with updated AI_PROVIDER/AI_MODEL env to take effect." },
      requestId: req.requestId,
    });
  })
);

/** GET /admin/usage — usage, latency, errors, cost estimates. */
router.get(
  "/usage",
  requirePermission(PERMISSIONS.USAGE_READ),
  asyncHandler(async (req, res) => {
    try {
      const [total, byProvider, recentErrors] = await Promise.all([
        prisma.usageLog.count(),
        prisma.usageLog.groupBy({ by: ["provider", "model"], _count: { _all: true } }),
        prisma.usageLog.findMany({ where: { status: { not: "OK" } }, orderBy: { createdAt: "desc" }, take: 20 }),
      ]);
      res.json({ data: { total, byProvider, recentErrors }, requestId: req.requestId });
    } catch {
      res.json({ data: { total: 0, byProvider: [], recentErrors: [] }, requestId: req.requestId });
    }
  })
);

/** GET /admin/feedback — review reported answers. */
router.get(
  "/feedback",
  requirePermission(PERMISSIONS.FEEDBACK_MODERATE),
  asyncHandler(async (req, res) => {
    try {
      const items = await prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
      res.json({ data: items, requestId: req.requestId });
    } catch {
      res.json({ data: [], requestId: req.requestId });
    }
  })
);

/** GET /admin/audit-logs — admin actions. */
router.get(
  "/audit-logs",
  requirePermission(PERMISSIONS.AUDIT_READ),
  asyncHandler(async (req, res) => {
    try {
      const items = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
      res.json({ data: items, requestId: req.requestId });
    } catch {
      res.json({ data: [], requestId: req.requestId });
    }
  })
);

export default router;
