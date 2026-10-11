import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { asyncHandler } from "../../common/errors/errorHandler.js";
import { validate } from "../../common/middleware/validate.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { verifyIdTokenSafe } from "../auth/firebase.js";
import { AppError } from "../../common/errors/AppError.js";

const router = Router();
router.use(requireAuth);

const createChildSchema = z.object({
  nickname: z.string().min(1).max(60),
  grade: z.string().default("Class 3"),
  curriculumId: z.string().optional(),
  preferredLanguage: z.enum(["bn", "en", "banglish", "auto"]).default("auto"),
});

async function ownerIdFor(req: { header(n: string): string | undefined }): Promise<string> {
  const idToken = /^Bearer\s+(.+)$/i.exec(req.header("authorization") ?? "")?.[1]?.trim() ?? "";
  const verified = await verifyIdTokenSafe(idToken);
  if (!verified) throw new AppError("UNAUTHORIZED", "Invalid token.");
  const user = await prisma.user.findUnique({ where: { firebaseUid: verified.uid } });
  if (!user) throw new AppError("UNAUTHORIZED", "Account not found. Call GET /me first.");
  return user.id;
}

/** POST /me/child-profiles (Guardian owns profiles; minimal data only). */
router.post(
  "/",
  validate({ body: createChildSchema }),
  asyncHandler(async (req, res) => {
    const ownerId = await ownerIdFor(req);
    const body = createChildSchema.parse(req.body);
    const created = await prisma.childProfile.create({
      data: {
        guardianUserId: ownerId,
        nickname: body.nickname,
        grade: body.grade,
        curriculumId: body.curriculumId,
        preferredLanguage: body.preferredLanguage,
      },
    });
    res.status(201).json({ data: created, requestId: req.requestId });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const ownerId = await ownerIdFor(req);
    const profiles = await prisma.childProfile.findMany({
      where: { guardianUserId: ownerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: profiles, requestId: req.requestId });
  })
);

const updateChildSchema = z.object({
  nickname: z.string().min(1).max(60).optional(),
  grade: z.string().optional(),
  curriculumId: z.string().nullable().optional(),
  preferredLanguage: z.enum(["bn", "en", "banglish", "auto"]).optional(),
});

router.patch(
  "/:id",
  validate({ body: updateChildSchema }),
  asyncHandler(async (req, res) => {
    const ownerId = await ownerIdFor(req);
    const existing = await prisma.childProfile.findFirst({
      where: { id: req.params.id, guardianUserId: ownerId, deletedAt: null },
    });
    if (!existing) throw new AppError("NOT_FOUND", "Child profile not found.");
    const updated = await prisma.childProfile.update({
      where: { id: existing.id },
      data: { ...(req.body as Record<string, unknown>) },
    });
    res.json({ data: updated, requestId: req.requestId });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const ownerId = await ownerIdFor(req);
    const existing = await prisma.childProfile.findFirst({
      where: { id: req.params.id, guardianUserId: ownerId, deletedAt: null },
    });
    if (!existing) throw new AppError("NOT_FOUND", "Child profile not found.");
    await prisma.childProfile.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    res.json({ data: { deleted: true }, requestId: req.requestId });
  })
);

export default router;
