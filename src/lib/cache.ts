interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    if (this.store.size > this.maxSize) this.evictExpired();
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
    if (this.store.size > this.maxSize) {
      const sorted = [...this.store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      for (const [key] of sorted) {
        this.store.delete(key);
        if (this.store.size <= this.maxSize) break;
      }
    }
  }
}
