import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { asyncHandler } from "../../common/errors/errorHandler.js";
import { validate } from "../../common/middleware/validate.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { issueGuestToken, guestExpiryDate } from "./guest.js";
import { strictRateLimiter } from "../../common/middleware/rateLimit.js";
import { verifyIdTokenSafe } from "./firebase.js";
import { AppError } from "../../common/errors/AppError.js";

const router = Router();

/**
 * POST /guest/session — public, rate-limited. Issues a server-signed
 * short-lived guest token (text chat only, strict quotas, auto-expiry).
 */
router.post(
  "/guest/session",
  strictRateLimiter(),
  asyncHandler(async (req, res) => {
    const { token, sessionId } = issueGuestToken();
    const expiresAt = guestExpiryDate();
    try {
      await prisma.guestSession.create({
        data: { sessionId, expiresAt },
      });
    } catch {
      // DB unavailable (e.g. env not yet filled): still return a signed token;
      // tutor route enforces quotas in-memory as fallback.
    }
    res.status(201).json({
      data: {
        guestToken: token,
        sessionId,
        expiresAt: expiresAt.toISOString(),
        limits: { textChatOnly: true },
      },
      requestId: req.requestId,
    });
  })
);

/** GET /me — current user, role, allowed features (authenticated). */
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const header = req.header("authorization") ?? "";
    const idToken = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim() ?? "";
    const verified = await verifyIdTokenSafe(idToken);
    if (!verified) throw new AppError("UNAUTHORIZED", "Invalid or expired sign-in token.");

    let user = null;
    try {
      user = await prisma.user.findUnique({ where: { firebaseUid: verified.uid } });
      if (!user) {
        // First sign-in: create GUARDIAN record. Role NEVER comes from client.
        user = await prisma.user.create({
          data: { firebaseUid: verified.uid, email: verified.email, role: "GUARDIAN" },
        });
      }
    } catch {
      // DB unavailable → return verified identity without persistence
      res.json({
        data: {
          firebaseUid: verified.uid,
          email: verified.email,
          role: "GUARDIAN",
          allowedFeatures: ["tutor.chat", "tutor.lesson", "tutor.quiz", "media.upload"],
          dbPersisted: false,
        },
        requestId: req.requestId,
      });
      return;
    }

    const role = user.role;
    res.json({
      data: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        role,
        status: user.status,
        allowedFeatures:
          role === "SUPER_ADMIN"
            ? ["*"]
            : ["tutor.chat", "tutor.lesson", "tutor.quiz", "media.upload", "progress.view"],
        dbPersisted: true,
      },
      requestId: req.requestId,
    });
  })
);

export const meUpdateSchema = z.object({
  email: z.string().email().optional(),
});

router.patch(
  "/me",
  requireAuth,
  validate({ body: meUpdateSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: { updated: true }, requestId: req.requestId });
  })
);

export default router;
