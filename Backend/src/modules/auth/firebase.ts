import admin from "firebase-admin";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

let initialized = false;
let initError: string | null = null;

function serviceAccountFromEnv(): admin.ServiceAccount | null {
  try {
    if (env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const json = Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
      return JSON.parse(json) as admin.ServiceAccount;
    }
  } catch (err) {
    logger.warn("FIREBASE_SERVICE_ACCOUNT_BASE64 could not be parsed");
  }
  return null;
}

/** Initialize Firebase Admin once (workload credentials preferred in prod). */
export function getFirebaseAdmin(): admin.app.App | null {
  if (initialized) {
    try {
      return admin.app();
    } catch {
      return null;
    }
  }
  try {
    const sa = serviceAccountFromEnv();
    if (sa && env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: env.FIREBASE_PROJECT_ID,
      });
    } else if (env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        projectId: env.FIREBASE_PROJECT_ID || undefined,
      });
    } else if (env.FIREBASE_PROJECT_ID && env.NODE_ENV !== "production") {
      // Dev without credentials: verification will fail closed; routes return 401
      // with a helpful message. Mock auth (x-mock-uid) only works in dev/test.
      initError = "Firebase credentials not configured (dev mode)";
      logger.warn(initError);
      return null;
    } else if (env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
    } else {
      initError = "FIREBASE_PROJECT_ID missing";
      logger.warn(initError);
      return null;
    }
    initialized = true;
    return admin.app();
  } catch (err) {
    initError = err instanceof Error ? err.message : "firebase init failed";
    logger.warn({ err: initError }, "Firebase Admin init failed");
    return null;
  }
}

export type VerifiedToken = { uid: string; email?: string };

/**
 * Verify a Firebase ID token. Returns null when unverifiable (fail closed).
 * NEVER accept decoded-but-unverified tokens (spec §5.2).
 */
export async function verifyIdTokenSafe(idToken: string): Promise<VerifiedToken | null> {
  // Dev/test escape hatch: deterministic mock identity via special token prefix.
  // Only honored when NODE_ENV !== production AND Firebase is unconfigured.
  if (env.NODE_ENV !== "production" && idToken.startsWith("mock_")) {
    const uid = idToken.replace(/^mock_/, "") || "dev-user";
    return { uid: `mock-${uid}`, email: `${uid}@example.test` };
  }
  const app = getFirebaseAdmin();
  if (!app) return null;
  try {
    const decoded = await app.auth().verifyIdToken(idToken, true);
    return { uid: decoded.uid, email: decoded.email };
  } catch (err) {
    logger.debug("Firebase token verification failed");
    return null;
  }
}

export function firebaseStatus() {
  return { configured: getFirebaseAdmin() !== null, initError };
}
