import { create } from "zustand";
import { API_URL } from "../constants/api";

/**
 * Store for managing recipient public keys with caching and retry logic
 * Prevents redundant API calls and handles missing keys gracefully
 */
export const useRecipientPublicKeyStore = create((set, get) => ({
  // Cache: { userId: { publicKey: "...", timestamp: Date, error: null } }
  cache: {},

  // Fetch recipient's public key with retry and caching
  fetchRecipientPublicKey: async (recipientId, token, options = {}) => {
    const maxRetries = options.maxRetries ?? 3;
    const retryDelay = options.retryDelay ?? 500;

    if (!recipientId || !token) {
      throw new Error("recipientId and token are required");
    }

    const { cache } = get();

    // Check cache first (valid for 5 minutes)
    if (cache[recipientId]) {
      const { publicKey, timestamp, error } = cache[recipientId];
      const cacheAge = Date.now() - timestamp;
      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

      // Return cached public key if fresh
      if (publicKey && cacheAge < CACHE_TTL) {
        return publicKey;
      }

      // Return cached error if fresh (don't retry too soon)
      if (error && cacheAge < 30000) {
        throw error;
      }
    }

    // Attempt to fetch with retries
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_URL}/users/${recipientId}/public-key`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const data = await res.json();
          const error = new Error(
            data.message || "Failed to fetch recipient public key",
          );
          error.statusCode = res.status;
          error.isE2EENotSetup = res.status === 400; // 400 = user hasn't set up E2EE

          // Cache the error
          set((state) => ({
            cache: {
              ...state.cache,
              [recipientId]: {
                publicKey: null,
                error,
                timestamp: Date.now(),
              },
            },
          }));

          throw error;
        }

        const data = await res.json();
        const publicKey = data.publicKey;

        if (!publicKey) {
          throw new Error("Public key not found in response");
        }

        // Cache the successful result
        set((state) => ({
          cache: {
            ...state.cache,
            [recipientId]: {
              publicKey,
              error: null,
              timestamp: Date.now(),
            },
          },
        }));

        return publicKey;
      } catch (error) {
        lastError = error;

        // Don't retry on 404 (user doesn't exist) or 400 (no E2EE setup)
        if (error.statusCode === 404) {
          throw error;
        }

        if (error.statusCode === 400) {
          throw error;
        }

        // Retry on network errors
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    // All retries exhausted
    throw lastError;
  },

  // Invalidate cache for a specific recipient
  invalidateCache: (recipientId) => {
    set((state) => {
      const newCache = { ...state.cache };
      delete newCache[recipientId];
      return { cache: newCache };
    });
  },

  // Clear entire cache
  clearCache: () => {
    set({ cache: {} });
  },
}));
