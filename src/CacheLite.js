/**
 * CacheLite
 * A lightweight, dependency-free in-memory caching library for JavaScript and Node.js.
 *
 * @license MIT
 */

'use strict';

/**
 * Validates a cache key.
 * @param {*} key - The cache key to validate.
 * @throws {TypeError} If key is null or undefined.
 */
function validateKey(key) {
  if (key === null || key === undefined) {
    throw new TypeError('Cache key must not be null or undefined.');
  }
}

/**
 * Validates a TTL (Time-To-Live) value in milliseconds.
 * @param {*} ttl - The TTL in milliseconds.
 * @throws {TypeError} If ttl is not a number.
 * @throws {RangeError} If ttl is negative.
 */
function validateTTL(ttl) {
  if (ttl !== undefined && ttl !== null) {
    if (typeof ttl !== 'number' || Number.isNaN(ttl)) {
      throw new TypeError('TTL must be a number representing milliseconds.');
    }
    if (ttl < 0) {
      throw new RangeError('TTL must be a non-negative number.');
    }
  }
}

/**
 * Represents an entry stored inside the cache.
 */
class CacheEntry {
  constructor(value, expiresAt) {
    this.value = value;
    this.expiresAt = expiresAt; // Epoch ms or null if no expiration
    this.createdAt = Date.now();
    this.lastAccessed = this.createdAt;
    this.hits = 0;
  }

  isExpired(now = Date.now()) {
    return this.expiresAt !== null && now >= this.expiresAt;
  }
}

/**
 * CacheLite class.
 */
class CacheLite {
  /**
   * Create a new CacheLite instance.
   * @param {Object} [options={}] - Configuration options.
   * @param {number} [options.defaultTTL] - Default TTL in milliseconds for new entries.
   * @param {number} [options.cleanupInterval] - Automatic cleanup interval in milliseconds.
   * @param {number} [options.maxEntries] - Maximum capacity before least-recently-used items are evicted.
   */
  constructor(options = {}) {
    if (options !== null && typeof options !== 'object') {
      throw new TypeError('Options must be an object.');
    }

    const { defaultTTL, cleanupInterval, maxEntries } = options;

    if (defaultTTL !== undefined) {
      validateTTL(defaultTTL);
      this._defaultTTL = defaultTTL;
    } else {
      this._defaultTTL = null;
    }

    if (maxEntries !== undefined) {
      if (typeof maxEntries !== 'number' || !Number.isInteger(maxEntries) || maxEntries <= 0) {
        throw new TypeError('maxEntries must be a positive integer.');
      }
      this._maxEntries = maxEntries;
    } else {
      this._maxEntries = null;
    }

    this._store = new Map();
    this._stats = {
      hits: 0,
      misses: 0,
    };

    this._cleanupTimer = null;
    if (cleanupInterval !== undefined) {
      if (typeof cleanupInterval !== 'number' || cleanupInterval <= 0) {
        throw new TypeError('cleanupInterval must be a positive number in milliseconds.');
      }
      this._startCleanupTimer(cleanupInterval);
    }
  }

  /**
   * Internal timer for periodic cleanup of expired entries.
   * @private
   */
  _startCleanupTimer(interval) {
    this._cleanupTimer = setInterval(() => {
      this.cleanup();
    }, interval);

    // Don't keep Node.js process alive just for this timer
    if (typeof this._cleanupTimer.unref === 'function') {
      this._cleanupTimer.unref();
    }
  }

  /**
   * Stop the automatic cleanup timer if running.
   */
  stopCleanup() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }

  /**
   * Default TTL configured for this cache instance.
   * @returns {number|null}
   */
  get defaultTTL() {
    return this._defaultTTL;
  }

  /**
   * Maximum entries allowed in the cache.
   * @returns {number|null}
   */
  get maxEntries() {
    return this._maxEntries;
  }

  /**
   * Store a value in the cache with an optional TTL.
   *
   * @param {*} key - Cache key (must not be null or undefined).
   * @param {*} value - Value to cache (supports undefined, null, false, objects, etc.).
   * @param {number} [ttl] - Expiration time in milliseconds. If omitted, uses defaultTTL.
   * @returns {CacheLite} The cache instance for method chaining.
   */
  set(key, value, ttl = this._defaultTTL) {
    validateKey(key);
    validateTTL(ttl);

    const now = Date.now();
    let expiresAt = null;

    if (ttl !== null && ttl !== undefined) {
      expiresAt = now + ttl;
    }

    // Check if key already exists, update entry
    if (this._store.has(key)) {
      const entry = this._store.get(key);
      entry.value = value;
      entry.expiresAt = expiresAt;
      entry.lastAccessed = now;
      // Re-insert to keep Map iteration order updated (LRU order)
      this._store.delete(key);
      this._store.set(key, entry);
      return this;
    }

    // Enforce maxEntries limit if configured
    if (this._maxEntries !== null && this._store.size >= this._maxEntries) {
      // First, try to evict any expired items to make room
      const removed = this.cleanup();
      if (removed === 0 && this._store.size >= this._maxEntries) {
        // Evict the oldest entry (first item in Map)
        const oldestKey = this._store.keys().next().value;
        if (oldestKey !== undefined) {
          this._store.delete(oldestKey);
        }
      }
    }

    this._store.set(key, new CacheEntry(value, expiresAt));
    return this;
  }

  /**
   * Retrieve a value from the cache.
   * Returns undefined if the key does not exist or has expired.
   *
   * @param {*} key - Cache key to retrieve.
   * @returns {*} Cached value or undefined.
   */
  get(key) {
    validateKey(key);

    const entry = this._store.get(key);
    if (!entry) {
      this._stats.misses++;
      return undefined;
    }

    const now = Date.now();
    if (entry.isExpired(now)) {
      // Lazy eviction of expired item
      this._store.delete(key);
      this._stats.misses++;
      return undefined;
    }

    // Update access statistics and LRU position
    entry.hits++;
    entry.lastAccessed = now;
    this._stats.hits++;

    // Refresh position in Map for LRU
    this._store.delete(key);
    this._store.set(key, entry);

    return entry.value;
  }

  /**
   * Check whether a key exists in the cache and has not expired.
   *
   * @param {*} key - Cache key.
   * @returns {boolean} True if the key exists and is still valid.
   */
  has(key) {
    validateKey(key);

    const entry = this._store.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (entry.isExpired(now)) {
      this._store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove a specific key from the cache.
   *
   * @param {*} key - Key to delete.
   * @returns {boolean} True if the key was found and removed, false otherwise.
   */
  delete(key) {
    validateKey(key);
    return this._store.delete(key);
  }

  /**
   * Clear all entries from the cache.
   *
   * @returns {void}
   */
  clear() {
    this._store.clear();
  }

  /**
   * Return the number of currently valid (non-expired) entries.
   *
   * @returns {number} Count of valid entries.
   */
  size() {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this._store.entries()) {
      if (entry.isExpired(now)) {
        this._store.delete(key);
      } else {
        count++;
      }
    }
    return count;
  }

  /**
   * Return an array of all valid (non-expired) cache keys.
   *
   * @returns {Array} Array of keys.
   */
  keys() {
    const now = Date.now();
    const result = [];
    for (const [key, entry] of this._store.entries()) {
      if (entry.isExpired(now)) {
        this._store.delete(key);
      } else {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Return an array of all valid (non-expired) cache values.
   *
   * @returns {Array} Array of values.
   */
  values() {
    const now = Date.now();
    const result = [];
    for (const [key, entry] of this._store.entries()) {
      if (entry.isExpired(now)) {
        this._store.delete(key);
      } else {
        result.push(entry.value);
      }
    }
    return result;
  }

  /**
   * Return an array of [key, value] pairs for all valid entries.
   *
   * @returns {Array<[*, *]>} Array of [key, value] pairs.
   */
  entries() {
    const now = Date.now();
    const result = [];
    for (const [key, entry] of this._store.entries()) {
      if (entry.isExpired(now)) {
        this._store.delete(key);
      } else {
        result.push([key, entry.value]);
      }
    }
    return result;
  }

  /**
   * Return cached data if present and valid, or execute the callback,
   * cache its result, and return it.
   * Supports both synchronous and asynchronous callbacks.
   *
   * @param {*} key - Cache key.
   * @param {Function} callback - Function returning the value or a Promise.
   * @param {number} [ttl] - Expiration time in milliseconds.
   * @returns {*|Promise<*>} The cached or freshly computed value.
   */
  getOrSet(key, callback, ttl = this._defaultTTL) {
    validateKey(key);
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function.');
    }

    if (this.has(key)) {
      return this.get(key);
    }

    this._stats.misses++;

    let result;
    try {
      result = callback(key);
    } catch (err) {
      throw err;
    }

    // Check if result is a Promise (or thenable)
    if (result !== null && (typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function') {
      return result.then((resolvedValue) => {
        this.set(key, resolvedValue, ttl);
        return resolvedValue;
      });
    }

    // Synchronous result
    this.set(key, result, ttl);
    return result;
  }

  /**
   * Remove all expired entries from the cache.
   *
   * @returns {number} Number of expired entries removed.
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this._store.entries()) {
      if (entry.isExpired(now)) {
        this._store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Get operational statistics about cache performance.
   *
   * @returns {Object} Object containing hits, misses, total requests, hit ratio, and size.
   */
  getStats() {
    const hits = this._stats.hits;
    const misses = this._stats.misses;
    const totalRequests = hits + misses;
    const hitRatio = totalRequests === 0 ? 0 : Number((hits / totalRequests).toFixed(4));

    return {
      hits,
      misses,
      totalRequests,
      hitRatio,
      size: this.size(),
      rawEntriesCount: this._store.size,
    };
  }

  /**
   * Reset operational statistics.
   */
  resetStats() {
    this._stats.hits = 0;
    this._stats.misses = 0;
  }

  /**
   * Destroy the cache instance, stopping any timers and clearing all data.
   */
  destroy() {
    this.stopCleanup();
    this.clear();
  }

  /**
   * Allows iterating over valid entries with `for (const [key, value] of cache)`.
   */
  *[Symbol.iterator]() {
    const now = Date.now();
    for (const [key, entry] of this._store.entries()) {
      if (entry.isExpired(now)) {
        this._store.delete(key);
      } else {
        yield [key, entry.value];
      }
    }
  }
}

module.exports = CacheLite;
