import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env, webOrigins } from "./config/env.js";
import { logger } from "./config/logger.js";
import { requestIdMiddleware } from "./common/middleware/requestId.js";
import { authOptional } from "./common/middleware/auth.js";
import { globalRateLimiter } from "./common/middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./common/errors/errorHandler.js";
import { openapiDocument } from "./docs/openapi.js";

import healthRoutes from "./modules/health/routes.js";
import authRoutes from "./modules/auth/routes.js";
import tutorRoutes from "./modules/tutor/routes.js";
import conversationRoutes from "./modules/conversations/routes.js";
import childProfileRoutes from "./modules/child-profiles/routes.js";
import curriculaRoutes from "./modules/curricula/routes.js";
import subjectsRoutes from "./modules/subjects/routes.js";
import { publicBookRoutes, adminBookRoutes } from "./modules/books/routes.js";
import voiceRoutes, { uploadsRouter } from "./modules/voice/routes.js";
import feedbackRoutes, { progressRouter, learningSessionRouter } from "./modules/feedback/routes.js";
import adminRoutes from "./modules/admin/routes.js";

export function createApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: (req as unknown as { requestId?: string }).requestId }),
      redact: ["req.headers.authorization", "req.headers.cookie"],
    })
  );
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // mobile / curl
        const allowed = webOrigins();
        if (allowed.includes("*") || allowed.includes(origin)) return cb(null, true);
        return cb(new Error("CORS blocked"), false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app.use(globalRateLimiter());
  app.use(authOptional());

  const base = env.API_BASE_PATH;

  // Public docs
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument as object));
  app.get("/openapi.json", (_req, res) => res.json(openapiDocument));

  // Health (unversioned + versioned for load balancers)
  app.use("/health", healthRoutes);
  app.use(`${base}/health`, healthRoutes);

  // Versioned API
  const v1 = express.Router();
  v1.use("/", authRoutes); // exposes POST /guest/session + GET /me + PATCH /me
  v1.use("/me/child-profiles", childProfileRoutes);
  v1.use("/tutor", tutorRoutes);
  v1.use("/conversations", conversationRoutes);
  v1.use("/curricula", curriculaRoutes);
  v1.use("/subjects", subjectsRoutes);
  v1.use("/books", publicBookRoutes());
  v1.use("/media", voiceRoutes);
  v1.use("/voice", voiceRoutes);
  v1.use("/uploads", uploadsRouter);
  v1.use("/feedback", feedbackRoutes);
  v1.use("/progress", progressRouter);
  v1.use("/learning-sessions", learningSessionRouter);
  v1.use("/admin/books", adminBookRoutes());
  v1.use("/admin", adminRoutes);

  app.use(base, v1);

  // Local storage dev serving (production uses S3 signed URLs; never public).
  if (env.STORAGE_PROVIDER === "local") {
    app.use("/api/v1/uploads/local", express.static(env.STORAGE_LOCAL_DIR, { dotfiles: "deny" }));
  }

  app.use(`${base}`, notFoundHandler as unknown as express.Handler);
  app.use(errorHandler as unknown as express.ErrorRequestHandler);
  return app;
}
