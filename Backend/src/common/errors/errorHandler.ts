import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "./AppError.js";
import { logger } from "../../config/logger.js";

/** Wrap async route handlers; forward rejections to the error middleware. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Central error middleware — consistent envelope, no secret/stack leaks. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as unknown as { requestId?: string }).requestId ?? "req_unknown";

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request.",
        requestId,
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.status >= 500) logger.error({ err, requestId, code: err.code }, "Operational error");
    res.status(err.status).json({
      error: { code: err.code, message: err.message, requestId },
    });
    return;
  }

  logger.error({ err, requestId }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
      requestId,
    },
  });
}

/** 404 for unknown /api routes. */
export function notFoundHandler(req: Request, res: Response) {
  const requestId = (req as unknown as { requestId?: string }).requestId ?? "req_unknown";
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route not found: ${req.method} ${req.path}`, requestId },
  });
}
