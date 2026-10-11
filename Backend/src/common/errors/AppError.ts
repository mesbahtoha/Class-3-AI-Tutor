/** Standard application error with stable code + HTTP status (spec §11.1). */
export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "UNSUPPORTED_CAPABILITY"
  | "PROVIDER_ERROR"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_RATE_LIMITED"
  | "EMBEDDING_ERROR"
  | "OCR_ERROR"
  | "STT_ERROR"
  | "TTS_ERROR"
  | "INGESTION_ERROR"
  | "INSUFFICIENT_BOOK_CONTEXT"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PROVIDER_RATE_LIMITED: 429,
  QUOTA_EXCEEDED: 429,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNSUPPORTED_CAPABILITY: 422,
  INSUFFICIENT_BOOK_CONTEXT: 422,
  PROVIDER_ERROR: 502,
  PROVIDER_TIMEOUT: 504,
  EMBEDDING_ERROR: 502,
  OCR_ERROR: 502,
  STT_ERROR: 502,
  TTS_ERROR: 502,
  INGESTION_ERROR: 500,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly isOperational = true;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS_BY_CODE[code] ?? 500;
    this.details = details;
  }
}

export const errors = {
  badRequest: (msg = "Bad request.", details?: unknown) => new AppError("BAD_REQUEST", msg, details),
  unauthorized: (msg = "Authentication required.") => new AppError("UNAUTHORIZED", msg),
  forbidden: (msg = "You do not have permission.") => new AppError("FORBIDDEN", msg),
  notFound: (msg = "Not found.") => new AppError("NOT_FOUND", msg),
  conflict: (msg = "Conflict.") => new AppError("CONFLICT", msg),
  rateLimited: (msg = "Please try again shortly.") => new AppError("RATE_LIMITED", msg),
  quotaExceeded: (msg = "Daily usage limit reached. Please try again tomorrow.") =>
    new AppError("QUOTA_EXCEEDED", msg),
  tooLarge: (msg = "File too large.") => new AppError("PAYLOAD_TOO_LARGE", msg),
  unsupportedMedia: (msg = "Unsupported file type.") => new AppError("UNSUPPORTED_MEDIA_TYPE", msg),
  unsupportedCapability: (msg = "This capability is not supported by the configured model.") =>
    new AppError("UNSUPPORTED_CAPABILITY", msg),
  provider: (msg = "AI provider error. Please try again shortly.") =>
    new AppError("PROVIDER_ERROR", msg),
  internal: (msg = "Something went wrong. Please try again.") =>
    new AppError("INTERNAL_ERROR", msg),
};
