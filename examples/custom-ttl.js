/**
 * CacheLite - Custom TTL and Expiration Example
 * Demonstrates default TTL, custom per-item TTL, lazy eviction, and cleanup().
 */

'use strict';

const CacheLite = require('../index');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('=== CacheLite Custom TTL & Expiration Example ===\n');

  // Initialize cache with default TTL of 1000 milliseconds (1 second)
  const cache = new CacheLite({
    defaultTTL: 1000,
    cleanupInterval: 5000, // optional automatic cleanup every 5s
  });

  console.log('1. Setting items with different TTL strategies...');

  // Uses default TTL (1000ms)
  cache.set('otp:user:123', '984521');

  // Overrides with custom TTL of 400ms
  cache.set('realtime_rate:USD_EUR', 0.92, 400);

  // Overrides with custom TTL of 2000ms
  cache.set('jwt_token:alice', 'eyJhbGciOi...', 2000);

  // Permanent item (no expiration)
  cache.set('app_config:theme', 'dark', null);

  console.log('Immediate status:');
  console.log('  otp:user:123 ->', cache.get('otp:user:123'));
  console.log('  realtime_rate ->', cache.get('realtime_rate:USD_EUR'));
  console.log('  app_config:theme ->', cache.get('app_config:theme'));
  console.log('  Valid entries size:', cache.size());

  console.log('\n2. Waiting 500ms (realtime_rate should expire)...');
  await sleep(500);

  console.log('  realtime_rate:', cache.get('realtime_rate:USD_EUR')); // undefined (expired)
  console.log('  otp:user:123:', cache.get('otp:user:123')); // still valid
  console.log('  Valid entries size:', cache.size());

  console.log('\n3. Waiting another 600ms (otp should expire)...');
  await sleep(600);

  console.log('  otp:user:123:', cache.get('otp:user:123')); // undefined (expired)
  console.log('  jwt_token:alice:', cache.get('jwt_token:alice') ? 'Valid' : 'Expired'); // still valid
  console.log('  app_config:theme:', cache.get('app_config:theme')); // permanent

  console.log('\n4. Active cleanup of expired entries...');
  const removed = cache.cleanup();
  console.log(`  Purged ${removed} expired entries from memory.`);
  console.log('  Remaining keys:', cache.keys());

  // Clean up timer before exit
  cache.destroy();
  console.log('\nTTL and expiration demo complete!');
}

run();
