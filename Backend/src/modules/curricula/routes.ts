import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { asyncHandler } from "../../common/errors/errorHandler.js";
import { validate } from "../../common/middleware/validate.js";

const router = Router();

/** GET /curricula — public list of active curricula. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const items = await prisma.curriculum.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      res.json({ data: items, requestId: req.requestId });
    } catch {
      res.json({ data: [], requestId: req.requestId, meta: { dbUnconfigured: true } });
    }
  })
);

export const createCurriculumSchema = z.object({
  name: z.string().min(1).max(120),
  track: z.string().default("NCTB"),
  locale: z.string().default("bn-BD"),
  isActive: z.boolean().default(true),
});

export function mountAdminCurriculumRoutes(admin: Router) {
  admin.post(
    "/curricula",
    validate({ body: createCurriculumSchema }),
    asyncHandler(async (req, res) => {
      const created = await prisma.curriculum.create({ data: req.body });
      res.status(201).json({ data: created, requestId: req.requestId });
    })
  );
}

export default router;
