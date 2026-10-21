import { resolveDatabaseUrl } from '../../src/config/databaseUrl.js';

/**
 * The Prisma tests never touch the development database. They run against a sibling database named <name>_test on the same server,
 * which `npm run test:db` drops and rebuilds from migrations/001_nft_tables.sql before every run.
 */
export function testDatabaseUrl(): string {
  const url = new URL(resolveDatabaseUrl());
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = '/' + (name.endsWith('_test') ? name : `${name}_test`);
  return url.toString();
}

export function testDatabaseName(): string {
  return decodeURIComponent(new URL(testDatabaseUrl()).pathname.slice(1));
}

/** The same server, connected to the always-present `postgres` database, so the test database can be dropped and created. */
export function adminDatabaseUrl(): string {
  const url = new URL(testDatabaseUrl());
  url.pathname = '/postgres';
  return url.toString();
}
