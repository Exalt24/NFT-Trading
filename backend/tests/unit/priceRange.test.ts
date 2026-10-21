import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceRangeError } from '../../src/api/priceRange.js';

test('a plain pair of wei or decimal bounds goes through', () => {
  assert.equal(priceRangeError('0', '9000000000000000000'), null);
  assert.equal(priceRangeError('1.5', '10'), null);
  assert.equal(priceRangeError('1e3', '2e3'), null);
});

test('a missing bound is the required message', () => {
  assert.equal(priceRangeError('', '5'), 'Both min and max price are required');
  assert.equal(priceRangeError(undefined, '5'), 'Both min and max price are required');
  assert.equal(priceRangeError(['1', '2'], '5'), 'Both min and max price are required');
});

test('a bound Postgres cannot cast is rejected here, not as a 500 from the query', () => {
  for (const bad of ['0x10', '5abc', 'abc', 'NaN', 'Infinity', '1,5', ' 1', '1 ', '1e', '--1', '1; DROP TABLE x']) {
    assert.equal(priceRangeError(bad, '9'), 'Invalid price values', bad);
    assert.equal(priceRangeError('1', bad), 'Invalid price values', bad);
  }
});

test('a negative bound and a reversed range keep their own messages', () => {
  assert.equal(priceRangeError('-1', '5'), 'Prices must be positive');
  assert.equal(priceRangeError('9', '1'), 'Min price cannot be greater than max price');
});
