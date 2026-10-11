import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { storage } from "../../modules/media/storage.js";
import { embedText, toPgVectorLiteral } from "../../modules/embeddings/adapter.js";
import { sha256Hex, chunkText } from "../../common/utils/text.js";

/**
 * Book ingestion pipeline (spec §6.3):
 * extract → page-map → chunk (+metadata) → embed → index → validate.
 * Must not hold a DB transaction open across external AI calls.
 */

// pdf-parse types are loose; dynamic import keeps worker boot fast.
async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  try {
    const mod = await import("pdf-parse");
    const parse = (mod as unknown as { default: (b: Buffer) => Promise<{ text: string; numpages: number }> }).default;
    const out = await parse(buffer);
    return { text: out.text ?? "", pages: out.numpages ?? 1 };
  } catch (err) {
    logger.warn({ err: String(err) }, "pdf-parse failed, treating as scanned/OCR-needed");
    return { text: "", pages: 0 };
  }
}

/** Split page-ish text into page records (best-effort when PDF has no markers). */
function splitIntoPages(fullText: string, maxPages: number): Array<{ n: number; text: string }> {
  const FORM_FEED = fullText.split("\f").map((s) => s.trim()).filter(Boolean);
  let pages: string[] = FORM_FEED.length > 1 ? FORM_FEED : [];
  if (pages.length === 0) {
    // Heuristic: ~1800 chars/page for preview + page mapping.
    const size = 1800;
    for (let i = 0; i < fullText.length; i += size) pages.push(fullText.slice(i, i + size));
  }
  if (pages.length === 0) pages = [""];
  return pages.slice(0, maxPages).map((text, i) => ({ n: i + 1, text }));
}

export async function processBookIngestion(bookId: string, jobIdLabel = "inline"): Promise<void> {
  const started = Date.now();
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw new Error(`Book ${bookId} not found`);

  const job = await prisma.ingestionJob.create({
    data: {
      bookId,
      status: "RUNNING",
      progress: 5,
      idempotencyKey: `ingest-${bookId}-${started}`,
      jobLog: `started ${jobIdLabel}\n`,
    },
  });

  const appendLog = async (line: string, progress?: number) => {
    try {
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          jobLog: { set: undefined },
          ...(progress !== undefined ? { progress } : {}),
        },
      });
      // Append via raw update to avoid overwriting concurrent writes.
      await prisma.$executeRaw`UPDATE "ingestion_jobs" SET "jobLog" = COALESCE("jobLog",'') || ${line + "\n"} WHERE id = ${job.id}`;
    } catch { /* best effort */ }
  };

  try {
    await prisma.book.update({ where: { id: bookId }, data: { processingStatus: "PROCESSING" } });

    if (!book.storageKey) throw new Error("Book has no storageKey");
    const bytes = await storage().get(book.storageKey);
    await appendLog(`fetched original (${bytes.length} bytes)`, 15);

    // 1) Extract
    let fullText = "";
    let detectedPages = 0;
    if ((book.mimeType ?? "").includes("text") || book.storageKey.endsWith(".txt")) {
      fullText = bytes.toString("utf8");
      detectedPages = 1;
    } else {
      const extracted = await extractPdfText(bytes);
      fullText = extracted.text;
      detectedPages = extracted.pages;
    }
    if (fullText.trim().length < 50) {
      await appendLog("WARNING: very little extractable text (scanned PDF? OCR adapter required for full quality)");
    }
    if (detectedPages > env.MAX_BOOK_PDF_PAGES) {
      throw new Error(`PDF page count ${detectedPages} exceeds MAX_BOOK_PDF_PAGES=${env.MAX_BOOK_PDF_PAGES}`);
    }

    // 2) Page mapping — replace previous pages for idempotent re-index.
    const pages = splitIntoPages(fullText, env.MAX_BOOK_PDF_PAGES);
    await prisma.bookPage.deleteMany({ where: { bookId } });
    for (const p of pages) {
      await prisma.bookPage.create({
        data: {
          bookId,
          pageNumber: p.n,
          printedLabel: String(p.n),
          text: p.text.slice(0, 20000),
          extractionQuality: p.text.trim().length > 20 ? "ok" : "low-confidence",
        },
      });
    }
    await prisma.book.update({ where: { id: bookId }, data: { pageCount: pages.length } });
    await appendLog(`pages mapped: ${pages.length}`, 40);

    // 3) Chunk + embed + index (outside a single transaction).
    await prisma.documentChunk.deleteMany({ where: { bookId } });
    let chunkCount = 0;
    for (const p of pages) {
      const chunks = chunkText(p.text);
      for (const c of chunks) {
        if (!c.trim()) continue;
        const { vector, model } = await embedText(c);
        const hash = sha256Hex(`${bookId}:${p.n}:${c.slice(0, 200)}`);
        const literal = toPgVectorLiteral(vector);
        // Insert via raw SQL to write the pgvector column.
        await prisma.$executeRaw`
          INSERT INTO "document_chunks" (id, "bookId", "pageStart", "pageEnd", content, "contentHash", "embeddingModel", "embeddingVersion", embedding, "createdAt")
          VALUES (gen_random_uuid()::text, ${bookId}, ${p.n}, ${p.n}, ${c.slice(0, 8000)}, ${hash}, ${model}, 'v1', ${literal}::vector, now())
        `;
        chunkCount++;
      }
      await appendLog(`embedded page ${p.n}/${pages.length}`, 40 + Math.round((p.n / pages.length) * 45));
    }

    // 4) Validate
    const warnings: string[] = [];
    if (chunkCount === 0) warnings.push("no chunks produced");
    const emptyPages = pages.filter((p) => p.text.trim().length === 0).length;
    if (emptyPages > 0) warnings.push(`${emptyPages} empty pages`);

    await prisma.book.update({
      where: { id: bookId },
      data: {
        processingStatus: warnings.length > 0 ? "REVIEW_REQUIRED" : "READY_TO_PUBLISH",
        extractionNotes: warnings.length > 0 ? warnings.join("; ") : null,
      },
    });
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "SUCCEEDED", progress: 100, jobLog: undefined },
    });
    await prisma.$executeRaw`UPDATE "ingestion_jobs" SET "jobLog" = COALESCE("jobLog",'') || ${`done: ${chunkCount} chunks, warnings=[${warnings.join("|")}]`} WHERE id = ${job.id}`;
    logger.info({ bookId, chunkCount, ms: Date.now() - started }, "Ingestion succeeded");
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingestion failed";
    await prisma.book.update({ where: { id: bookId }, data: { processingStatus: "FAILED" } }).catch(() => undefined);
    await prisma.ingestionJob
      .update({
        where: { id: job.id },
        data: { status: "FAILED", errorCode: "INGESTION_ERROR", errorDetail: message.slice(0, 2000) },
      })
      .catch(() => undefined);
    logger.warn({ bookId, err: message }, "Ingestion failed");
    throw err;
  }
}
