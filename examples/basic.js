/**
 * CacheLite - Basic Usage Example
 * Demonstrates standard cache operations: set, get, has, delete, clear, size, keys.
 */

'use strict';

const CacheLite = require('../index');

function run() {
  console.log('=== CacheLite Basic Operations Example ===\n');

  // Initialize a new cache instance
  const cache = new CacheLite();

  // 1. Store primitive and complex values
  console.log('1. Setting cache values...');
  cache.set('site_title', 'My Awesome Portal');
  cache.set('session:101', { userId: 42, username: 'dev_user', role: 'admin' });
  cache.set('isMaintenanceMode', false);
  cache.set('maxUploadMb', 50);

  // 2. Retrieve values
  console.log('\n2. Retrieving cached values:');
  console.log('site_title:', cache.get('site_title'));
  console.log('session:101:', cache.get('session:101'));
  console.log('isMaintenanceMode:', cache.get('isMaintenanceMode'));
  console.log('missing_key:', cache.get('missing_key')); // undefined

  // 3. Check for key existence
  console.log('\n3. Checking key existence:');
  console.log('has site_title?', cache.has('site_title')); // true
  console.log('has unknown?', cache.has('unknown')); // false

  // 4. Inspect cache size and keys
  console.log('\n4. Cache inspection:');
  console.log('Current size:', cache.size());
  console.log('All keys:', cache.keys());

  // 5. Delete a specific key
  console.log('\n5. Deleting "site_title"...');
  const deleted = cache.delete('site_title');
  console.log('Deleted successfully?', deleted);
  console.log('Size after deletion:', cache.size());

  // 6. Iterate through all remaining entries
  console.log('\n6. Iterating through entries:');
  for (const [key, value] of cache) {
    console.log(` - [${key}]:`, typeof value === 'object' ? JSON.stringify(value) : value);
  }

  // 7. Clear the cache
  console.log('\n7. Clearing cache...');
  cache.clear();
  console.log('Size after clear():', cache.size());
  console.log('\nBasic operations demo complete!');
}

run();
