import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject, ZodTypeAny } from "zod";
import { AppError } from "../errors/AppError.js";

type Schemas = {
  body?: AnyZodObject | ZodTypeAny;
  query?: AnyZodObject | ZodTypeAny;
  params?: AnyZodObject | ZodTypeAny;
};

/** Zod validation for body/query/params. Replaces req values with parsed output. */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query ?? {});
        Object.defineProperty(req, "query", { value: parsed, writable: true, configurable: true });
      }
      if (schemas.params) req.params = schemas.params.parse(req.params ?? {}) as typeof req.params;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Enforce JSON body size already handled by express.json limit; helper for 413. */
export function payloadTooLarge(message: string): AppError {
  return new AppError("PAYLOAD_TOO_LARGE", message);
}
