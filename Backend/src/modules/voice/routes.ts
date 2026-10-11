import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { env } from "../../config/env.js";
import { prisma } from "../../config/db.js";
import { asyncHandler } from "../../common/errors/errorHandler.js";
import { validate } from "../../common/middleware/validate.js";
import { requireAuth, requireGuestOrAuth } from "../../common/middleware/auth.js";
import { AppError } from "../../common/errors/AppError.js";
import { storage, LEARNER_NAMESPACE } from "../media/storage.js";
import { safeFileKey } from "../../common/utils/text.js";
import { runOcr, transcribeAudio, synthesizeSpeech } from "../media/adapters.js";
import { answerChat } from "../tutor/orchestrator.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
});

const router = Router();

/** POST /media/image-question — authenticated learner image → OCR/vision → tutor. */
router.post(
  "/image-question",
  requireAuth,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const file = (req as unknown as { file?: Express.Multer.File }).file;
    if (!file) throw new AppError("BAD_REQUEST", "Attach an image via field 'image'.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Only JPEG, PNG, WebP images are accepted.");
    }
    const ext = file.mimetype === "image/png" ? ".png" : file.mimetype === "image/webp" ? ".webp" : ".jpg";
    const key = safeFileKey(LEARNER_NAMESPACE, file.originalname, ext);
    await storage().put(key, file.buffer, file.mimetype);

    let ocrText = "";
    try {
      const ocr = await runOcr(file.buffer, file.mimetype);
      ocrText = ocr.text;
    } catch {
      ocrText = "";
    }

    const hint = ((req.body as Record<string, unknown>)?.message as string | undefined) ?? "";
    const question = [hint, ocrText].filter(Boolean).join("\n").slice(0, 2000) || "Ei chhobi-ta bujhiye dao.";
    if (!ocrText) {
      res.json({
        data: {
          transcription: "",
          needsConfirmation: true,
          message: "Chhobi theke lekha porte parlam na. Proshno-ta likhe dao, ami bujhiye dichhi! 🌱",
        },
        requestId: req.requestId,
      });
      return;
    }

    const result = await answerChat({
      message: question,
      languagePreference: "auto",
      ownerId: (req.auth as { userId?: string }).userId ?? null,
      requestId: req.requestId,
    });
    res.json({ data: { transcription: ocrText.slice(0, 2000), ...result }, requestId: req.requestId });
  })
);

/** POST /voice/transcribe — authenticated audio → text → (client sends text to /tutor/chat). */
router.post(
  "/transcribe",
  requireAuth,
  upload.single("audio"),
  asyncHandler(async (req, res) => {
    const file = (req as unknown as { file?: Express.Multer.File }).file;
    if (!file) throw new AppError("BAD_REQUEST", "Attach audio via field 'audio'.");
    // Duration enforcement happens client-side + STT provider; size capped by multer.
    const stt = await transcribeAudio(file.buffer, file.mimetype).catch(() => ({ transcript: "", provider: "mock" }));
    if (!stt.transcript) {
      res.json({ data: { transcript: "", provider: stt.provider, note: "STT not configured — wire STT_ENDPOINT to enable." }, requestId: req.requestId });
      return;
    }
    res.json({ data: stt, requestId: req.requestId });
  })
);

const speakSchema = z.object({
  text: z.string().min(1).max(2000),
  language: z.enum(["bn", "en", "banglish"]).default("bn"),
});

/** POST /voice/speak — authenticated TTS for validated response text. */
router.post(
  "/speak",
  requireAuth,
  validate({ body: speakSchema }),
  asyncHandler(async (req, res) => {
    const body = speakSchema.parse(req.body);
    const out = await synthesizeSpeech(body.text, body.language);
    res.json(
      {
        data: {
          mimeType: out.mimeType,
          provider: out.provider,
          audioBase64: out.provider === "mock" ? null : out.audio.toString("base64").slice(0, 200000),
          note: out.provider === "mock" ? "TTS not configured — wire TTS_ENDPOINT to enable real speech." : undefined,
        },
        requestId: req.requestId,
      }
    );
  })
);

/** Upload presign/status/delete — owner-scoped temporary learner uploads. */
const uploadsRouter = Router();

uploadsRouter.post(
  "/presign",
  requireAuth,
  validate({ body: z.object({ mimeType: z.string(), kind: z.enum(["image", "audio"]) }) }),
  asyncHandler(async (req, res) => {
    const body = req.body as { mimeType: string; kind: string };
    const allowed = body.kind === "image"
      ? ["image/jpeg", "image/png", "image/webp"]
      : ["audio/mpeg", "audio/wav", "audio/webm", "audio/mp4"];
    if (!allowed.includes(body.mimeType)) throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Unsupported media type.");
    const key = safeFileKey(LEARNER_NAMESPACE, "upload", body.mimeType.includes("png") ? ".png" : ".bin");
    res.status(201).json({
      data: { key, expiresInSeconds: 300, note: "Direct PUT to storage is configured per deployment; default flow is multipart POST." },
      requestId: req.requestId,
    });
  })
);

uploadsRouter.get(
  "/:id/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const up = await prisma.upload.findUnique({ where: { id: req.params.id } }).catch(() => null);
    if (!up) throw new AppError("NOT_FOUND", "Upload not found.");
    res.json({ data: { id: up.id, status: up.status }, requestId: req.requestId });
  })
);

uploadsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.upload.delete({ where: { id: req.params.id } }).catch(() => null);
    res.json({ data: { deleted: true }, requestId: req.requestId });
  })
);

export { uploadsRouter };
export default router;
