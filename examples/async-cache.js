/**
 * CacheLite - Asynchronous Cache (getOrSet) Example
 * Demonstrates transparent memoization and caching for slow async database or API queries.
 */

'use strict';

const CacheLite = require('../index');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Simulated external database with artificial latency
async function fetchUserFromDatabase(userId) {
  console.log(`  [DATABASE QUERY] Fetching user ${userId} from database (takes 250ms)...`);
  await sleep(250);
  return {
    id: userId,
    name: userId === 1 ? 'Ada Lovelace' : 'Alan Turing',
    role: 'Pioneer',
    queriedAt: new Date().toISOString(),
  };
}

async function run() {
  console.log('=== CacheLite getOrSet() Async Caching Example ===\n');

  const cache = new CacheLite({ defaultTTL: 3000 }); // 3 seconds TTL

  // First request: Cache Miss -> calls DB
  console.log('--- Request 1: User 1 (Expect Cache Miss) ---');
  console.time('Request 1 Duration');
  const user1 = await cache.getOrSet('user:1', () => fetchUserFromDatabase(1));
  console.timeEnd('Request 1 Duration');
  console.log('Result:', user1);

  // Second request: Cache Hit -> returns instant in-memory data
  console.log('\n--- Request 2: User 1 (Expect Cache Hit) ---');
  console.time('Request 2 Duration');
  const user1Cached = await cache.getOrSet('user:1', () => fetchUserFromDatabase(1));
  console.timeEnd('Request 2 Duration');
  console.log('Result:', user1Cached);

  // Synchronous getOrSet example
  console.log('\n--- Synchronous getOrSet Example ---');
  function expensiveMathCalculation(n) {
    console.log(`  [COMPUTATION] Running heavy CPU task for n=${n}...`);
    let sum = 0;
    for (let i = 0; i < 1e6; i++) sum += (i % 2 === 0 ? 1 : -1);
    return sum + n;
  }

  console.time('Sync Call 1 (Miss)');
  const res1 = cache.getOrSet('calc:100', () => expensiveMathCalculation(100));
  console.timeEnd('Sync Call 1 (Miss)');
  console.log('Result 1:', res1);

  console.time('Sync Call 2 (Hit)');
  const res2 = cache.getOrSet('calc:100', () => expensiveMathCalculation(100));
  console.timeEnd('Sync Call 2 (Hit)');
  console.log('Result 2:', res2);

  // Review performance statistics
  console.log('\n--- Cache Performance Statistics ---');
  console.log(cache.getStats());

  console.log('\nAsync caching demo complete!');
}

run();
