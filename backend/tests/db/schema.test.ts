import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prisma, resetTables, failure, CONTRACT, ALICE } from './helpers.js';
import { testDatabaseUrl } from './testEnv.js';

before(resetTables);
after(() => prisma.$disconnect());

// POSITIVE CONTROLS. Before trusting any green test below, these show that a wrong query really fails and that
// "not found" is distinguishable from "found", so the later assertions are able to go red.

test('positive control: a query on a table that does not exist is rejected', async () => {
  const error = await failure(() => prisma.$queryRaw`SELECT * FROM no_such_table`);
  assert.match(error.message, /no_such_table/);
});

test('positive control: the right filter finds a seeded row and a deliberately wrong filter finds nothing', async () => {
  await prisma.nft.create({ data: { tokenId: 7, owner: ALICE, tokenUri: 'ipfs://x' } });
  assert.equal((await prisma.nft.findUnique({ where: { tokenId: 7 } }))?.owner, ALICE);
  assert.equal(await prisma.nft.findUnique({ where: { tokenId: 8 } }), null);
  assert.equal(await prisma.nft.count({ where: { owner: '0xdeadbeef' } }), 0);
});

test('the tests run against the _test database, built by the repo migration, with all five tables', async () => {
  const [{ current_database }] = await prisma.$queryRaw<Array<{ current_database: string }>>`SELECT current_database()`;
  assert.match(current_database, /_test$/);
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  assert.deepEqual(tables.map(t => t.table_name), ['ipfs_metadata_cache', 'marketplace_listings', 'nfts', 'sync_status', 'trading_history']);
});

test('all ten named indexes from the migration exist, so the schema file did not lose any', async () => {
  const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx\\_%' ORDER BY indexname`;
  assert.deepEqual(rows.map(r => r.indexname), [
    'idx_history_buyer', 'idx_history_seller', 'idx_history_sold_at', 'idx_history_token',
    'idx_listing_active', 'idx_listing_listed_at', 'idx_listing_nft', 'idx_listing_seller',
    'idx_nft_minted_at', 'idx_nft_owner',
  ]);
});

test('the UNIQUE (nft_contract, token_id) constraint rejects a second listing row with Prisma error P2002', async () => {
  await prisma.marketplaceListing.create({ data: { nftContract: CONTRACT, tokenId: 1, seller: ALICE, price: '1' } });
  const error = await failure(() => prisma.marketplaceListing.create({ data: { nftContract: CONTRACT, tokenId: 1, seller: ALICE, price: '2' } }));
  assert.equal((error as { code?: string }).code, 'P2002');
});

test('the UNIQUE contract_address constraint rejects a second sync_status row', async () => {
  await prisma.syncStatus.create({ data: { contractAddress: CONTRACT, lastSyncedBlock: 1 } });
  const error = await failure(() => prisma.syncStatus.create({ data: { contractAddress: CONTRACT, lastSyncedBlock: 2 } }));
  assert.equal((error as { code?: string }).code, 'P2002');
});

// SCHEMA DRIFT: schema.prisma must describe exactly what the SQL migration builds.

const run = (args: string[]) =>
  spawnSync('npx', ['prisma', 'migrate', 'diff', '--from-config-datasource', '--to-schema', ...args, '--exit-code'], {
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
  });

test('positive control: a schema with one index removed is reported as drift (exit code 2)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nft-drift-'));
  const broken = join(dir, 'schema.prisma');
  const original = readFileSync('prisma/schema.prisma', 'utf8');
  const mutated = original.replace('  @@index([owner], map: "idx_nft_owner")\n', '');
  assert.notEqual(mutated, original, 'the control must actually change the schema');
  writeFileSync(broken, mutated);
  assert.equal(run([broken]).status, 2);
});

test('prisma/schema.prisma has no drift from the migrated database (exit code 0)', () => {
  const result = run(['prisma/schema.prisma']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
