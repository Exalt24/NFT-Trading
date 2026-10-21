// The price range query is compared as a number in SQL (CAST(price AS numeric)), so a bound has to be
// something Postgres can cast. parseFloat accepts "0x10" and "5abc", which then fail inside the query as a 500.
const PLAIN_NUMBER = /^-?(\d{1,60}(\.\d{1,30})?|\.\d{1,30})(e[+-]?\d{1,3})?$/i;

/** The error message for a bad min/max pair, or null when the pair can go to the query. */
export function priceRangeError(min: unknown, max: unknown): string | null {
  if (typeof min !== 'string' || typeof max !== 'string' || !min || !max) {
    return 'Both min and max price are required';
  }
  if (!PLAIN_NUMBER.test(min) || !PLAIN_NUMBER.test(max)) {
    return 'Invalid price values';
  }
  if (parseFloat(min) < 0 || parseFloat(max) < 0) {
    return 'Prices must be positive';
  }
  if (parseFloat(min) > parseFloat(max)) {
    return 'Min price cannot be greater than max price';
  }
  return null;
}
