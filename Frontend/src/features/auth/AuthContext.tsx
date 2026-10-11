"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { firebaseAuth } from "@/lib/firebase/client";
import { api } from "@/lib/api/client";
import type { MeResponse } from "@/lib/api/contracts";

interface AuthState {
  user: User | null;
  idToken: string | null;
  me: MeResponse | null;
  loading: boolean;
  guestToken: string | null;
  /** Effective credential: Firebase token when signed in, else guest token. */
  token: string | null;
  isGuest: boolean;
  startGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const GUEST_KEY = "tutor_guest_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestToken, setGuestToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(GUEST_KEY);
      if (saved) setGuestToken(saved);
    } catch {
      /* storage unavailable */
    }
    const auth = firebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const token = await u.getIdToken().catch(() => null);
        setIdToken(token);
        if (token) {
          try {
            const { data } = await api.get<MeResponse>("/me", { token });
            setMe(data);
          } catch {
            setMe(null); // retryable state in UI; never assume admin role
          }
        }
      } else {
        setIdToken(null);
        setMe(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const startGuest = useCallback(async () => {
    const { data } = await api.post<{ guestToken: string; sessionId: string }>("/guest/session");
    setGuestToken(data.guestToken);
    try {
      sessionStorage.setItem(GUEST_KEY, data.guestToken);
    } catch {
      /* ignore */
    }
  }, []);

  const signOut = useCallback(async () => {
    const auth = firebaseAuth();
    try {
      await auth?.signOut();
    } catch {
      /* ignore */
    }
    // Clear ALL cached private data so the next user on a shared device sees nothing.
    queryClient.clear();
    setUser(null);
    setIdToken(null);
    setMe(null);
    setGuestToken(null);
    try {
      sessionStorage.removeItem(GUEST_KEY);
    } catch {
      /* ignore */
    }
  }, [queryClient]);

  const refreshMe = useCallback(async () => {
    if (!idToken) return;
    try {
      const { data } = await api.get<MeResponse>("/me", { token: idToken });
      setMe(data);
    } catch {
      /* UI shows retry */
    }
  }, [idToken]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      idToken,
      me,
      loading,
      guestToken,
      token: idToken ?? guestToken,
      isGuest: !idToken && !!guestToken,
      startGuest,
      signOut,
      refreshMe,
    }),
    [user, idToken, me, loading, guestToken, startGuest, signOut, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function roleAllows(role: string | undefined, area: "admin" | "books-manage"): boolean {
  if (role === "SUPER_ADMIN") return true;
  if (area === "books-manage") return role === "CONTENT_EDITOR";
  return false;
}
