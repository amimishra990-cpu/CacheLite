'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import CacheLite, { CacheLite as NamedCacheLite } from '@hollowintent/cachelite';

test('ESM default and named exports reference the same class', () => {
  assert.equal(CacheLite, NamedCacheLite);

  const cache = new CacheLite();
  cache.set('key', 'value');
  assert.equal(cache.get('key'), 'value');
});

test('ESM instance supports TTL and async getOrSet()', async () => {
  const cache = new CacheLite({ defaultTTL: 1000 });

  const value = await cache.getOrSet('async', async () => 'esm_value');
  assert.equal(value, 'esm_value');
  assert.equal(cache.get('async'), 'esm_value');

  cache.set('temporary', 'gone', 10);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(cache.has('temporary'), false);
});
