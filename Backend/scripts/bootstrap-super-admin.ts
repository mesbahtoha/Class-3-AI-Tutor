import { prisma } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { logger } from "../src/config/logger.js";
import { getFirebaseAdmin } from "../src/modules/auth/firebase.js";

/**
 * Super-admin bootstrap (spec §5.5): server-side ONLY.
 * Usage: BOOTSTRAP_FIREBASE_UID=... BOOTSTRAP_ADMIN_EMAIL=... npm run bootstrap:admin
 * - Verifies the Firebase user exists (when credentials configured).
 * - Idempotent: creates/updates local user → SUPER_ADMIN.
 * - Refuses unsafe/ambiguous inputs; every run is audit-logged.
 */
async function main() {
  const uid = env.BOOTSTRAP_FIREBASE_UID?.trim();
  const email = env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  if (!uid) {
    logger.error("BOOTSTRAP_FIREBASE_UID is required. See Backend/README.md.");
    process.exit(1);
  }

  const admin = getFirebaseAdmin();
  if (admin) {
    try {
      const fbUser = await admin.auth().getUser(uid);
      logger.info({ uid, emailVerified: fbUser.emailVerified }, "Verified Firebase user exists");
      if (email && fbUser.email && fbUser.email.toLowerCase() !== email.toLowerCase()) {
        logger.error("BOOTSTRAP_ADMIN_EMAIL does not match Firebase user email — refusing (ambiguous input).");
        process.exit(1);
      }
    } catch (err) {
      logger.error({ err: String(err) }, "Firebase user lookup failed — refusing bootstrap");
      process.exit(1);
    }
  } else {
    logger.warn("Firebase Admin unconfigured — bootstrapping by UID only (dev). Production requires Firebase verification.");
    if (env.NODE_ENV === "production") {
      logger.error("Refusing bootstrap in production without Firebase verification.");
      process.exit(1);
    }
  }

  const user = await prisma.user.upsert({
    where: { firebaseUid: uid },
    create: { firebaseUid: uid, email: email || undefined, role: "SUPER_ADMIN", status: "ACTIVE" },
    update: { role: "SUPER_ADMIN", status: "ACTIVE", ...(email ? { email } : {}) },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "admin.bootstrap", target: user.id, summary: { role: "SUPER_ADMIN" } },
  });
  logger.info({ userId: user.id, uid }, "Super admin bootstrap complete (idempotent)");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  logger.error({ err: String(err) }, "Bootstrap failed");
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
