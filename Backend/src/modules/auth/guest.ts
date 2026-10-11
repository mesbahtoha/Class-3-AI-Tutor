import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../../config/env.js";

const GUEST_PREFIX = "guest_";

export type GuestClaims = { sessionId: string; iat?: number; exp?: number };

/** Issue a short-lived server-signed guest token (never trust client guestId). */
export function issueGuestToken(sessionId?: string): { token: string; sessionId: string } {
  const sid = sessionId ?? `gs_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const ttlHours = env.GUEST_SESSION_TTL_HOURS;
  const token =
    GUEST_PREFIX +
    jwt.sign({ sessionId: sid }, env.GUEST_JWT_SECRET, { expiresIn: `${ttlHours}h` });
  return { token, sessionId: sid };
}

/** Verify server-signed guest token; null when invalid/expired. */
export function verifyGuestToken(token: string): GuestClaims | null {
  try {
    const raw = token.startsWith(GUEST_PREFIX) ? token.slice(GUEST_PREFIX.length) : token;
    const decoded = jwt.verify(raw, env.GUEST_JWT_SECRET) as GuestClaims;
    if (!decoded?.sessionId) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function guestExpiryDate(): Date {
  return new Date(Date.now() + env.GUEST_SESSION_TTL_HOURS * 3600 * 1000);
}
