import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, resetTables, failure, ALICE, BOB, CONTRACT } from './helpers.js';
import { nftService } from '../../src/services/NFTService.js';

beforeEach(resetTables);
after(() => prisma.$disconnect());

const meta = (name: string) => ({ name, description: 'd', image: 'ipfs://img', attributes: [{ trait_type: 'tier', value: 1 }] });

test('positive control: a wrong token id is a null result, never the seeded NFT', async () => {
  await nftService.createNFT(1, ALICE, 'ipfs://a');
  assert.equal((await nftService.getNFTById(1))?.token_id, 1);
  assert.equal(await nftService.getNFTById(2), null);
});

test('createNFT stores the row and getNFTById returns it in the snake_case row shape the routes expect', async () => {
  const mintedAt = new Date('2026-01-02T03:04:05Z');
  await nftService.createNFT(5, ALICE, 'ipfs://cid5', 'cid5', meta('Five'), BOB, 250, mintedAt);
  const row = await nftService.getNFTById(5);
  assert.ok(row);
  assert.deepEqual(Object.keys(row).sort(), [
    'created_at', 'ipfs_cid', 'metadata', 'minted_at', 'owner', 'royalty_amount', 'royalty_receiver', 'token_id', 'token_uri', 'updated_at',
  ]);
  assert.equal(row.owner, ALICE);
  assert.equal(row.token_uri, 'ipfs://cid5');
  assert.equal(row.ipfs_cid, 'cid5');
  assert.equal(row.royalty_receiver, BOB);
  assert.equal(row.royalty_amount, 250);
  assert.deepEqual(row.metadata, meta('Five'));
  assert.equal(row.minted_at?.toISOString(), mintedAt.toISOString());
  assert.ok(row.created_at instanceof Date);
});

test('createNFT stores empty optional values as NULL, and a royalty of 0 as NULL like the old query did', async () => {
  await nftService.createNFT(6, ALICE, 'ipfs://x', undefined, undefined, undefined, 0);
  const row = await nftService.getNFTById(6);
  assert.equal(row?.ipfs_cid, null);
  assert.equal(row?.metadata, null);
  assert.equal(row?.royalty_receiver, null);
  assert.equal(row?.royalty_amount, null);
});

test('createNFT on an existing token updates the row in place, keeps the first mint time and never makes a second row', async () => {
  const first = new Date('2026-01-01T00:00:00Z');
  await nftService.createNFT(9, ALICE, 'ipfs://old', 'old', meta('Old'), ALICE, 100, first);
  await nftService.createNFT(9, BOB, 'ipfs://new', 'new', meta('New'), BOB, 500, new Date('2026-06-01T00:00:00Z'));
  assert.equal(await prisma.nft.count(), 1);
  const row = await nftService.getNFTById(9);
  assert.equal(row?.owner, BOB);
  assert.equal(row?.token_uri, 'ipfs://new');
  assert.equal(row?.royalty_amount, 500);
  assert.deepEqual(row?.metadata, meta('New'));
  assert.equal(row?.minted_at?.toISOString(), first.toISOString());
});

test('createNFT is safe when the same token is indexed ten times at once', async () => {
  await Promise.all(Array.from({ length: 10 }, (_, i) => nftService.createNFT(3, ALICE, `ipfs://${i}`)));
  assert.equal(await prisma.nft.count(), 1);
});

test('positive control: Prisma update() on an unknown token throws P2025 not-found, which is why the service uses updateMany', async () => {
  const error = await failure(() => prisma.nft.update({ where: { tokenId: 404 }, data: { owner: BOB } }));
  assert.equal((error as { code?: string }).code, 'P2025');
});

test('updateNFTOwner, updateNFTRoyalty and updateNFTMetadata are silent no-ops for an unknown token and create nothing', async () => {
  await nftService.updateNFTOwner(404, BOB);
  await nftService.updateNFTRoyalty(404, BOB, 100);
  await nftService.updateNFTMetadata(404, meta('Ghost'));
  assert.equal(await prisma.nft.count(), 0);
});

test('updateNFTOwner changes the owner and moves updated_at forward, leaving other columns alone', async () => {
  await nftService.createNFT(2, ALICE, 'ipfs://two', 'two', meta('Two'), ALICE, 100);
  const before = await nftService.getNFTById(2);
  await new Promise(resolve => setTimeout(resolve, 15));
  await nftService.updateNFTOwner(2, BOB);
  const after = await nftService.getNFTById(2);
  assert.equal(after?.owner, BOB);
  assert.equal(after?.token_uri, 'ipfs://two');
  assert.equal(after?.royalty_amount, 100);
  assert.ok(after!.updated_at.getTime() > before!.updated_at.getTime());
});

test('updateNFTRoyalty and updateNFTMetadata write their own columns', async () => {
  await nftService.createNFT(4, ALICE, 'ipfs://four');
  await nftService.updateNFTRoyalty(4, BOB, 750);
  await nftService.updateNFTMetadata(4, meta('Four'));
  const row = await nftService.getNFTById(4);
  assert.equal(row?.royalty_receiver, BOB);
  assert.equal(row?.royalty_amount, 750);
  assert.deepEqual(row?.metadata, meta('Four'));
});

test('getNFTsByOwner ignores letter case, returns only that owner and orders by token id descending', async () => {
  await nftService.createNFT(1, ALICE, 'u1');
  await nftService.createNFT(3, ALICE, 'u3');
  await nftService.createNFT(2, BOB, 'u2');
  const rows = await nftService.getNFTsByOwner(ALICE.toUpperCase().replace('0X', '0x'));
  assert.deepEqual(rows.map(r => r.token_id), [3, 1]);
  assert.deepEqual(await nftService.getNFTsByOwner('0x0000000000000000000000000000000000000000'), []);
});

test('getNFTMetadata returns the stored metadata and null for an unknown token', async () => {
  await nftService.createNFT(1, ALICE, 'u', undefined, meta('One'));
  assert.deepEqual(await nftService.getNFTMetadata(1), meta('One'));
  assert.equal(await nftService.getNFTMetadata(99), null);
});

test('getTotalSupply counts rows as a plain number', async () => {
  assert.equal(await nftService.getTotalSupply(), 0);
  await nftService.createNFT(1, ALICE, 'a');
  await nftService.createNFT(2, ALICE, 'b');
  const supply = await nftService.getTotalSupply();
  assert.equal(supply, 2);
  assert.equal(typeof supply, 'number');
});

test('getRecentlyMinted orders by mint time descending with unminted rows last, then by token id, and honours the limit', async () => {
  await prisma.nft.createMany({
    data: [
      { tokenId: 1, owner: ALICE, tokenUri: 'a', mintedAt: new Date('2026-01-01T00:00:00Z') },
      { tokenId: 2, owner: ALICE, tokenUri: 'b', mintedAt: new Date('2026-03-01T00:00:00Z') },
      { tokenId: 3, owner: ALICE, tokenUri: 'c', mintedAt: null },
      { tokenId: 4, owner: ALICE, tokenUri: 'd', mintedAt: new Date('2026-03-01T00:00:00Z') },
    ],
  });
  assert.deepEqual((await nftService.getRecentlyMinted()).map(r => r.token_id), [4, 2, 1, 3]);
  assert.deepEqual((await nftService.getRecentlyMinted(2)).map(r => r.token_id), [4, 2]);
});

test('searchNFTs matches a token id fragment, an owner fragment and a metadata name regardless of case, newest first', async () => {
  await nftService.createNFT(12, ALICE, 'u', undefined, meta('Crimson Dragon'));
  await nftService.createNFT(120, BOB, 'u', undefined, meta('Blue Fox'));
  await nftService.createNFT(7, CONTRACT, 'u', undefined, meta('Other'));
  assert.deepEqual((await nftService.searchNFTs('12')).map(r => r.token_id), [120, 12]);
  assert.deepEqual((await nftService.searchNFTs('DRAGON')).map(r => r.token_id), [12]);
  assert.deepEqual((await nftService.searchNFTs(BOB.slice(0, 12).toUpperCase())).map(r => r.token_id), [120]);
  assert.deepEqual((await nftService.searchNFTs('zzz')).map(r => r.token_id), []);
  assert.equal((await nftService.searchNFTs('1', 1)).length, 1);
});

test('searchNFTs returns the same row shape as the other reads', async () => {
  await nftService.createNFT(1, ALICE, 'u', undefined, meta('Shape'), BOB, 5);
  const [fromSearch] = await nftService.searchNFTs('Shape');
  const fromRead = await nftService.getNFTById(1);
  assert.deepEqual(fromSearch, fromRead);
});

test('searchNFTs treats a hostile query as plain text: no rows, and the table is still there', async () => {
  await nftService.createNFT(1, ALICE, 'u');
  const hostile = `'; DROP TABLE nfts; --`;
  assert.deepEqual(await nftService.searchNFTs(hostile), []);
  assert.equal(await prisma.nft.count(), 1);
});
