import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

/** Attach a stable request/correlation ID (req.requestId + x-request-id header). */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  const requestId =
    typeof incoming === "string" && incoming.length >= 8 && incoming.length <= 128
      ? incoming
      : `req_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  (req as unknown as { requestId: string }).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
