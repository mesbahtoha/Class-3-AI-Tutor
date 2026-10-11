import { prisma } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";

/** Scheduled cleanup: expire guest sessions/conversations/uploads (see migration cleanup_expired_rows()). */
async function main() {
  try {
    await prisma.$executeRaw`SELECT cleanup_expired_rows()`;
    logger.info("TTL cleanup executed via cleanup_expired_rows()");
  } catch {
    // Fallback when migration helper missing (e.g. DB not migrated yet).
    const now = new Date();
    const [guests, convs] = await Promise.all([
      prisma.guestSession.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => ({ count: 0 })),
      prisma.conversation.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => ({ count: 0 })),
    ]);
    logger.info({ guests: guests.count, convs: convs.count }, "TTL cleanup (fallback) done");
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  logger.error(String(e));
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
