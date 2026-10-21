import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, resetTables, CONTRACT, MARKET } from './helpers.js';
import { getLastSyncedBlock, setLastSyncedBlock } from '../../src/services/syncStatusStore.js';
import { ipfsService } from '../../src/services/IPFSService.js';

beforeEach(resetTables);
after(() => prisma.$disconnect());

const cacheMetadata = (cid: string, metadata: object) =>
  (ipfsService as unknown as { cacheMetadata(cid: string, metadata: object): Promise<void> }).cacheMetadata(cid, metadata);

test('positive control: a contract the indexer has never seen reads as block 0 and a missing row is not a stored block', async () => {
  assert.equal(await prisma.syncStatus.count(), 0);
  assert.equal(await getLastSyncedBlock(CONTRACT), 0);
  assert.equal(await prisma.syncStatus.count(), 1);
  await setLastSyncedBlock(CONTRACT, 40);
  assert.notEqual(await getLastSyncedBlock(CONTRACT), 0);
});

test('setLastSyncedBlock moves the marker, and reading it again does not reset it', async () => {
  await getLastSyncedBlock(CONTRACT);
  await setLastSyncedBlock(CONTRACT, 120);
  assert.equal(await getLastSyncedBlock(CONTRACT), 120);
  assert.equal(await getLastSyncedBlock(CONTRACT), 120);
  assert.equal(await prisma.syncStatus.count(), 1);
});

test('the contract address is stored lowercase, so either letter case finds the same row', async () => {
  await getLastSyncedBlock(CONTRACT.toUpperCase().replace('0X', '0x'));
  await setLastSyncedBlock(CONTRACT, 7);
  assert.equal(await getLastSyncedBlock(CONTRACT.toUpperCase().replace('0X', '0x')), 7);
  assert.equal(await prisma.syncStatus.count(), 1);
  assert.equal((await prisma.syncStatus.findFirst())?.contractAddress, CONTRACT);
});

test('setLastSyncedBlock ignores a missing or non-numeric block and does not create a row for an unknown contract', async () => {
  await getLastSyncedBlock(CONTRACT);
  await setLastSyncedBlock(CONTRACT, 55);
  await setLastSyncedBlock(CONTRACT, NaN);
  await setLastSyncedBlock(CONTRACT, undefined as unknown as number);
  assert.equal(await getLastSyncedBlock(CONTRACT), 55);
  await setLastSyncedBlock(MARKET, 9);
  assert.equal(await prisma.syncStatus.count(), 1);
});

test('two contracts keep separate markers', async () => {
  await getLastSyncedBlock(CONTRACT);
  await getLastSyncedBlock(MARKET);
  await setLastSyncedBlock(CONTRACT, 10);
  await setLastSyncedBlock(MARKET, 20);
  assert.equal(await getLastSyncedBlock(CONTRACT), 10);
  assert.equal(await getLastSyncedBlock(MARKET), 20);
});

test('ten simultaneous first reads of a new contract end with one row and no error', async () => {
  const reads = await Promise.all(Array.from({ length: 10 }, () => getLastSyncedBlock(CONTRACT)));
  assert.deepEqual(reads, Array(10).fill(0));
  assert.equal(await prisma.syncStatus.count(), 1);
});

test('the IPFS metadata cache stores a document, replaces it on a second write and keeps one row per content id', async () => {
  await cacheMetadata('cid1', { name: 'first' });
  await cacheMetadata('cid1', { name: 'second' });
  await cacheMetadata('cid2', { name: 'other' });
  assert.equal(await prisma.ipfsMetadataCache.count(), 2);
  assert.deepEqual((await prisma.ipfsMetadataCache.findUnique({ where: { cid: 'cid1' } }))?.metadata, { name: 'second' });
});

test('getMetadata answers from the cache without any network call', async () => {
  await cacheMetadata('cached-cid', { name: 'From cache', image: 'ipfs://i', description: 'd', attributes: [] });
  assert.deepEqual(await ipfsService.getMetadata('cached-cid'), { name: 'From cache', image: 'ipfs://i', description: 'd', attributes: [] });
});
