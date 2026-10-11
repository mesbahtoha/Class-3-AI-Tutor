import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../common/errors/errorHandler.js";
import { validate } from "../../common/middleware/validate.js";
import { requirePermission } from "../../common/middleware/auth.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { AppError } from "../../common/errors/AppError.js";
import { storage, BOOK_NAMESPACE } from "../media/storage.js";
import { sha256Hex, safeFileKey } from "../../common/utils/text.js";
import { enqueueIngestion } from "../../jobs/queues.js";
import { buildPagination } from "../../common/utils/pagination.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
});

export const createBookSchema = z.object({
  title: z.string().min(1).max(300),
  grade: z.string().default("Class 3"),
  curriculumId: z.string().optional(),
  curriculumName: z.string().default("NCTB"),
  subjectId: z.string().optional(),
  subjectName: z.string().default(""),
  language: z.string().default("bn"),
  editionYear: z.string().optional(),
  editionLabel: z.string().optional(),
  publisher: z.string().optional(),
  sourceUrl: z.string().optional(),
  rightsStatus: z.string().optional(),
});

const ALLOWED_BOOK_MIME = ["application/pdf", "text/plain"];
const ALLOWED_BOOK_EXT = [".pdf", ".txt"];

/** Public discovery — published books only (never expose source PDFs). */
export function publicBookRoutes(): Router {
  const r = Router();
  r.get(
    "/",
    asyncHandler(async (req, res) => {
      const { curriculum, subject, grade } = req.query as Record<string, string | undefined>;
      try {
        const books = await prisma.book.findMany({
          where: {
            publicationStatus: "PUBLISHED",
            processingStatus: "PUBLISHED",
            isDeleted: false,
            ...(grade ? { grade } : {}),
            ...(curriculum ? { curriculumName: curriculum } : {}),
            ...(subject ? { subjectName: subject } : {}),
          },
          select: {
            id: true, title: true, grade: true, curriculumName: true, subjectName: true,
            language: true, editionYear: true, editionLabel: true, pageCount: true, updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 100,
        });
        res.json({ data: books, requestId: req.requestId });
      } catch {
        res.json({ data: [], requestId: req.requestId, meta: { dbUnconfigured: true } });
      }
    })
  );

  r.get(
    "/:id",
    asyncHandler(async (req, res) => {
      try {
        const book = await prisma.book.findFirst({
          where: { id: req.params.id, publicationStatus: "PUBLISHED", isDeleted: false },
          select: {
            id: true, title: true, grade: true, curriculumName: true, subjectName: true,
            language: true, editionYear: true, editionLabel: true, publisher: true,
            pageCount: true, processingStatus: true, updatedAt: true,
          },
        });
        if (!book) throw new AppError("NOT_FOUND", "Book not found.");
        res.json({ data: book, requestId: req.requestId });
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError("NOT_FOUND", "Book not found.");
      }
    })
  );

  r.get(
    "/:id/chapters",
    asyncHandler(async (req, res) => {
      try {
        const chapters = await prisma.chapter.findMany({
          where: { bookId: req.params.id },
          orderBy: { order: "asc" },
        });
        res.json({ data: chapters, requestId: req.requestId });
      } catch {
        res.json({ data: [], requestId: req.requestId });
      }
    })
  );

  return r;
}

/** Admin book management — all routes require explicit permissions. */
export function adminBookRoutes(): Router {
  const r = Router();

  r.get(
    "/",
    requirePermission(PERMISSIONS.BOOK_READ_PUBLISHED),
    asyncHandler(async (req, res) => {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
      const total = await prisma.book.count({ where: { isDeleted: false } });
      const items = await prisma.book.findMany({
        where: { isDeleted: false },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      res.json({ data: items, pagination: buildPagination(page, pageSize, total), requestId: req.requestId });
    })
  );

  r.post(
    "/",
    requirePermission(PERMISSIONS.BOOK_CREATE),
    upload.single("file"),
    validate({ body: createBookSchema }),
    asyncHandler(async (req, res) => {
      const file = (req as unknown as { file?: Express.Multer.File }).file;
      if (!file) throw new AppError("BAD_REQUEST", "Attach a PDF/TXT via multipart field 'file'.");
      const lower = file.originalname.toLowerCase();
      const extOk = ALLOWED_BOOK_EXT.some((e) => lower.endsWith(e));
      const mimeOk = ALLOWED_BOOK_MIME.includes(file.mimetype) || lower.endsWith(".pdf");
      if (!extOk || !mimeOk) {
        throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Only PDF (and TXT where enabled) are accepted for books.");
      }
      // Validate PDF signature (not just extension/MIME).
      if (lower.endsWith(".pdf") && file.buffer.subarray(0, 5).toString() !== "%PDF-") {
        throw new AppError("UNSUPPORTED_MEDIA_TYPE", "File signature is not a valid PDF.");
      }

      const body = createBookSchema.parse(req.body);
      const ext = lower.endsWith(".txt") ? ".txt" : ".pdf";
      const key = safeFileKey(BOOK_NAMESPACE, file.originalname, ext);
      await storage().put(key, file.buffer, file.mimetype);
      const checksum = sha256Hex(file.buffer);

      const ownerUid = (req.auth as { uid?: string })?.uid ?? "admin";
      const book = await prisma.book.create({
        data: {
          ...body,
          storageKey: key,
          mimeType: file.mimetype,
          fileSize: BigInt(file.size),
          checksum,
          processingStatus: "UPLOADED",
          publicationStatus: "DRAFT",
          uploadedBy: ownerUid,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "book.create",
          target: book.id,
          requestId: req.requestId,
          summary: { title: book.title, storageKey: key },
        },
      });

      // Queue ingestion (non-blocking per spec §6.3).
      const job = await enqueueIngestion(book.id, { fileName: file.originalname });
      res.status(201).json({ data: { book, jobId: job.id }, requestId: req.requestId });
    })
  );

  r.get(
    "/:id",
    requirePermission(PERMISSIONS.BOOK_READ_PUBLISHED),
    asyncHandler(async (req, res) => {
      const book = await prisma.book.findUnique({
        where: { id: req.params.id },
        include: { chapters: { orderBy: { order: "asc" } }, ingestionJobs: { orderBy: { createdAt: "desc" }, take: 5 } },
      });
      if (!book) throw new AppError("NOT_FOUND", "Book not found.");
      res.json({ data: { ...book, fileSize: book.fileSize?.toString() }, requestId: req.requestId });
    })
  );

  r.get(
    "/:id/preview",
    requirePermission(PERMISSIONS.BOOK_READ_PUBLISHED),
    asyncHandler(async (req, res) => {
      const pages = await prisma.bookPage.findMany({
        where: { bookId: req.params.id },
        orderBy: { pageNumber: "asc" },
        take: 10,
      });
      const chunks = await prisma.documentChunk.findMany({
        where: { bookId: req.params.id },
        select: { id: true, pageStart: true, pageEnd: true, content: true, chapterId: true },
        take: 10,
      });
      res.json({ data: { pages, chunks }, requestId: req.requestId });
    })
  );

  r.patch(
    "/:id",
    requirePermission(PERMISSIONS.BOOK_UPDATE),
    asyncHandler(async (req, res) => {
      const schema = createBookSchema.partial();
      const patch = schema.parse(req.body);
      const updated = await prisma.book.update({ where: { id: req.params.id }, data: patch });
      await prisma.auditLog.create({
        data: { action: "book.update", target: updated.id, requestId: req.requestId, summary: patch },
      });
      res.json({ data: updated, requestId: req.requestId });
    })
  );

  const transition = (from: string[], to: "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED", action: string, perm: string) =>
    asyncHandler(async (req: import("express").Request, res: import("express").Response) => {
      const book = await prisma.book.findUnique({ where: { id: req.params.id } });
      if (!book) throw new AppError("NOT_FOUND", "Book not found.");
      if (!from.includes(book.processingStatus) && action === "book.publish") {
        throw new AppError("CONFLICT", `Book must be READY_TO_PUBLISH before publish (now ${book.processingStatus}).`);
      }
      const updated = await prisma.book.update({
        where: { id: book.id },
        data: {
          processingStatus: to === "PUBLISHED" ? "PUBLISHED" : to === "ARCHIVED" ? "ARCHIVED" : "UNPUBLISHED",
          publicationStatus: to === "PUBLISHED" ? "PUBLISHED" : to === "ARCHIVED" ? "ARCHIVED" : "UNPUBLISHED",
          ...(to === "PUBLISHED" ? { publishedBy: (req.auth as { uid?: string })?.uid } : {}),
        },
      });
      await prisma.auditLog.create({
        data: { action, target: book.id, requestId: req.requestId, summary: { to } },
      });
      res.json({ data: updated, requestId: req.requestId });
    });

  r.post("/:id/process", requirePermission(PERMISSIONS.BOOK_PROCESS), asyncHandler(async (req, res) => {
    const book = await prisma.book.findUnique({ where: { id: req.params.id } });
    if (!book) throw new AppError("NOT_FOUND", "Book not found.");
    const job = await enqueueIngestion(book.id, { manual: true });
    await prisma.book.update({ where: { id: book.id }, data: { processingStatus: "QUEUED" } });
    res.json({ data: { jobId: job.id }, requestId: req.requestId });
  }));

  r.post("/:id/publish", requirePermission(PERMISSIONS.BOOK_PUBLISH),
    transition(["READY_TO_PUBLISH", "UNPUBLISHED", "PUBLISHED"], "PUBLISHED", "book.publish", PERMISSIONS.BOOK_PUBLISH));
  r.post("/:id/unpublish", requirePermission(PERMISSIONS.BOOK_UNPUBLISH),
    transition(["PUBLISHED", "READY_TO_PUBLISH", "FAILED", "UNPUBLISHED"], "UNPUBLISHED", "book.unpublish", PERMISSIONS.BOOK_UNPUBLISH));
  r.post("/:id/reindex", requirePermission(PERMISSIONS.BOOK_REINDEX), asyncHandler(async (req, res) => {
    const book = await prisma.book.findUnique({ where: { id: req.params.id } });
    if (!book) throw new AppError("NOT_FOUND", "Book not found.");
    const job = await enqueueIngestion(book.id, { reindex: true });
    res.json({ data: { jobId: job.id }, requestId: req.requestId });
  }));
  r.post("/:id/archive", requirePermission(PERMISSIONS.BOOK_ARCHIVE),
    transition(["PUBLISHED", "UNPUBLISHED", "READY_TO_PUBLISH", "FAILED", "DRAFT" as never], "ARCHIVED", "book.archive", PERMISSIONS.BOOK_ARCHIVE));

  r.delete("/:id", requirePermission(PERMISSIONS.BOOK_DELETE), asyncHandler(async (req, res) => {
    const refs = await prisma.documentChunk.count({ where: { bookId: req.params.id } });
    if (refs > 0) {
      // Controlled deletion: archive instead of hard delete when chunks exist.
      await prisma.book.update({
        where: { id: req.params.id },
        data: { isDeleted: true, processingStatus: "ARCHIVED", publicationStatus: "ARCHIVED" },
      });
      res.json({ data: { archived: true, reason: "chunks_exist" }, requestId: req.requestId });
      return;
    }
    await prisma.book.delete({ where: { id: req.params.id } });
    res.json({ data: { deleted: true }, requestId: req.requestId });
  }));

  return r;
}

export default router;
