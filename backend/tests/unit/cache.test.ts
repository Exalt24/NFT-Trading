import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CacheService } from '../../src/services/CacheService.js';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('set and get round-trip any JSON value, and a missing key is null', () => {
  const cache = new CacheService();
  cache.set('n', 42);
  cache.set('o', { nested: { ok: true } });
  assert.equal(cache.get('n'), 42);
  assert.deepEqual(cache.get('o'), { nested: { ok: true } });
  assert.equal(cache.get('missing'), null);
  assert.equal(cache.has('n'), true);
  assert.equal(cache.has('missing'), false);
  cache.destroy();
});

test('an entry expires after its TTL and is no longer reported as present', async () => {
  const cache = new CacheService();
  cache.set('short', 'x', 0.05);
  assert.equal(cache.get('short'), 'x');
  await wait(90);
  assert.equal(cache.get('short'), null);
  assert.equal(cache.has('short'), false);
  cache.destroy();
});

test('delete removes one key and clear removes all', () => {
  const cache = new CacheService();
  cache.set('a', 1);
  cache.set('b', 2);
  assert.equal(cache.delete('a'), true);
  assert.equal(cache.get('a'), null);
  assert.equal(cache.get('b'), 2);
  cache.clear();
  assert.equal(cache.getStats().totalEntries, 0);
  cache.destroy();
});

test('stats separate live entries from expired ones that have not been swept yet', async () => {
  const cache = new CacheService();
  cache.set('live', 1, 60);
  cache.set('dead', 1, 0.02);
  await wait(60);
  const stats = cache.getStats();
  assert.equal(stats.validEntries, 1);
  assert.equal(stats.expiredEntries, 1);
  cache.destroy();
});

test('cached() computes once, serves the second call from the cache, and recomputes after clear()', async () => {
  const cache = new CacheService();
  let calls = 0;
  const compute = async () => ++calls;
  assert.equal(await cache.cached('k', 60, compute), 1);
  assert.equal(await cache.cached('k', 60, compute), 1);
  assert.equal(calls, 1);
  cache.clear();
  assert.equal(await cache.cached('k', 60, compute), 2);
  cache.destroy();
});

test('a burst of identical requests shares ONE computation', async () => {
  const cache = new CacheService();
  let calls = 0;
  const slow = async () => {
    calls++;
    await wait(40);
    return 'result';
  };
  const results = await Promise.all([cache.cached('burst', 60, slow), cache.cached('burst', 60, slow), cache.cached('burst', 60, slow)]);
  assert.deepEqual(results, ['result', 'result', 'result']);
  assert.equal(calls, 1);
  cache.destroy();
});

test('a failing computation is not cached, reaches every waiter, and the next call tries again', async () => {
  const cache = new CacheService();
  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls === 1) throw new Error('database down');
    return 'recovered';
  };
  await assert.rejects(cache.cached('f', 60, flaky), /database down/);
  assert.equal(cache.get('f'), null);
  assert.equal(await cache.cached('f', 60, flaky), 'recovered');
  assert.equal(calls, 2);
  cache.destroy();
});

test('different keys never share a value', async () => {
  const cache = new CacheService();
  assert.equal(await cache.cached('a', 60, async () => 'A'), 'A');
  assert.equal(await cache.cached('b', 60, async () => 'B'), 'B');
  cache.destroy();
});
