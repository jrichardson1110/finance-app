interface Entry {
  value: unknown;
  expiresAt: number;
}

export interface TtlCache {
  /** Returns a fresh cached value, or runs `load` once even when called concurrently for the same key. */
  getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T>;
}

const DEFAULT_MAX_ENTRIES = 500;

/**
 * Small in-memory TTL cache with in-flight de-duplication. Failures are never cached.
 * The entry cap keeps memory bounded even if many distinct symbols are requested.
 */
export function createTtlCache(now: () => number = Date.now, maxEntries = DEFAULT_MAX_ENTRIES): TtlCache {
  const entries = new Map<string, Entry>();
  const inFlight = new Map<string, Promise<unknown>>();

  return {
    async getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
      const cached = entries.get(key);
      if (cached && cached.expiresAt > now()) return cached.value as T;

      const pending = inFlight.get(key);
      if (pending) return pending as Promise<T>;

      const promise = load()
        .then((value) => {
          entries.delete(key);
          entries.set(key, { value, expiresAt: now() + ttlMs });
          while (entries.size > maxEntries) {
            const oldest = entries.keys().next().value;
            if (oldest === undefined) break;
            entries.delete(oldest);
          }
          return value;
        })
        .finally(() => {
          inFlight.delete(key);
        });
      inFlight.set(key, promise);
      return promise;
    },
  };
}
