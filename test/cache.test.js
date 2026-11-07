'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const CacheLite = require('../index');

/** Helper to pause execution for ttl expiration tests */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('CacheLite Core Functionality', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheLite();
  });

  describe('set() and get()', () => {
    test('should store and retrieve a primitive string value', () => {
      cache.set('greeting', 'Hello World');
      assert.equal(cache.get('greeting'), 'Hello World');
    });

    test('should store and retrieve numbers, booleans, and objects', () => {
      const user = { id: 1, name: 'Alice', roles: ['admin', 'user'] };
      cache.set('user:1', user);
      cache.set('active', true);
      cache.set('count', 42);

      assert.deepEqual(cache.get('user:1'), user);
      assert.equal(cache.get('active'), true);
      assert.equal(cache.get('count'), 42);
    });

    test('should allow method chaining on set()', () => {
      const returned = cache.set('k1', 'v1').set('k2', 'v2');
      assert.equal(returned, cache);
      assert.equal(cache.get('k1'), 'v1');
      assert.equal(cache.get('k2'), 'v2');
    });

    test('should update existing keys with new values', () => {
      cache.set('key', 'initial');
      assert.equal(cache.get('key'), 'initial');

      cache.set('key', 'updated');
      assert.equal(cache.get('key'), 'updated');
      assert.equal(cache.size(), 1);
    });

    test('should return undefined for missing keys', () => {
      assert.equal(cache.get('nonexistent'), undefined);
    });

    test('should throw TypeError when setting or getting with null or undefined key', () => {
      assert.throws(() => cache.set(null, 'value'), /Cache key must not be null or undefined/);
      assert.throws(() => cache.set(undefined, 'value'), /Cache key must not be null or undefined/);
      assert.throws(() => cache.get(null), /Cache key must not be null or undefined/);
      assert.throws(() => cache.get(undefined), /Cache key must not be null or undefined/);
    });
  });

  describe('Special values (falsy, nullish, undefined)', () => {
    test('should correctly store and retrieve null', () => {
      cache.set('nullKey', null);
      assert.equal(cache.has('nullKey'), true);
      assert.equal(cache.get('nullKey'), null);
    });

    test('should correctly store and retrieve false', () => {
      cache.set('falseKey', false);
      assert.equal(cache.has('falseKey'), true);
      assert.equal(cache.get('falseKey'), false);
    });

    test('should correctly store and retrieve zero (0)', () => {
      cache.set('zeroKey', 0);
      assert.equal(cache.has('zeroKey'), true);
      assert.equal(cache.get('zeroKey'), 0);
    });

    test('should correctly store and retrieve empty string ("")', () => {
      cache.set('emptyString', '');
      assert.equal(cache.has('emptyString'), true);
      assert.equal(cache.get('emptyString'), '');
    });

    test('should correctly store and retrieve undefined without confusing with cache miss', () => {
      cache.set('undefKey', undefined);
      assert.equal(cache.has('undefKey'), true);
      assert.equal(cache.get('undefKey'), undefined);
      assert.equal(cache.size(), 1);
      assert.deepEqual(cache.keys(), ['undefKey']);
    });

    test('should correctly store and retrieve NaN', () => {
      cache.set('nanKey', NaN);
      assert.equal(cache.has('nanKey'), true);
      assert.ok(Number.isNaN(cache.get('nanKey')));
    });
  });

  describe('has() and delete()', () => {
    test('should return true for existing keys and false for missing keys', () => {
      cache.set('exists', 123);
      assert.equal(cache.has('exists'), true);
      assert.equal(cache.has('doesNotExist'), false);
    });

    test('delete() should return true when key is deleted and false when key does not exist', () => {
      cache.set('toDelete', 'value');
      assert.equal(cache.delete('toDelete'), true);
      assert.equal(cache.has('toDelete'), false);
      assert.equal(cache.get('toDelete'), undefined);

      assert.equal(cache.delete('toDelete'), false);
      assert.equal(cache.delete('neverExisted'), false);
    });

    test('should throw TypeError when has() or delete() is called with invalid key', () => {
      assert.throws(() => cache.has(null), /Cache key must not be null or undefined/);
      assert.throws(() => cache.delete(undefined), /Cache key must not be null or undefined/);
    });
  });

  describe('clear(), size(), keys(), values(), entries()', () => {
    test('clear() should wipe all entries', () => {
      cache.set('a', 1).set('b', 2).set('c', 3);
      assert.equal(cache.size(), 3);

      cache.clear();
      assert.equal(cache.size(), 0);
      assert.equal(cache.has('a'), false);
      assert.equal(cache.has('b'), false);
      assert.equal(cache.has('c'), false);
    });

    test('size() should accurately reflect the number of valid items', () => {
      assert.equal(cache.size(), 0);
      cache.set('x', 1);
      assert.equal(cache.size(), 1);
      cache.set('y', 2);
      assert.equal(cache.size(), 2);
      cache.delete('x');
      assert.equal(cache.size(), 1);
    });

    test('keys(), values(), and entries() should return correct collections', () => {
      cache.set('k1', 'v1');
      cache.set('k2', 'v2');

      assert.deepEqual(cache.keys().sort(), ['k1', 'k2']);
      assert.deepEqual(cache.values().sort(), ['v1', 'v2']);
      assert.deepEqual(cache.entries().sort(), [['k1', 'v1'], ['k2', 'v2']]);
    });

    test('Symbol.iterator should allow for..of iteration', () => {
      cache.set('a', 10);
      cache.set('b', 20);

      const items = [];
      for (const [key, value] of cache) {
        items.push([key, value]);
      }
      assert.deepEqual(items.sort(), [['a', 10], ['b', 20]]);
    });
  });

  describe('TTL and Expiration', () => {
    test('entry should expire after custom TTL has elapsed', async () => {
      cache.set('temp', 'fleeting', 50); // 50ms TTL
      assert.equal(cache.get('temp'), 'fleeting');
      assert.equal(cache.has('temp'), true);

      await sleep(70);

      assert.equal(cache.get('temp'), undefined);
      assert.equal(cache.has('temp'), false);
      assert.equal(cache.size(), 0);
    });

    test('default TTL configured in constructor should apply when no custom TTL is given', async () => {
      const ttlCache = new CacheLite({ defaultTTL: 60 });
      ttlCache.set('item1', 'val1'); // uses default 60ms
      ttlCache.set('item2', 'val2', 200); // custom 200ms

      assert.equal(ttlCache.get('item1'), 'val1');
      assert.equal(ttlCache.get('item2'), 'val2');

      await sleep(80);

      assert.equal(ttlCache.get('item1'), undefined);
      assert.equal(ttlCache.get('item2'), 'val2'); // still valid

      await sleep(150);
      assert.equal(ttlCache.get('item2'), undefined);
    });

    test('custom TTL should override defaultTTL', async () => {
      const ttlCache = new CacheLite({ defaultTTL: 200 });
      ttlCache.set('shortLived', 'quick', 40);

      assert.equal(ttlCache.get('shortLived'), 'quick');
      await sleep(60);
      assert.equal(ttlCache.get('shortLived'), undefined);
    });

    test('entry with TTL=0 should be expired immediately', () => {
      cache.set('zeroTTL', 'instantlyGone', 0);
      assert.equal(cache.has('zeroTTL'), false);
      assert.equal(cache.get('zeroTTL'), undefined);
      assert.equal(cache.size(), 0);
    });

    test('entry with null or undefined TTL should never expire if no defaultTTL is set', async () => {
      cache.set('permanent', 'forever', null);
      await sleep(30);
      assert.equal(cache.get('permanent'), 'forever');
      assert.equal(cache.has('permanent'), true);
    });

    test('should throw errors on invalid TTL values', () => {
      assert.throws(() => cache.set('k', 'v', -10), /TTL must be a non-negative number/);
      assert.throws(() => cache.set('k', 'v', '1000'), /TTL must be a number/);
      assert.throws(() => cache.set('k', 'v', NaN), /TTL must be a number/);
      assert.throws(() => new CacheLite({ defaultTTL: -50 }), /TTL must be a non-negative number/);
      assert.throws(() => new CacheLite({ defaultTTL: 'hour' }), /TTL must be a number/);
    });

    test('keys() and size() should exclude expired entries', async () => {
      cache.set('valid', 'stays', 500);
      cache.set('expiring', 'leaves', 40);

      assert.equal(cache.size(), 2);
      await sleep(60);

      assert.equal(cache.size(), 1);
      assert.deepEqual(cache.keys(), ['valid']);
      assert.deepEqual(cache.values(), ['stays']);
    });
  });

  describe('cleanup() functionality', () => {
    test('cleanup() should actively remove all expired entries and return count', async () => {
      cache.set('e1', 1, 30);
      cache.set('e2', 2, 30);
      cache.set('keep', 3, 500);

      await sleep(50);

      const removed = cache.cleanup();
      assert.equal(removed, 2);
      assert.equal(cache.size(), 1);
      assert.equal(cache.has('keep'), true);
    });

    test('cleanup() should return 0 when no entries are expired', () => {
      cache.set('live1', 1, 10000);
      cache.set('live2', 2, 10000);

      const removed = cache.cleanup();
      assert.equal(removed, 0);
      assert.equal(cache.size(), 2);
    });

    test('automatic cleanup timer should trigger cleanup periodically', async () => {
      const autoCache = new CacheLite({ cleanupInterval: 40 });
      autoCache.set('temp', 'data', 30);

      await sleep(90);

      // Raw entries count should be 0 because background timer cleaned it up
      assert.equal(autoCache.getStats().rawEntriesCount, 0);
      autoCache.stopCleanup();
    });
  });

  describe('getOrSet() functionality', () => {
    test('synchronous callback should be called on cache miss', () => {
      let callCount = 0;
      const callback = () => {
        callCount++;
        return 'computed_value';
      };

      const result1 = cache.getOrSet('compKey', callback);
      assert.equal(result1, 'computed_value');
      assert.equal(callCount, 1);

      // Second call should return cached value without executing callback
      const result2 = cache.getOrSet('compKey', callback);
      assert.equal(result2, 'computed_value');
      assert.equal(callCount, 1);
    });

    test('asynchronous callback should be called on cache miss and resolve properly', async () => {
      let callCount = 0;
      const asyncCallback = async (key) => {
        callCount++;
        await sleep(20);
        return `async_result_for_${key}`;
      };

      const promise1 = cache.getOrSet('asyncKey', asyncCallback, 100);
      assert.ok(promise1 instanceof Promise);

      const val1 = await promise1;
      assert.equal(val1, 'async_result_for_asyncKey');
      assert.equal(callCount, 1);

      // Second call should return cached value synchronously or immediately
      const val2 = cache.getOrSet('asyncKey', asyncCallback);
      assert.equal(val2, 'async_result_for_asyncKey');
      assert.equal(callCount, 1);
    });

    test('asynchronous callback error should propagate and not cache value', async () => {
      const failingCallback = async () => {
        throw new Error('Database connection failed');
      };

      await assert.rejects(
        async () => cache.getOrSet('failKey', failingCallback),
        /Database connection failed/
      );

      assert.equal(cache.has('failKey'), false);
      assert.equal(cache.get('failKey'), undefined);
    });

    test('synchronous callback error should propagate and not cache value', () => {
      const failingSync = () => {
        throw new Error('Sync computation error');
      };

      assert.throws(
        () => cache.getOrSet('syncFailKey', failingSync),
        /Sync computation error/
      );

      assert.equal(cache.has('syncFailKey'), false);
    });

    test('getOrSet() should recompute if cached entry has expired', async () => {
      let callCount = 0;
      const callback = () => {
        callCount++;
        return `value_v${callCount}`;
      };

      const res1 = cache.getOrSet('expKey', callback, 40);
      assert.equal(res1, 'value_v1');
      assert.equal(callCount, 1);

      await sleep(60);

      const res2 = cache.getOrSet('expKey', callback, 40);
      assert.equal(res2, 'value_v2');
      assert.equal(callCount, 2);
    });

    test('getOrSet() throws TypeError if callback is not a function', () => {
      assert.throws(() => cache.getOrSet('key', 'not-a-func'), /Callback must be a function/);
    });
  });

  describe('Capacity and Max Entries (LRU Eviction)', () => {
    test('should evict oldest entry when maxEntries capacity is reached', () => {
      const limitedCache = new CacheLite({ maxEntries: 3 });
      limitedCache.set('a', 1);
      limitedCache.set('b', 2);
      limitedCache.set('c', 3);

      assert.equal(limitedCache.size(), 3);

      // Access 'a' so 'b' becomes the oldest
      limitedCache.get('a');

      // Adding 'd' should evict 'b'
      limitedCache.set('d', 4);

      assert.equal(limitedCache.size(), 3);
      assert.equal(limitedCache.has('b'), false);
      assert.equal(limitedCache.has('a'), true);
      assert.equal(limitedCache.has('c'), true);
      assert.equal(limitedCache.has('d'), true);
    });

    test('should prefer evicting expired entries before live entries when at capacity', async () => {
      const limitedCache = new CacheLite({ maxEntries: 2 });
      limitedCache.set('expiredSoon', 'dead', 30);
      limitedCache.set('permanent', 'alive');

      await sleep(50);

      limitedCache.set('newEntry', 'fresh');

      assert.equal(limitedCache.size(), 2);
      assert.equal(limitedCache.has('expiredSoon'), false);
      assert.equal(limitedCache.has('permanent'), true);
      assert.equal(limitedCache.has('newEntry'), true);
    });

    test('should validate maxEntries constructor option', () => {
      assert.throws(() => new CacheLite({ maxEntries: -1 }), /maxEntries must be a positive integer/);
      assert.throws(() => new CacheLite({ maxEntries: 0 }), /maxEntries must be a positive integer/);
      assert.throws(() => new CacheLite({ maxEntries: '10' }), /maxEntries must be a positive integer/);
    });
  });

  describe('Statistics and Operational Metrics', () => {
    test('should accurately track hits, misses, and hit ratio', () => {
      cache.set('hitKey', 'value');

      cache.get('hitKey'); // hit 1
      cache.get('hitKey'); // hit 2
      cache.get('missKey'); // miss 1
      cache.get('anotherMiss'); // miss 2

      const stats = cache.getStats();
      assert.equal(stats.hits, 2);
      assert.equal(stats.misses, 2);
      assert.equal(stats.totalRequests, 4);
      assert.equal(stats.hitRatio, 0.5);

      cache.resetStats();
      const resetStats = cache.getStats();
      assert.equal(resetStats.hits, 0);
      assert.equal(resetStats.misses, 0);
      assert.equal(resetStats.hitRatio, 0);
    });

    test('destroy() should stop timers and clear entries', () => {
      const tempCache = new CacheLite({ cleanupInterval: 100 });
      tempCache.set('k', 'v');
      assert.equal(tempCache.size(), 1);

      tempCache.destroy();
      assert.equal(tempCache.size(), 0);
    });
  });
});
