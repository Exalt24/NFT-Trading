interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * A small in-memory TTL cache for read-heavy analytics responses. Entries expire by age and the whole cache is cleared whenever
 * the indexer processes new chain events, so a cached figure is never older than the last indexed block plus the TTL.
 */
export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    // The background timer must not keep a short-lived script or a test process alive on its own.
    this.cleanupInterval.unref?.();
  }

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlSeconds * 1000 });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns the cached value for `key`, or runs `compute`, stores the result and returns it. Concurrent calls for the same key share one
   * computation, so a burst of identical requests costs one database query. A failing computation is not cached and every waiter sees the error.
   */
  async cached<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const hit = this.get<T>(key);
    if (hit !== null) return hit;

    const running = this.inflight.get(key) as Promise<T> | undefined;
    if (running) return running;

    const started = (async () => {
      try {
        const value = await compute();
        this.set(key, value, ttlSeconds);
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, started);
    return started;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) expiredEntries++;
      else validEntries++;
    }
    return { totalEntries: this.cache.size, validEntries, expiredEntries };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
    this.inflight.clear();
  }
}

export const cacheService = new CacheService();
