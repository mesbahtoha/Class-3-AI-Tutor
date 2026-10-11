"use client";

import { getEnv } from "@/lib/env";

/** Backend error envelope → friendly, child-safe copy. Keeps requestId for support. */
export interface FriendlyError {
  title: string;
  message: string;
  code: string;
  requestId?: string;
  retryable: boolean;
}

const COPY: Record<string, { title: string; message: string; retryable: boolean }> = {
  RATE_LIMITED: { title: "একটু থামো! ⏳", message: "এই মুহূর্তে Tutor ব্যস্ত। একটু পরে আবার চেষ্টা করো।", retryable: true },
  PROVIDER_RATE_LIMITED: { title: "Tutor ব্যস্ত ⏳", message: "AI এখন ব্যস্ত আছে। একটু পরে আবার চেষ্টা করো।", retryable: true },
  QUOTA_EXCEEDED: { title: "আজকের সীমা শেষ 📚", message: "আজকের প্রশ্নের সীমা শেষ। সাইন ইন করলে আরও প্রশ্ন করতে পারবে!", retryable: false },
  UNAUTHORIZED: { title: "সাইন ইন দরকার 🔑", message: "এই কাজের জন্য আগে সাইন ইন করো।", retryable: false },
  FORBIDDEN: { title: "অনুমতি নেই 🚫", message: "এই পাতাটা তোমার জন্য নয়।", retryable: false },
  NOT_FOUND: { title: "খুঁজে পাইনি 🔍", message: "যা খুঁজছিলে তা পাওয়া যায়নি।", retryable: false },
  VALIDATION_ERROR: { title: "ওহো! ✏️", message: "তথ্যগুলো ঠিক করে আবার চেষ্টা করো।", retryable: false },
  BAD_REQUEST: { title: "ওহো! ✏️", message: "অনুরোধটা ঠিক হয়নি। আবার চেষ্টা করো।", retryable: false },
  PAYLOAD_TOO_LARGE: { title: "ফাইলটা বড় 📦", message: "ফাইলটা অনেক বড়। ছোট ফাইল দিয়ে চেষ্টা করো।", retryable: false },
  UNSUPPORTED_MEDIA_TYPE: { title: "ফাইল চলবে না 📷", message: "এই ধরনের ফাইল নেওয়া হয় না।", retryable: false },
  UNSUPPORTED_CAPABILITY: { title: "এখনো আসেনি 🛠️", message: "এই সুবিধাটা এখনো চালু হয়নি।", retryable: false },
  PROVIDER_ERROR: { title: "Tutor বিশ্রামে 😴", message: "AI এখন উত্তর দিতে পারছে না। একটু পরে চেষ্টা করো।", retryable: true },
  PROVIDER_TIMEOUT: { title: "একটু দেরি হচ্ছে 🐢", message: "AI সময় নিচ্ছে। আবার চেষ্টা করো।", retryable: true },
  INSUFFICIENT_BOOK_CONTEXT: { title: "বইয়ে পাইনি 📖", message: "বইয়ের পাওয়া অংশ থেকে নিশ্চিত উত্তর দিতে পারছি না। অন্যভাবে প্রশ্ন করবে?", retryable: false },
  INTERNAL_ERROR: { title: "সংযোগে সমস্যা 🔌", message: "সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করো।", retryable: true },
  SERVICE_UNAVAILABLE: { title: "সংযোগে সমস্যা 🔌", message: "সার্ভার এখন বিশ্রামে। একটু পরে চেষ্টা করো।", retryable: true },
  NETWORK_ERROR: { title: "ইন্টারনেট নেই 📡", message: "ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করো।", retryable: true },
};

export function toFriendlyError(code: string, fallbackMessage: string, requestId?: string): FriendlyError {
  const known = COPY[code];
  if (known) return { code, requestId, ...known };
  // Never surface raw provider payloads to children; generic safe copy.
  void fallbackMessage;
  return {
    code,
    requestId,
    title: "ওহো! 🌱",
    message: "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করো।",
    retryable: true,
  };
}

export function apiBaseUrl(): string {
  return getEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");
}
