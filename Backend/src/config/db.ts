import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";
import { env } from "./env.js";

/**
 * Prisma client singleton. NeonDB (PostgreSQL + pgvector).
 * - Runtime uses DATABASE_URL (Neon pooled -pooler host recommended).
 * - Migrations use DIRECT_URL (Neon direct host).
 * pgvector ops use reviewed raw SQL via $queryRaw/$executeRaw (see migrations).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown db error";
    logger.warn({ err: message }, "Database health check failed");
    return { ok: false, latencyMs: Date.now() - start, error: "database_unreachable" };
  }
}
