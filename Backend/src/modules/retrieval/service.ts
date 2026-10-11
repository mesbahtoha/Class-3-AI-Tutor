import { prisma } from "../../config/db.js";
import { embedText, toPgVectorLiteral, cosineSimilarity } from "../embeddings/adapter.js";
import { queryVariants } from "../../common/utils/language.js";
import { env } from "../../config/env.js";

export type RetrievedChunk = {
  chunkId: string;
  bookId: string;
  bookTitle: string;
  edition?: string | null;
  chapterId?: string | null;
  chapterTitle?: string | null;
  pageStart: number | null;
  pageEnd?: number | null;
  content: string;
  score: number;
  source: "vector" | "keyword" | "hybrid";
};

export type RetrievalFilters = {
  bookId?: string;
  subjectId?: string;
  curriculum?: string;
  grade?: string;
};

/**
 * Multilingual hybrid retrieval (spec §7):
 * - candidate variants (original + normalized Banglish forms)
 * - pgvector cosine + PostgreSQL full-text/trigram keyword
 * - published-books-only filter, RRF fusion, bounded context
 * Falls back to in-memory scan when DB/pgvector unavailable (dev/test).
 */
export async function retrieveRelevantChunks(
  query: string,
  filters: RetrievalFilters = {},
  topK = 6
): Promise<{ chunks: RetrievedChunk[]; degraded: boolean }> {
  const variants = queryVariants(query);
  const primary = variants[0] ?? query;

  try {
    const { vector } = await embedText(variants.join(" "));
    const literal = toPgVectorLiteral(vector);

    const bookFilter = filters.bookId ? `AND c."bookId" = '${filters.bookId.replace(/'/g, "''")}'` : "";
    const gradeFilter = filters.grade ? `AND b.grade = '${filters.grade.replace(/'/g, "''")}'` : "";

    // Vector branch (pgvector cosine) + keyword branch (full-text + ILIKE for Banglish).
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT c.id AS "chunkId", c."bookId", b.title AS "bookTitle", b."editionLabel" AS edition,
              c."chapterId", ch.title AS "chapterTitle",
              c."pageStart", c."pageEnd", c.content,
              (1 - (c.embedding <=> $1::vector)) AS "vecScore",
              ts_rank_cd(c."searchTsv", plainto_tsquery('english', $2)) AS "kwScore"
         FROM "document_chunks" c
         JOIN "books" b ON b.id = c."bookId"
         LEFT JOIN "chapters" ch ON ch.id = c."chapterId"
        WHERE b."publicationStatus" = 'PUBLISHED'
          AND b."processingStatus" = 'PUBLISHED'
          AND b."isDeleted" = false
          ${bookFilter} ${gradeFilter}
          AND (c.embedding <=> $1::vector) < 0.9
        ORDER BY c.embedding <=> $1::vector
        LIMIT ${Math.max(topK * 3, 12)}`,
      literal,
      primary.slice(0, 500)
    )) as Array<Record<string, unknown>>;

    const kwRows = (await prisma.$queryRawUnsafe(
      `SELECT c.id AS "chunkId", c."bookId", b.title AS "bookTitle", b."editionLabel" AS edition,
              c."chapterId", ch.title AS "chapterTitle",
              c."pageStart", c."pageEnd", c.content
         FROM "document_chunks" c
         JOIN "books" b ON b.id = c."bookId"
         LEFT JOIN "chapters" ch ON ch.id = c."chapterId"
        WHERE b."publicationStatus" = 'PUBLISHED'
          AND b."processingStatus" = 'PUBLISHED'
          AND b."isDeleted" = false
          ${bookFilter} ${gradeFilter}
          AND (c."searchTsv" @@ plainto_tsquery('english', $1)
               OR c.content ILIKE '%' || SUBSTRING($1, 1, 60) || '%')
        LIMIT ${Math.max(topK * 2, 10)}`,
      primary.slice(0, 500)
    )) as Array<Record<string, unknown>>;

    // RRF fusion: vector rank + keyword rank.
    const K = 60;
    const fused = new Map<string, { row: Record<string, unknown>; score: number; source: RetrievedChunk["source"] }>();
    rows.forEach((row, i) => {
      const id = String(row.chunkId);
      const prev = fused.get(id);
      const s = 1 / (K + i + 1);
      fused.set(id, { row, score: (prev?.score ?? 0) + s, source: prev ? "hybrid" : "vector" });
    });
    kwRows.forEach((row, i) => {
      const id = String(row.chunkId);
      const prev = fused.get(id);
      const s = 1 / (K + i + 1);
      if (prev) fused.set(id, { row: prev.row, score: prev.score + s, source: "hybrid" });
      else fused.set(id, { row, score: s, source: "keyword" });
    });

    const chunks: RetrievedChunk[] = [...fused.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((f) => ({
        chunkId: String(f.row.chunkId),
        bookId: String(f.row.bookId),
        bookTitle: String(f.row.bookTitle ?? "Unknown book"),
        edition: (f.row.edition as string | null) ?? null,
        chapterId: (f.row.chapterId as string | null) ?? null,
        chapterTitle: (f.row.chapterTitle as string | null) ?? null,
        pageStart: (f.row.pageStart as number | null) ?? null,
        pageEnd: (f.row.pageEnd as number | null) ?? null,
        content: String(f.row.content ?? "").slice(0, 2000),
        score: f.score,
        source: f.source,
      }));

    return { chunks, degraded: false };
  } catch {
    // Degraded fallback: keyword scan over a small window (no vector).
    try {
      const all = await prisma.documentChunk.findMany({
        where: {
          book: { publicationStatus: "PUBLISHED", processingStatus: "PUBLISHED", isDeleted: false },
          ...(filters.bookId ? { bookId: filters.bookId } : {}),
        },
        include: { book: { select: { title: true, editionLabel: true } }, chapter: { select: { id: true, title: true } } },
        take: 200,
        orderBy: { createdAt: "desc" },
      });
      const terms = primary.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
      const scored = all
        .map((c) => {
          const hay = c.content.toLowerCase();
          let score = 0;
          for (const t of terms) if (hay.includes(t)) score += 1;
          return { c, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      return {
        chunks: scored.map((s) => ({
          chunkId: s.c.id,
          bookId: s.c.bookId,
          bookTitle: s.c.book.title,
          edition: s.c.book.editionLabel,
          chapterId: s.c.chapterId,
          chapterTitle: s.c.chapter?.title ?? null,
          pageStart: s.c.pageStart,
          pageEnd: s.c.pageEnd,
          content: s.c.content.slice(0, 2000),
          score: s.score,
          source: "keyword" as const,
        })),
        degraded: true,
      };
    } catch {
      return { chunks: [], degraded: true };
    }
  }
}

/** Confidence gate: insufficient retrieval → INSUFFICIENT_BOOK_CONTEXT (no invented citations). */
export function hasSufficientContext(chunks: RetrievedChunk[]): boolean {
  if (chunks.length === 0) return false;
  const top = chunks[0];
  if (!top) return false;
  // Hybrid RRF scores are small; any fused hit with content counts. Pure weak
  // single-source hits below threshold are treated as insufficient.
  if (chunks.length === 1 && top.source === "keyword" && top.score < 0.02) return false;
  void env;
  void cosineSimilarity;
  return true;
}
