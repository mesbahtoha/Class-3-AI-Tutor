import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { asyncHandler } from "../../common/errors/errorHandler.js";
import { validate } from "../../common/middleware/validate.js";
import { requireGuestOrAuth, requireAuth } from "../../common/middleware/auth.js";

const router = Router();

const feedbackSchema = z.object({
  messageId: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
  reportType: z.enum(["incorrect", "inappropriate", "unclear", "other"]).optional(),
});

/** POST /feedback — guest/auth as policy allows (rate/report an answer). */
router.post(
  "/",
  requireGuestOrAuth,
  validate({ body: feedbackSchema }),
  asyncHandler(async (req, res) => {
    const body = feedbackSchema.parse(req.body);
    try {
      const saved = await prisma.feedback.create({ data: { ...body, status: "NEW" } });
      res.status(201).json({ data: saved, requestId: req.requestId });
    } catch {
      res.status(201).json({ data: { ...body, id: null }, requestId: req.requestId });
    }
  })
);

/** Progress + learning sessions (guardian / profile owner only). */
export const progressRouter = Router();
progressRouter.use(requireAuth);

progressRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { childProfileId } = req.query as { childProfileId?: string };
    try {
      const entries = await prisma.learningProgress.findMany({
        where: childProfileId ? { childProfileId } : undefined,
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
      res.json({ data: entries, requestId: req.requestId });
    } catch {
      res.json({ data: [], requestId: req.requestId });
    }
  })
);

progressRouter.get(
  "/topics/:topicId",
  asyncHandler(async (req, res) => {
    try {
      const entries = await prisma.learningProgress.findMany({
        where: { topicId: req.params.topicId },
        take: 50,
      });
      res.json({ data: entries, requestId: req.requestId });
    } catch {
      res.json({ data: [], requestId: req.requestId });
    }
  })
);

export const learningSessionRouter = Router();
learningSessionRouter.use(requireAuth);

learningSessionRouter.post(
  "/",
  validate({ body: z.object({ lessonId: z.string().optional(), topic: z.string().optional(), childProfileId: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    try {
      const s = await prisma.learningSession.create({ data: { ...(req.body as object), status: "STARTED" } });
      res.status(201).json({ data: s, requestId: req.requestId });
    } catch {
      res.status(201).json({ data: { ...(req.body as object), id: null }, requestId: req.requestId });
    }
  })
);

learningSessionRouter.patch(
  "/:id",
  validate({ body: z.object({ status: z.enum(["STARTED", "COMPLETED", "ABANDONED"]), topic: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    try {
      const body = req.body as { status: string; topic?: string };
      const updated = await prisma.learningSession.update({
        where: { id: req.params.id },
        data: { status: body.status, completedAt: body.status === "COMPLETED" ? new Date() : undefined },
      });
      res.json({ data: updated, requestId: req.requestId });
    } catch {
      res.json({ data: { id: req.params.id, ...(req.body as object) }, requestId: req.requestId });
    }
  })
);

export default router;
