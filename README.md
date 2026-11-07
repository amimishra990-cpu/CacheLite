# CacheLite

[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)](https://www.npmjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)

A lightweight, high-performance, **zero-dependency** in-memory caching library for JavaScript and Node.js applications with flexible Time-To-Live (TTL) expiration, automatic cleanup, and transparent async memoization.

---

## Table of Contents

- [Why CacheLite?](#why-cachelite)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Complete API Reference](#complete-api-reference)
  - [Constructor](#constructor)
  - [Methods](#methods)
- [Understanding TTL (Time-To-Live)](#understanding-ttl-time-to-live)
- [Code Examples](#code-examples)
  - [1. Synchronous vs Asynchronous `getOrSet`](#1-synchronous-vs-asynchronous-getorset)
  - [2. Custom TTL and Per-Item Expiration](#2-custom-ttl-and-per-item-expiration)
  - [3. Express.js Route Caching Middleware](#3-expressjs-route-caching-middleware)
- [Edge Cases & Error Handling](#edge-cases--error-handling)
- [Running Tests](#running-tests)
- [Contributing](#contributing)
- [License](#license)

---

## Why CacheLite?

Node.js applications often suffer latency spikes and excessive load from repetitive database queries, heavy computations, or rate-limited third-party APIs. 

While heavy solutions like Redis require external infrastructure, network overhead, and complex connection managers, **CacheLite** provides an ultra-fast, in-process, zero-dependency in-memory cache directly inside your Node.js runtime.

- **Zero dependencies:** 0 bloat, 0 supply-chain security vulnerabilities.
- **Microsecond response times:** Built directly on top of JavaScript's native `Map`.
- **Accurate expiration:** Millisecond timestamp precision with lazy eviction and scheduled background cleanup.
- **First-class async support:** Seamless `getOrSet()` handles synchronous computations and async Promises with automatic caching.
- **TypeScript ready:** Includes comprehensive type definitions (`index.d.ts`).

---

## Key Features

- **Store Any Value:** Safely handles `null`, `false`, `0`, `""`, `undefined`, objects, and arrays.
- **Dual Expiration Mechanics:**
  - **Lazy Eviction:** Expired entries are detected and pruned instantly on access.
  - **Active Cleanup:** `cleanup()` sweeps and deletes stale items, with optional automatic interval timers.
- **LRU Capacity Limit:** Configurable `maxEntries` evicts least-recently-used items when capacity is reached.
- **Smart `getOrSet()`:** Prevents cache stampedes by retrieving cached values or computing and saving fresh ones.
- **Built-in Metrics:** Track cache hits, misses, hit ratio, and memory size with `getStats()`.
- **Chainable API:** Method chaining support (`cache.set('a', 1).set('b', 2)`).

---

## Installation

Install using your favorite package manager:

```bash
# Using npm
npm install cachelite

# Using yarn
yarn add cachelite

# Using pnpm
pnpm add cachelite
```

---

## Quick Start

```javascript
const CacheLite = require('cachelite');

// Create a cache with a 60-second default TTL
const cache = new CacheLite({ defaultTTL: 60000 });

// 1. Store data
cache.set('user:42', { name: 'Alice', role: 'admin' });

// 2. Retrieve data
const user = cache.get('user:42');
console.log(user); // { name: 'Alice', role: 'admin' }

// 3. Check key existence
if (cache.has('user:42')) {
  console.log('User is in cache');
}

// 4. Delete key
cache.delete('user:42');

// 5. Atomic get-or-set with asynchronous database query
const profile = await cache.getOrSet('profile:42', async () => {
  return await fetchUserProfileFromDatabase(42);
}, 30000); // cache for 30 seconds
```

---

## Complete API Reference

### Constructor

```javascript
const cache = new CacheLite(options);
```

#### Options:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `defaultTTL` | `number` | `null` | Default time-to-live in milliseconds for newly stored entries. If `null`, entries never expire unless an individual TTL is specified. |
| `cleanupInterval` | `number` | `null` | Background interval (in ms) to automatically sweep and remove expired entries. Uses `unref()` so it won't block the Node.js event loop from exiting. |
| `maxEntries` | `number` | `null` | Maximum number of keys allowed. When full, expired items are pruned first, followed by least-recently-used (LRU) items. |

---

### Methods

#### `set(key, value, [ttl])`
Stores a value in the cache.
- `key`: Cache key (`string`, `number`, or `symbol`). Must not be `null` or `undefined`.
- `value`: Any valid JavaScript value (`object`, `string`, `number`, `boolean`, `null`, `undefined`, etc.).
- `ttl` *(optional)*: Expiration lifespan in milliseconds. Overrides `defaultTTL`. Pass `null` for a permanent entry.
- **Returns:** The `CacheLite` instance (allows method chaining).

```javascript
cache.set('session:1', { token: 'xyz' }, 5000); // expires in 5 seconds
cache.set('permanent_config', { debug: false }, null); // never expires
```

#### `get(key)`
Retrieves a cached value.
- If the entry does not exist or has expired, it returns `undefined`.
- If an entry expired, it is automatically removed upon access (lazy eviction).
- **Returns:** Cached value or `undefined`.

```javascript
const session = cache.get('session:1');
```

#### `has(key)`
Checks if an entry exists and has not yet expired.
- **Returns:** `true` if present and valid; `false` otherwise.

```javascript
if (cache.has('session:1')) {
  // Key is present and active
}
```

#### `delete(key)`
Removes an entry from the cache.
- **Returns:** `true` if key was found and removed; `false` otherwise.

```javascript
cache.delete('session:1');
```

#### `clear()`
Removes all entries from the cache.
- **Returns:** `void`.

```javascript
cache.clear();
```

#### `size()`
Returns the number of currently valid, non-expired entries.
- **Returns:** `number`.

```javascript
console.log('Active items:', cache.size());
```

#### `keys()`
Returns an array of all active, non-expired cache keys.
- **Returns:** `Array<string|number|symbol>`.

```javascript
const activeKeys = cache.keys();
```

#### `values()`
Returns an array of all active, non-expired values.
- **Returns:** `Array<any>`.

#### `entries()`
Returns an array of `[key, value]` pairs for all active entries.
- **Returns:** `Array<[key, value]>`.

#### `getOrSet(key, callback, [ttl])`
Retrieves a value from cache if present. If missing or expired, executes `callback(key)`, stores the returned result, and returns it.
- Seamlessly handles both **synchronous** and **asynchronous** callbacks.
- If `callback` returns a Promise, `getOrSet` returns a Promise that resolves to the value.
- If `callback` returns a plain value, `getOrSet` returns that value synchronously.
- **Returns:** `value` or `Promise<value>`.

```javascript
// Synchronous usage
const taxRate = cache.getOrSet('tax:US', () => calculateTaxRate('US'));

// Asynchronous usage
const user = await cache.getOrSet('user:10', async () => {
  return await db.users.findById(10);
}, 60000);
```

#### `cleanup()`
Scans the cache and actively purges all expired entries from memory.
- **Returns:** `number` (count of purged entries).

```javascript
const purgedCount = cache.cleanup();
console.log(`Purged ${purgedCount} expired items.`);
```

#### `stopCleanup()`
Stops the background cleanup timer initialized by `cleanupInterval`.

#### `getStats()`
Returns runtime operational metrics.
- **Returns:** `{ hits: number, misses: number, totalRequests: number, hitRatio: number, size: number, rawEntriesCount: number }`

```javascript
console.log(cache.getStats());
```

#### `resetStats()`
Resets hit and miss counters back to 0.

#### `destroy()`
Clears all entries and stops any background timers.

---

## Understanding TTL (Time-To-Live)

TTL represents how long an entry remains valid, specified in **milliseconds**.

CacheLite uses a high-performance **hybrid expiration strategy**:

```
                ┌──────────────────────────────────────┐
                │             Item Stored              │
                │     (expiresAt = now + ttl)          │
                └──────────────────┬───────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│         Lazy Eviction           │       │          Active Cleanup          │
│   Checked whenever get(),       │       │    Periodic background sweep     │
│   has(), size(), or keys() runs │       │  via cleanup() / cleanupInterval │
└─────────────────────────────────┘       └──────────────────────────────────┘
```

1. **Lazy Eviction:** Whenever an item is accessed via `get()` or `has()`, CacheLite checks whether `Date.now() >= expiresAt`. If expired, it removes the entry immediately and returns `undefined` or `false`.
2. **Active Cleanup:** Calling `cache.cleanup()` or setting `cleanupInterval: 60000` periodically purges unaccessed expired items from memory, preventing lingering memory retention.

---

## Code Examples

### 1. Synchronous vs Asynchronous `getOrSet`

```javascript
const CacheLite = require('cachelite');
const cache = new CacheLite({ defaultTTL: 10000 });

// --- Synchronous Expensive Task ---
function getReportSummary() {
  console.log('Generating heavy report...');
  return { generatedAt: Date.now(), totalSales: 450000 };
}

// First call: computes and stores
const summary1 = cache.getOrSet('report:summary', () => getReportSummary());

// Second call: returns cached result instantly without running the function
const summary2 = cache.getOrSet('report:summary', () => getReportSummary());


// --- Asynchronous Database Query ---
async function fetchProducts() {
  console.log('Querying SQL Database...');
  return await db.query('SELECT * FROM products');
}

// Transparently awaits Promise and caches resolved result
const products = await cache.getOrSet('products:all', fetchProducts, 60000);
```

### 2. Custom TTL and Per-Item Expiration

```javascript
const CacheLite = require('cachelite');
const cache = new CacheLite({ defaultTTL: 5000 }); // 5s default

// Item 1: Uses 5s default TTL
cache.set('search:query:shoes', searchResults);

// Item 2: Quick burst cache (500ms)
cache.set('ticker:BTC_USD', 68420.50, 500);

// Item 3: Long lived configuration (1 hour)
cache.set('feature_flags', { newCheckout: true }, 3600000);

// Item 4: Permanent entry (never expires)
cache.set('system:status', 'online', null);
```

### 3. Express.js Route Caching Middleware

Here is an example of creating a caching middleware for an Express.js API:

```javascript
const express = require('express');
const CacheLite = require('cachelite');

const app = express();
const routeCache = new CacheLite({ defaultTTL: 30000 }); // Cache responses for 30s

// Route Caching Middleware
function cacheMiddleware(ttl) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const cacheKey = req.originalUrl || req.url;
    const cachedBody = routeCache.get(cacheKey);

    if (cachedBody) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedBody);
    }

    // Intercept res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      routeCache.set(cacheKey, body, ttl);
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

// Apply cache middleware to route
app.get('/api/users', cacheMiddleware(15000), async (req, res) => {
  // Simulated database query
  const users = await db.fetchUsers();
  res.json(users);
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## Edge Cases & Error Handling

CacheLite is strictly engineered to handle real-world JavaScript edge cases:

1. **Falsy and Nullish Stored Values:**
   ```javascript
   cache.set('flag', false);
   cache.get('flag'); // returns false (NOT undefined!)

   cache.set('count', 0);
   cache.get('count'); // returns 0

   cache.set('emptyVal', null);
   cache.get('emptyVal'); // returns null

   cache.set('undefVal', undefined);
   cache.has('undefVal'); // returns true!
   ```

2. **Strict Validation:**
   - Passing `null` or `undefined` as a cache key throws a `TypeError`.
   - Passing a negative number for TTL throws a `RangeError`.
   - Passing non-numeric types for TTL throws a `TypeError`.
   - Passing a non-function callback to `getOrSet` throws a `TypeError`.

3. **Zero TTL:**
   - Setting `ttl: 0` expires the entry immediately.

4. **Promise Rejections in `getOrSet`:**
   - If an async callback rejects, the rejection propagates to your caller and **nothing** is saved into cache.

---

## Running Tests

CacheLite uses Node.js's native test runner (`node:test`) and strict assertion library (`node:assert/strict`). No extra testing dependencies are needed.

```bash
# Run unit tests
npm test

# Run tests with native code coverage
npm run test:coverage
```

### Try the Examples:

```bash
npm run example:basic
npm run example:ttl
npm run example:async
```

---

## Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure all tests pass (`npm test`).
4. Commit your changes (`git commit -m 'Add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
