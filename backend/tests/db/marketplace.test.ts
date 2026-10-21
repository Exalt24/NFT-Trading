import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, resetTables, eth, ALICE, BOB, CAROL, CONTRACT, MARKET } from './helpers.js';
import { marketplaceService } from '../../src/services/MarketplaceService.js';

beforeEach(resetTables);
after(() => prisma.$disconnect());

const at = (iso: string) => new Date(iso);

test('positive control: asking for a token that was never listed gives null, not another token', async () => {
  await marketplaceService.createListing(CONTRACT, 1, ALICE, eth(1));
  assert.equal((await marketplaceService.getListingByToken(CONTRACT, 1))?.token_id, 1);
  assert.equal(await marketplaceService.getListingByToken(CONTRACT, 2), null);
});

test('createListing stores an active listing and getListingByToken returns the snake_case row, ignoring contract letter case', async () => {
  await marketplaceService.createListing(CONTRACT, 1, ALICE, eth(1.5), at('2026-02-03T04:05:06Z'));
  const row = await marketplaceService.getListingByToken(CONTRACT.toUpperCase().replace('0X', '0x'), 1);
  assert.ok(row);
  assert.deepEqual(Object.keys(row).sort(), ['active', 'created_at', 'id', 'listed_at', 'nft_contract', 'price', 'seller', 'token_id', 'updated_at']);
  assert.equal(row.price, '1500000000000000000');
  assert.equal(row.active, true);
  assert.equal(row.seller, ALICE);
  assert.equal(row.listed_at?.toISOString(), '2026-02-03T04:05:06.000Z');
});

test('listing a token again re-activates the same row with the new seller and price, never a second row', async () => {
  await marketplaceService.createListing(CONTRACT, 1, ALICE, eth(1));
  await marketplaceService.cancelListing(CONTRACT, 1);
  assert.equal((await marketplaceService.getListingByToken(CONTRACT, 1))?.active, false);

  await marketplaceService.createListing(CONTRACT, 1, BOB, eth(2), at('2026-05-05T00:00:00Z'));
  assert.equal(await prisma.marketplaceListing.count(), 1);
  const row = await marketplaceService.getListingByToken(CONTRACT, 1);
  assert.equal(row?.active, true);
  assert.equal(row?.seller, BOB);
  assert.equal(row?.price, eth(2));
  assert.equal(row?.listed_at?.toISOString(), '2026-05-05T00:00:00.000Z');
});

test('ten simultaneous listings of one token end as one row with no error (the upsert is atomic)', async () => {
  await Promise.all(Array.from({ length: 10 }, (_, i) => marketplaceService.createListing(CONTRACT, 1, ALICE, eth(i + 1))));
  assert.equal(await prisma.marketplaceListing.count(), 1);
});

test('getActiveListings drops cancelled listings and orders by listing time descending, unlisted last, then by creation', async () => {
  await prisma.marketplaceListing.createMany({
    data: [
      { nftContract: CONTRACT, tokenId: 1, seller: ALICE, price: '1', listedAt: at('2026-01-01T00:00:00Z') },
      { nftContract: CONTRACT, tokenId: 2, seller: ALICE, price: '1', listedAt: at('2026-04-01T00:00:00Z') },
      { nftContract: CONTRACT, tokenId: 3, seller: ALICE, price: '1', listedAt: null },
      { nftContract: CONTRACT, tokenId: 4, seller: ALICE, price: '1', listedAt: at('2026-09-01T00:00:00Z'), active: false },
    ],
  });
  assert.deepEqual((await marketplaceService.getActiveListings()).map(r => r.token_id), [2, 1, 3]);
});

test('getListingsBySeller ignores letter case and puts active listings first', async () => {
  await prisma.marketplaceListing.createMany({
    data: [
      { nftContract: CONTRACT, tokenId: 1, seller: ALICE, price: '1', listedAt: at('2026-03-01T00:00:00Z'), active: false },
      { nftContract: CONTRACT, tokenId: 2, seller: ALICE, price: '1', listedAt: at('2026-01-01T00:00:00Z') },
      { nftContract: CONTRACT, tokenId: 3, seller: BOB, price: '1' },
    ],
  });
  const rows = await marketplaceService.getListingsBySeller(ALICE.toUpperCase().replace('0X', '0x'));
  assert.deepEqual(rows.map(r => r.token_id), [2, 1]);
});

test('getFloorPrice is "0" with no active listing and otherwise the lowest active price as a string', async () => {
  assert.equal(await marketplaceService.getFloorPrice(), '0');
  await prisma.marketplaceListing.createMany({
    data: [
      { nftContract: CONTRACT, tokenId: 1, seller: ALICE, price: eth(3) },
      { nftContract: CONTRACT, tokenId: 2, seller: ALICE, price: eth(2) },
      { nftContract: CONTRACT, tokenId: 3, seller: ALICE, price: eth(1), active: false },
    ],
  });
  assert.equal(await marketplaceService.getFloorPrice(), eth(2));
});

test('updateListingPrice and cancelListing change only the matching listing and do nothing for an unknown token', async () => {
  await marketplaceService.createListing(CONTRACT, 1, ALICE, eth(1));
  await marketplaceService.createListing(CONTRACT, 2, ALICE, eth(1));
  await marketplaceService.updateListingPrice(CONTRACT.toUpperCase().replace('0X', '0x'), 1, eth(4));
  await marketplaceService.cancelListing(CONTRACT, 2);
  await marketplaceService.updateListingPrice(CONTRACT, 99, eth(9));
  await marketplaceService.cancelListing(CONTRACT, 99);
  assert.equal((await marketplaceService.getListingByToken(CONTRACT, 1))?.price, eth(4));
  assert.equal((await marketplaceService.getListingByToken(CONTRACT, 1))?.active, true);
  assert.equal((await marketplaceService.getListingByToken(CONTRACT, 2))?.active, false);
  assert.equal(await prisma.marketplaceListing.count(), 2);
});

test('recordSale writes the sale and closes the listing for that token, and leaves other listings active', async () => {
  await marketplaceService.createListing(CONTRACT, 1, ALICE, eth(1));
  await marketplaceService.createListing(CONTRACT, 2, ALICE, eth(1));
  await marketplaceService.recordSale(CONTRACT, 1, ALICE, BOB, eth(1), eth(0.025), eth(0.05), '0xabc', at('2026-06-01T10:00:00Z'));
  assert.equal(await prisma.tradingHistory.count(), 1);
  assert.equal((await marketplaceService.getListingByToken(CONTRACT, 1))?.active, false);
  assert.equal((await marketplaceService.getListingByToken(CONTRACT, 2))?.active, true);
  const [sale] = await marketplaceService.getPriceHistory(CONTRACT, 1);
  assert.deepEqual(
    { buyer: sale.buyer, price: sale.price, fee: sale.platform_fee, royalty: sale.royalty_fee, hash: sale.transaction_hash },
    { buyer: BOB, price: eth(1), fee: eth(0.025), royalty: eth(0.05), hash: '0xabc' },
  );
});

test('a sale that fails to save reports an error and leaves the listing active', async () => {
  await marketplaceService.createListing(CONTRACT, 1, ALICE, eth(1));
  const tooLong = '0x' + 'f'.repeat(80); // transaction_hash is VARCHAR(66)
  await assert.rejects(marketplaceService.recordSale(CONTRACT, 1, ALICE, BOB, eth(1), '0', '0', tooLong), /Failed to record sale/);
  assert.equal(await prisma.tradingHistory.count(), 0);
  assert.equal((await marketplaceService.getListingByToken(CONTRACT, 1))?.active, true);
});

test('getPriceHistory is per token and per contract, newest sale first', async () => {
  const sale = (tokenId: number, contract: string, when: string) =>
    marketplaceService.recordSale(contract, tokenId, ALICE, BOB, eth(1), '0', '0', '0x1', at(when));
  await sale(1, CONTRACT, '2026-01-01T00:00:00Z');
  await sale(1, CONTRACT, '2026-03-01T00:00:00Z');
  await sale(2, CONTRACT, '2026-02-01T00:00:00Z');
  await sale(1, MARKET, '2026-02-01T00:00:00Z');
  const history = await marketplaceService.getPriceHistory(CONTRACT, 1);
  assert.deepEqual(history.map(h => h.sold_at?.toISOString()), ['2026-03-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z']);
});

test('getRecentSales orders by sale time descending and honours the limit', async () => {
  for (const [token, when] of [[1, '2026-01-01'], [2, '2026-03-01'], [3, '2026-02-01']] as const) {
    await marketplaceService.recordSale(CONTRACT, token, ALICE, BOB, eth(1), '0', '0', '0x1', at(`${when}T00:00:00Z`));
  }
  assert.deepEqual((await marketplaceService.getRecentSales()).map(s => s.token_id), [2, 3, 1]);
  assert.deepEqual((await marketplaceService.getRecentSales(1)).map(s => s.token_id), [2]);
});

test('getTradingVolume adds wei prices exactly as a string and counts sales as a number', async () => {
  assert.deepEqual(await marketplaceService.getTradingVolume(), { totalVolume: '0', totalSales: 0 });
  await marketplaceService.recordSale(CONTRACT, 1, ALICE, BOB, eth(1.5), '0', '0', '0x1');
  await marketplaceService.recordSale(CONTRACT, 2, ALICE, BOB, eth(2.25), '0', '0', '0x2');
  const volume = await marketplaceService.getTradingVolume();
  assert.deepEqual(volume, { totalVolume: '3750000000000000000', totalSales: 2 });
  assert.equal(typeof volume.totalSales, 'number');
});

test('getListingsByPriceRange keeps active listings inside the inclusive bounds, cheapest first', async () => {
  await prisma.marketplaceListing.createMany({
    data: [
      { nftContract: CONTRACT, tokenId: 1, seller: ALICE, price: '300' },
      { nftContract: CONTRACT, tokenId: 2, seller: ALICE, price: '100' },
      { nftContract: CONTRACT, tokenId: 3, seller: ALICE, price: '200' },
      { nftContract: CONTRACT, tokenId: 4, seller: ALICE, price: '250', active: false },
      { nftContract: CONTRACT, tokenId: 5, seller: ALICE, price: '400' },
    ],
  });
  assert.deepEqual((await marketplaceService.getListingsByPriceRange('100', '300')).map(r => r.token_id), [2, 3, 1]);
});

test('getMostExpensiveSales returns the highest-priced rows first and honours the limit', async () => {
  for (const [token, price] of [[1, '111'], [2, '333'], [3, '222']] as const) {
    await marketplaceService.recordSale(CONTRACT, token, ALICE, BOB, price, '0', '0', '0x1');
  }
  assert.deepEqual((await marketplaceService.getMostExpensiveSales(2)).map(s => s.token_id), [2, 3]);
});

test('getActivityHistory merges mints, listings and sales newest first, as JSON-safe values, and honours the limit', async () => {
  await prisma.nft.create({ data: { tokenId: 1, owner: ALICE, tokenUri: 'ipfs://one', mintedAt: at('2026-01-01T00:00:00Z') } });
  await prisma.marketplaceListing.create({ data: { nftContract: CONTRACT, tokenId: 1, seller: ALICE, price: eth(1), listedAt: at('2026-01-02T00:00:00Z') } });
  await prisma.tradingHistory.create({
    data: { nftContract: CONTRACT, tokenId: 1, seller: ALICE, buyer: BOB, price: eth(1), platformFee: '1', royaltyFee: '2', soldAt: at('2026-01-03T00:00:00Z') },
  });
  const feed = await marketplaceService.getActivityHistory();
  assert.deepEqual(feed.map(e => e.type), ['nftSold', 'nftListed', 'nftMinted']);
  assert.equal(feed[0].timestamp, at('2026-01-03T00:00:00Z').getTime());
  assert.deepEqual(feed[0].data, { seller: ALICE, buyer: BOB, price: eth(1), platformFee: '1', royaltyFee: '2' });
  assert.deepEqual(feed[2].data, { owner: ALICE, tokenURI: 'ipfs://one' });
  assert.equal(feed[0].blockNumber, 0);
  assert.doesNotThrow(() => JSON.stringify(feed));
  assert.equal((await marketplaceService.getActivityHistory(2)).length, 2);
});
