"use client";

import { QueryClient } from "@tanstack/react-query";

/** Shared query client: catalogue cached longer; chat/admin stay fresh. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (count, err) => {
          // Retry transient failures only; never blindly retry mutations (handled per-mutation).
          const status = (err as { status?: number })?.status ?? 0;
          if (status === 401 || status === 403 || status === 404 || status === 429) return false;
          return count < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}
