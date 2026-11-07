/**
 * Type declarations for CacheLite
 */

export interface CacheOptions {
  /**
   * Default time-to-live in milliseconds for new cache entries.
   * If not set or set to null, entries do not expire by default.
   */
  defaultTTL?: number;

  /**
   * Automatic background cleanup interval in milliseconds.
   */
  cleanupInterval?: number;

  /**
   * Maximum number of items stored before least-recently-used items are evicted.
   */
  maxEntries?: number;
}

export interface CacheStats {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Total requests (hits + misses) */
  totalRequests: number;
  /** Hit ratio between 0 and 1 */
  hitRatio: number;
  /** Current number of valid (non-expired) entries */
  size: number;
  /** Internal raw entries count before eviction */
  rawEntriesCount: number;
}

export class CacheLite<K = any, V = any> implements Iterable<[K, V]> {
  /**
   * Create a new CacheLite instance.
   */
  constructor(options?: CacheOptions);

  /**
   * Configured default TTL in milliseconds, or null if none.
   */
  readonly defaultTTL: number | null;

  /**
   * Configured maximum entry capacity, or null if unlimited.
   */
  readonly maxEntries: number | null;

  /**
   * Store a value in the cache with an optional TTL.
   * @param key - Unique cache key (non-null, non-undefined).
   * @param value - Value to cache.
   * @param ttl - Expiration time in milliseconds (overrides defaultTTL).
   * @returns The CacheLite instance for method chaining.
   */
  set(key: K, value: V, ttl?: number | null): this;

  /**
   * Retrieve a value from the cache.
   * Returns undefined if the key does not exist or has expired.
   * @param key - Cache key.
   */
  get(key: K): V | undefined;

  /**
   * Check whether a key exists in the cache and has not expired.
   * @param key - Cache key.
   */
  has(key: K): boolean;

  /**
   * Remove a specific key from the cache.
   * @param key - Cache key to remove.
   * @returns True if key was deleted, false otherwise.
   */
  delete(key: K): boolean;

  /**
   * Clear all entries from the cache.
   */
  clear(): void;

  /**
   * Return the number of currently valid (non-expired) entries.
   */
  size(): number;

  /**
   * Return an array of all valid cache keys.
   */
  keys(): K[];

  /**
   * Return an array of all valid cache values.
   */
  values(): V[];

  /**
   * Return an array of [key, value] pairs for all valid entries.
   */
  entries(): [K, V][];

  /**
   * Retrieve a cached value, or compute and cache it if absent or expired.
   * Supports both synchronous and asynchronous callbacks.
   * @param key - Cache key.
   * @param callback - Function returning the value or Promise of the value.
   * @param ttl - Optional TTL in milliseconds.
   */
  getOrSet<R extends Promise<V>>(key: K, callback: (key: K) => R, ttl?: number | null): Promise<V>;
  getOrSet(key: K, callback: (key: K) => V, ttl?: number | null): V;

  /**
   * Purge all expired entries from memory.
   * @returns Count of removed entries.
   */
  cleanup(): number;

  /**
   * Stop the automatic cleanup timer if running.
   */
  stopCleanup(): void;

  /**
   * Get operational statistics (hits, misses, ratio, size).
   */
  getStats(): CacheStats;

  /**
   * Reset hits and misses statistics.
   */
  resetStats(): void;

  /**
   * Destroy the instance, clearing data and stopping timers.
   */
  destroy(): void;

  /**
   * Iterate over valid [key, value] pairs.
   */
  [Symbol.iterator](): Iterator<[K, V]>;
}

export default CacheLite;
