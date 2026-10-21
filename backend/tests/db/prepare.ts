import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { adminDatabaseUrl, testDatabaseName, testDatabaseUrl } from './testEnv.js';

// Runs before `npm run test:db`: drops and recreates the test database, then applies the repo's own migration script to it.
// The test database name is derived (<name>_test), so this can never drop the development database.

const name = testDatabaseName();
if (!name.endsWith('_test')) {
  throw new Error(`Refusing to drop "${name}": a test database name must end in _test`);
}

const admin = new pg.Client({ connectionString: adminDatabaseUrl() });
try {
  await admin.connect();
} catch (error) {
  console.error('Cannot reach PostgreSQL for the database tests. Start it with `docker compose up -d --wait postgres` and set DATABASE_URL (see backend/.env.example).');
  throw error;
}
await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${name}"`);
await admin.end();

const migrate = spawnSync('npm', ['run', 'migrate'], {
  shell: true,
  encoding: 'utf8',
  env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
});
if (migrate.status !== 0) {
  console.error(migrate.stdout, migrate.stderr);
  throw new Error('The migration script failed on the test database');
}
console.log(`Test database ${name} rebuilt from migrations/001_nft_tables.sql`);
