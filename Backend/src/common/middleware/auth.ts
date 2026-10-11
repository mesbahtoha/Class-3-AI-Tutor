import type { NextFunction, Request, Response } from "express";
import { getFirebaseAdmin, verifyIdTokenSafe } from "../../modules/auth/firebase.js";
import { AppError } from "../errors/AppError.js";
import type { Role } from "../../config/permissions.js";
import { hasPermission } from "../../config/permissions.js";
import { verifyGuestToken } from "../../modules/auth/guest.js";

export type AuthContext =
  | { kind: "firebase"; uid: string; email?: string; userId: string; role: Role }
  | { kind: "guest"; sessionId: string }
  | { kind: "none" };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  namespace Express {
    interface Request {
      requestId: string;
      auth: AuthContext;
    }
  }
}

/**
 * Optional auth: populates req.auth from Firebase ID token OR guest token.
 * Never throws for missing credentials — use requireAuth/requireGuestOrAuth.
 */
export function authOptional(prismaClient?: unknown) {
  void prismaClient;
  return async (req: Request, _res: Response, next: NextFunction) => {
    req.auth = { kind: "none" };
    const header = req.header("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) {
      next();
      return;
    }
    const token = (match[1] ?? "").trim();
    if (!token) {
      next();
      return;
    }

    // 1) Try guest session token first (prefix distinguishes it).
    if (token.startsWith("guest_")) {
      const guest = verifyGuestToken(token);
      if (guest) {
        req.auth = { kind: "guest", sessionId: guest.sessionId };
        next();
        return;
      }
    }

    // 2) Try Firebase ID token.
    try {
      const admin = getFirebaseAdmin();
      if (admin) {
        const decoded = await verifyIdTokenSafe(token);
        if (decoded) {
          // Map to local user lazily in route handlers via ensureLocalUser().
          req.auth = {
            kind: "firebase",
            uid: decoded.uid,
            email: decoded.email,
            userId: decoded.uid, // replaced with DB id by ensureLocalUser where needed
            role: "GUARDIAN",
          };
        }
      }
    } catch {
      // invalid token → remain anonymous; protected routes will 401
    }
    next();
  };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.kind !== "firebase") {
    next(new AppError("UNAUTHORIZED", "Sign in required."));
    return;
  }
  next();
}

export function requireGuestOrAuth(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.kind !== "firebase" && req.auth?.kind !== "guest") {
    next(new AppError("UNAUTHORIZED", "Sign in or start a guest session first."));
    return;
  }
  next();
}

/** Role/permission gate. Roles come from DB — never from request body. */
export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (auth?.kind !== "firebase") {
      next(new AppError("UNAUTHORIZED", "Sign in required."));
      return;
    }
    const role = (auth as { role?: Role }).role ?? "GUARDIAN";
    if (!hasPermission(role, permission)) {
      next(new AppError("FORBIDDEN", "You do not have permission for this action."));
      return;
    }
    next();
  };
}
