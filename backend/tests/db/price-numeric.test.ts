import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, resetTables, eth, ALICE, BOB, CONTRACT } from './helpers.js';
import { marketplaceService } from '../../src/services/MarketplaceService.js';
import { analyticsService } from '../../src/services/AnalyticsService.js';

// Prices are TEXT wei strings. These tests pin the four places that used to compare or sort them as text, where 10 ETH
// ('10000000000000000000') sorts below 9 ETH ('9000000000000000000') and 0.5 ETH ('500000000000000000') sorts above 10 ETH.
// Every test checks first that its own data really does sort wrongly as text, so a pass means the numeric path was taken.

beforeEach(resetTables);
after(() => prisma.$disconnect());

const asText = (prices: string[]) => [...prices].sort();
const asNumber = (prices: string[]) => [...prices].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0));

async function listAt(prices: Array<{ tokenId: number; price: string; active?: boolean }>) {
  await prisma.marketplaceListing.createMany({
    data: prices.map(p => ({ nftContract: CONTRACT, tokenId: p.tokenId, seller: ALICE, price: p.price, active: p.active ?? true })),
  });
}

async function sellAt(prices: Array<{ tokenId: number; price: string }>) {
  await prisma.tradingHistory.createMany({
    data: prices.map(p => ({ nftContract: CONTRACT, tokenId: p.tokenId, seller: ALICE, buyer: BOB, price: p.price, platformFee: '0', royaltyFee: '0', transactionHash: `0x${p.tokenId}` })),
  });
}

test('positive control: the prices used below do sort wrongly as text, and eth() writes real wei', () => {
  const prices = [eth(0.5), eth(9), eth(10)];
  assert.deepEqual(asNumber(prices), [eth(0.5), eth(9), eth(10)]);
  assert.deepEqual(asText(prices), [eth(10), eth(0.5), eth(9)]);
  assert.equal(eth(10), '10000000000000000000');
});

test('floor price: 9 ETH is lower than 10 ETH, and 0.5 ETH is the floor of all three, where the text minimum picked 10 ETH', async () => {
  await listAt([{ tokenId: 1, price: eth(10) }, { tokenId: 2, price: eth(9) }]);
  const [textMin] = await prisma.$queryRaw<Array<{ min: string }>>`SELECT MIN(price) AS min FROM marketplace_listings WHERE active = true`;
  assert.equal(textMin.min, eth(10), 'control: MIN over the TEXT column returns the 10 ETH row, so this data triggers the old bug');
  assert.equal(await marketplaceService.getFloorPrice(), eth(9));

  await listAt([{ tokenId: 3, price: eth(0.5) }, { tokenId: 4, price: eth(0.1), active: false }]);
  assert.equal(await marketplaceService.getFloorPrice(), eth(0.5), 'a cancelled cheaper listing is ignored');
});

test('floor price returns the stored text unchanged, not a re-formatted number', async () => {
  await listAt([{ tokenId: 1, price: '1500' }, { tokenId: 2, price: '20000' }]);
  assert.equal(await marketplaceService.getFloorPrice(), '1500');
});

test('price range: 1 to 9.5 ETH keeps the 9 ETH listing and drops 0.5 and 10 ETH, which the text comparison let through', async () => {
  await listAt([{ tokenId: 1, price: eth(0.5) }, { tokenId: 2, price: eth(9) }, { tokenId: 3, price: eth(10) }, { tokenId: 4, price: eth(5), active: false }]);
  const [textCount] = await prisma.$queryRaw<Array<{ n: number }>>`
    SELECT COUNT(*)::integer AS n FROM marketplace_listings WHERE active = true AND price >= ${eth(1)} AND price <= ${eth(9.5)}`;
  assert.equal(textCount.n, 3, 'control: the text comparison matches all three active listings, so this data triggers the old bug');
  const rows = await marketplaceService.getListingsByPriceRange(eth(1), eth(9.5));
  assert.deepEqual(rows.map(r => r.token_id), [2]);
  assert.equal(rows[0].price, eth(9));
  assert.deepEqual(await marketplaceService.getListingsByPriceRange(eth(20), eth(30)), []);
});

test('price range: results are ordered cheapest first by value, so 0.5 ETH, 9 ETH, 10 ETH, and the bounds are inclusive', async () => {
  await listAt([{ tokenId: 1, price: eth(10) }, { tokenId: 2, price: eth(0.5) }, { tokenId: 3, price: eth(9) }]);
  assert.deepEqual((await marketplaceService.getListingsByPriceRange('0', eth(20))).map(r => r.token_id), [2, 3, 1]);
  assert.deepEqual((await marketplaceService.getListingsByPriceRange(eth(0.5), eth(9))).map(r => r.token_id), [2, 3]);
  assert.deepEqual((await marketplaceService.getListingsByPriceRange(eth(10), eth(10))).map(r => r.token_id), [1]);
});

test('price range: a bound with a decimal point or an exponent is a number, and a non-number is rejected without running SQL', async () => {
  await listAt([{ tokenId: 1, price: '2000' }, { tokenId: 2, price: '30000' }]);
  assert.deepEqual((await marketplaceService.getListingsByPriceRange('1999.5', '3e4')).map(r => r.token_id), [1, 2]);
  await assert.rejects(marketplaceService.getListingsByPriceRange('1; DROP TABLE marketplace_listings; --', '9'), /Failed to retrieve listings by price range/);
  assert.equal(await prisma.marketplaceListing.count(), 2);
});

test('marketplace most expensive sales: 10 ETH comes before 9 ETH before 0.5 ETH, and the limit keeps the top ones', async () => {
  await sellAt([{ tokenId: 1, price: eth(0.5) }, { tokenId: 2, price: eth(9) }, { tokenId: 3, price: eth(10) }]);
  const [textTop] = await prisma.$queryRaw<Array<{ token_id: number }>>`SELECT token_id FROM trading_history ORDER BY price DESC LIMIT 1`;
  assert.equal(textTop.token_id, 2, 'control: ORDER BY the TEXT column puts 9 ETH above 10 ETH, so this data triggers the old bug');
  assert.deepEqual((await marketplaceService.getMostExpensiveSales()).map(s => s.token_id), [3, 2, 1]);
  assert.deepEqual((await marketplaceService.getMostExpensiveSales(2)).map(s => s.token_id), [3, 2]);
  assert.deepEqual((await marketplaceService.getMostExpensiveSales(1)).map(s => s.price), [eth(10)]);
});

test('marketplace most expensive sales returns full snake_case rows', async () => {
  await sellAt([{ tokenId: 7, price: eth(1) }]);
  const [row] = await marketplaceService.getMostExpensiveSales();
  assert.deepEqual(Object.keys(row).sort(), ['buyer', 'created_at', 'id', 'nft_contract', 'platform_fee', 'price', 'royalty_fee', 'seller', 'sold_at', 'token_id', 'transaction_hash']);
  assert.equal(row.transaction_hash, '0x7');
});

test('price distribution: wei prices land in the right range, 10 ETH and above in the last one and nothing else there', async () => {
  await listAt([
    { tokenId: 1, price: eth(0.05) },
    { tokenId: 2, price: eth(0.3) },
    { tokenId: 3, price: eth(0.7) },
    { tokenId: 4, price: eth(2) },
    { tokenId: 5, price: eth(7) },
    { tokenId: 6, price: eth(12) },
    { tokenId: 7, price: eth(0.01), active: false },
  ]);
  const [ethThreshold] = await prisma.$queryRaw<Array<{ n: number }>>`
    SELECT COUNT(*)::integer AS n FROM marketplace_listings WHERE active = true AND CAST(price AS numeric) >= 10.0`;
  assert.equal(ethThreshold.n, 6, 'control: against a 10.0 ETH threshold written as 10.0, every wei price is in the top range, so this data triggers the old bug');
  assert.deepEqual(await analyticsService.getPriceDistribution(), [
    { range: '0.00 - 0.09', count: 1 },
    { range: '0.10 - 0.49', count: 1 },
    { range: '0.50 - 0.99', count: 1 },
    { range: '1.00 - 4.99', count: 1 },
    { range: '5.00 - 9.99', count: 1 },
    { range: '10.00+', count: 1 },
  ]);
});

test('price distribution: each threshold belongs to the range above it (0.1, 0.5, 1, 5 and 10 ETH exactly), and 9.999 ETH is below 10', async () => {
  await listAt([
    { tokenId: 1, price: eth(0.1) },
    { tokenId: 2, price: eth(0.5) },
    { tokenId: 3, price: eth(1) },
    { tokenId: 4, price: eth(5) },
    { tokenId: 5, price: eth(10) },
    { tokenId: 6, price: eth(9.999) },
    { tokenId: 7, price: '99999999999999999' },
  ]);
  assert.deepEqual(await analyticsService.getPriceDistribution(), [
    { range: '0.00 - 0.09', count: 1 },
    { range: '0.10 - 0.49', count: 1 },
    { range: '0.50 - 0.99', count: 1 },
    { range: '1.00 - 4.99', count: 1 },
    { range: '5.00 - 9.99', count: 2 },
    { range: '10.00+', count: 1 },
  ]);
});

test('price distribution with no active listing is an empty list', async () => {
  await listAt([{ tokenId: 1, price: eth(1), active: false }]);
  assert.deepEqual(await analyticsService.getPriceDistribution(), []);
});
