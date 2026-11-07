/**
 * CacheLite - ES Module Usage Example
 * Demonstrates default/named imports and async cache-aside in ESM.
 */

import CacheLite, { CacheLite as NamedCacheLite } from '../index.mjs';

console.log('=== CacheLite ESM Example ===\n');
console.log('Default and named exports are identical:', CacheLite === NamedCacheLite);

const cache = new CacheLite({ defaultTTL: 3000 });

const user = await cache.getOrSet('user:7', async () => {
  console.log('Computing user from the "database"...');
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { id: 7, name: 'Grace Hopper' };
});

console.log('First result:', user);
console.log('Second result (cache hit):', await cache.getOrSet('user:7', async () => {
  throw new Error('This callback should not run on a cache hit.');
}));
console.log('Stats:', cache.getStats());

cache.destroy();
console.log('\nESM demo complete!');
