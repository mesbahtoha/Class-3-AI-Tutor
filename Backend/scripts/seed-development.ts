import { prisma } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";

/** Dev seed: curriculum + subject + mock provider config (idempotent). */
async function main() {
  const curriculum = await prisma.curriculum.upsert({
    where: { name_track: { name: "NCTB Class 3", track: "NCTB" } },
    create: { name: "NCTB Class 3", track: "NCTB", locale: "bn-BD", isActive: true },
    update: {},
  });
  for (const subject of ["Bangla", "English", "Mathematics"]) {
    await prisma.subject.upsert({
      where: { curriculumId_name: { curriculumId: curriculum.id, name: subject } },
      create: { curriculumId: curriculum.id, name: subject, isActive: true },
      update: {},
    });
  }
  await prisma.providerConfig.upsert({
    where: { provider_model: { provider: "mock", model: "mock-tutor-v1" } },
    create: { provider: "mock", model: "mock-tutor-v1", isActive: true, capabilities: ["text", "structured-json"] },
    update: {},
  });
  logger.info("Dev seed complete");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  logger.error(String(e));
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
