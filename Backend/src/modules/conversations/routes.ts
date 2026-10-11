import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { asyncHandler } from "../../common/errors/errorHandler.js";
import { validate } from "../../common/middleware/validate.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { AppError } from "../../common/errors/AppError.js";

const router = Router();
router.use(requireAuth);

async function ownedConversationOrThrow(conversationId: string, ownerUid: string) {
  try {
    // Resolve local user id from firebase uid (mock-aware).
    const user = await prisma.user.findUnique({ where: { firebaseUid: ownerUid } }).catch(() => null);
    const ownerId = user?.id ?? ownerUid;
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, ownerId, status: { not: "DELETED" } },
    });
    if (!conv) throw new AppError("NOT_FOUND", "Conversation not found.");
    return conv;
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Fail closed on DB outage: never leak internals, never grant access.
    throw new AppError("NOT_FOUND", "Conversation not found.");
  }
}

function firebaseUid(req: Request): string {
  const auth = req.auth;
  if (auth?.kind === "firebase") return auth.uid ?? auth.userId ?? "unknown";
  return "unknown";
}

/** GET /conversations — owner's list. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { firebaseUid: firebaseUid(req) } });
      if (!user) {
        res.json({ data: [], requestId: req.requestId });
        return;
      }
      const items = await prisma.conversation.findMany({
        where: { ownerId: user.id, status: { not: "DELETED" } },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: { _count: { select: { messages: true } } },
      });
      res.json({ data: items, requestId: req.requestId });
    } catch {
      res.json({ data: [], requestId: req.requestId });
    }
  })
);

/** GET /conversations/:id — owner only, with messages + stored citations. */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id ?? "";
    const conv = await ownedConversationOrThrow(id, firebaseUid(req));
    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
      include: { sources: true },
    });
    res.json({ data: { ...conv, messages }, requestId: req.requestId });
  })
);

router.patch(
  "/:id",
  validate({ body: z.object({ title: z.string().max(120).optional(), status: z.enum(["ACTIVE", "ARCHIVED"]).optional() }) }),
  asyncHandler(async (req, res) => {
    const id = req.params.id ?? "";
    const conv = await ownedConversationOrThrow(id, firebaseUid(req));
    const updated = await prisma.conversation.update({
      where: { id: conv.id },
      data: req.body as { title?: string; status?: "ACTIVE" | "ARCHIVED" },
    });
    res.json({ data: updated, requestId: req.requestId });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id ?? "";
    const conv = await ownedConversationOrThrow(id, firebaseUid(req));
    await prisma.conversation.update({ where: { id: conv.id }, data: { status: "DELETED" } });
    res.json({ data: { deleted: true }, requestId: req.requestId });
  })
);

export default router;
