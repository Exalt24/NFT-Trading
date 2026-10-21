import { Prisma } from '../generated/prisma/client.js';

/**
 * Case-insensitive equality filter. Addresses are stored lowercase by the indexer, but the REST routes pass whatever the caller
 * typed, so every address lookup compares case-insensitively (the old SQL did the same with LOWER(column) = LOWER($1)).
 */
export const ci = (value: string) => ({ equals: value, mode: 'insensitive' as const });

// The tables use `timestamp without time zone`, and Prisma Client reads and writes those columns as UTC. The few raw statements
// below must write UTC too, whatever time zone the database session or the Node process is set to, so they build their
// timestamps with these two fragments instead of relying on NOW() or on how a driver would serialize a Date.

/** The current time as UTC wall-clock time, for a `timestamp without time zone` column. */
export const nowUtc = Prisma.sql`(NOW() AT TIME ZONE 'UTC')`;

/** A JS Date as UTC wall-clock time, for a `timestamp without time zone` column. */
export const utc = (date: Date) => Prisma.sql`(${date.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
