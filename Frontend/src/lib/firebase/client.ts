"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getEnv } from "@/lib/env";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/** Firebase client (Auth only). Missing config → auth UI shows setup state. */
export function firebaseApp(): FirebaseApp | null {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_FIREBASE_API_KEY || !env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return null;
  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp({
        apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
    } else {
      app = getApps()[0] ?? null;
    }
  }
  return app;
}

export function firebaseAuth(): Auth | null {
  const a = firebaseApp();
  if (!a) return null;
  if (!auth) auth = getAuth(a);
  return auth;
}
