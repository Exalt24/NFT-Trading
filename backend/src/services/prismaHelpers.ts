/**
 * Case-insensitive equality filter. Addresses are stored lowercase by the indexer, but the REST routes pass whatever the caller
 * typed, so every address lookup compares case-insensitively (the old SQL did the same with LOWER(column) = LOWER($1)).
 */
export const ci = (value: string) => ({ equals: value, mode: 'insensitive' as const });
