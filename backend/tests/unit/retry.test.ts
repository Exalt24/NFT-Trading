import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextDelay, retry } from '../../src/utils/retry.js';

test('nextDelay doubles for exponential backoff and grows by one step for linear', () => {
  assert.deepEqual([1, 2, 3, 4].map(a => nextDelay(a, 100)), [100, 200, 400, 800]);
  assert.deepEqual([1, 2, 3, 4].map(a => nextDelay(a, 100, 'linear')), [100, 200, 300, 400]);
});

test('a call that succeeds first time runs once and waits for nothing', async () => {
  let calls = 0;
  const value = await retry(async () => {
    calls++;
    return 'ok';
  }, { maxAttempts: 3, delayMs: 1 });
  assert.equal(value, 'ok');
  assert.equal(calls, 1);
});

test('a transient failure is retried and the eventual result is returned', async () => {
  let calls = 0;
  const seen: number[] = [];
  const value = await retry(async () => {
    calls++;
    if (calls < 3) throw new Error('rpc dropped');
    return calls;
  }, { maxAttempts: 5, delayMs: 1, onRetry: attempt => seen.push(attempt) });
  assert.equal(value, 3);
  assert.deepEqual(seen, [1, 2]);
});

test('when every attempt fails the LAST error is thrown, after exactly maxAttempts calls', async () => {
  let calls = 0;
  await assert.rejects(
    retry(async () => {
      calls++;
      throw new Error('failure ' + calls);
    }, { maxAttempts: 3, delayMs: 1 }),
    /failure 3/,
  );
  assert.equal(calls, 3);
});

test('the wait between attempts really grows (exponential): three attempts take at least the sum of the first two delays', async () => {
  const started = Date.now();
  await assert.rejects(retry(async () => { throw new Error('x'); }, { maxAttempts: 3, delayMs: 20 }));
  assert.ok(Date.now() - started >= 55, 'expected at least 20 + 40 ms of waiting');
});

test('maxAttempts of 0 does not silently succeed with undefined: it rejects with a clear error', async () => {
  await assert.rejects(retry(async () => 'never called', { maxAttempts: 0, delayMs: 1 }), /maxAttempts must be at least 1/);
});
