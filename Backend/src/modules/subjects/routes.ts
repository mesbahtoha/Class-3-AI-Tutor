import { Router } from "express";
import { prisma } from "../../config/db.js";
import { asyncHandler } from "../../common/errors/errorHandler.js";

const router = Router();

/** GET /subjects — public list (published discovery). */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const items = await prisma.subject.findMany({
        where: { isActive: true },
        include: { curriculum: { select: { id: true, name: true, track: true } } },
        orderBy: { name: "asc" },
      });
      res.json({ data: items, requestId: req.requestId });
    } catch {
      res.json({ data: [], requestId: req.requestId, meta: { dbUnconfigured: true } });
    }
  })
);

export default router;
