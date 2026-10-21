import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, resetTables, failure, eth, ALICE, BOB, CAROL, CONTRACT } from './helpers.js';
import { analyticsService } from '../../src/services/AnalyticsService.js';

beforeEach(resetTables);
after(() => prisma.$disconnect());

const DAVE = '0x90f79bf6eb2c4f870365e785982e1f101e93b906';

/** A moment `daysAgo` days before today, at a fixed UTC hour, so the tests do not depend on what time they run. */
const day = (daysAgo: number, hour: number): Date => {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
};
const dateOf = (d: Date) => d.toISOString().slice(0, 10);

/** Four sales, three NFTs and three listings with figures small enough to check by hand. Prices are in ETH, stored as wei strings. */
async function seed() {
  await prisma.nft.createMany({
    data: [
      { tokenId: 1, owner: BOB, tokenUri: 'u1', royaltyReceiver: ALICE, mintedAt: day(50, 1) },
      { tokenId: 2, owner: CAROL, tokenUri: 'u2', royaltyReceiver: ALICE, mintedAt: day(50, 2) },
      { tokenId: 3, owner: CAROL, tokenUri: 'u3', royaltyReceiver: CAROL, mintedAt: day(50, 3) },
    ],
  });
  const sale = (tokenId: number, seller: string, buyer: string, price: number, fee: number, royalty: number, soldAt: Date | null) => ({
    nftContract: CONTRACT, tokenId, seller, buyer, price: eth(price), platformFee: eth(fee), royaltyFee: eth(royalty), transactionHash: `0x${tokenId}`, soldAt,
  });
  await prisma.tradingHistory.createMany({
    data: [
      sale(1, ALICE, BOB, 1, 0.025, 0.05, day(1, 3)),
      sale(2, ALICE, CAROL, 2, 0.05, 0.1, day(1, 15)),
      sale(1, BOB, CAROL, 0.5, 0.0125, 0.025, day(0, 12)),
      sale(3, CAROL, ALICE, 10, 0.25, 0.5, day(40, 3)),
    ],
  });
  await prisma.marketplaceListing.createMany({
    data: [
      { nftContract: CONTRACT, tokenId: 4, seller: ALICE, price: eth(2) },
      { nftContract: CONTRACT, tokenId: 5, seller: ALICE, price: eth(3) },
      { nftContract: CONTRACT, tokenId: 6, seller: BOB, price: eth(0.75) },
      { nftContract: CONTRACT, tokenId: 7, seller: BOB, price: eth(0.1), active: false },
    ],
  });
}

test('positive control: on an empty database every figure is zero, so a seeded figure cannot be a leftover', async () => {
  const stats = await analyticsService.getPlatformStats();
  assert.deepEqual(stats, { totalSales: 0, totalVolume: '0', uniqueTraders: 0, avgPrice: '0', floorPrice: '0', highestSale: '0' });
  assert.deepEqual(await analyticsService.getTopTraders(), []);
  assert.deepEqual(await analyticsService.getVolumeByNFT(), []);
  await seed();
  assert.notEqual((await analyticsService.getPlatformStats()).totalSales, 0);
});

test('getPlatformStats returns exact wei strings and plain numbers', async () => {
  await seed();
  const stats = await analyticsService.getPlatformStats();
  assert.equal(stats.totalSales, 4);
  assert.equal(stats.totalVolume, '13500000000000000000');
  assert.ok(stats.avgPrice.startsWith('3375000000000000000'), stats.avgPrice);
  assert.equal(stats.uniqueTraders, 3);
  assert.equal(stats.floorPrice, '750000000000000000');
  assert.equal(stats.highestSale, '10000000000000000000');
  assert.equal(typeof stats.totalSales, 'number');
});

test('uniqueTraders counts one person once across buying and selling, whatever the letter case', async () => {
  await prisma.tradingHistory.createMany({
    data: [
      { nftContract: CONTRACT, tokenId: 1, seller: ALICE, buyer: BOB, price: '1', platformFee: '0', royaltyFee: '0' },
      { nftContract: CONTRACT, tokenId: 2, seller: BOB.toUpperCase().replace('0X', '0x'), buyer: ALICE.toUpperCase().replace('0X', '0x'), price: '1', platformFee: '0', royaltyFee: '0' },
    ],
  });
  assert.equal((await analyticsService.getPlatformStats()).uniqueTraders, 2);
});

test('getTopTraders ranks by total volume and reports the trade count and average as strings and numbers', async () => {
  await seed();
  const traders = await analyticsService.getTopTraders();
  assert.deepEqual(traders.map(t => t.address), [ALICE, CAROL, BOB]);
  assert.equal(traders[0].tradesCount, 3);
  assert.equal(traders[0].totalVolume, '13000000000000000000');
  assert.ok(traders[0].avgPrice.startsWith('4333333333333333333'), traders[0].avgPrice);
  assert.equal(typeof traders[0].tradesCount, 'number');
  assert.equal((await analyticsService.getTopTraders(2)).length, 2);
});

test('getTopTraders ranks 10 ETH above 9 ETH (by value, not as text, where "9" sorts after "1")', async () => {
  await prisma.tradingHistory.createMany({
    data: [
      { nftContract: CONTRACT, tokenId: 1, seller: ALICE, buyer: BOB, price: eth(9), platformFee: '0', royaltyFee: '0' },
      { nftContract: CONTRACT, tokenId: 2, seller: CAROL, buyer: DAVE, price: eth(10), platformFee: '0', royaltyFee: '0' },
    ],
  });
  const order = (await analyticsService.getTopTraders()).map(t => t.address);
  assert.deepEqual(new Set(order.slice(0, 2)), new Set([CAROL, DAVE]));
  assert.deepEqual(new Set(order.slice(2)), new Set([ALICE, BOB]));
});

test('getMostExpensiveSales orders by value, so 10 ETH comes before 9 ETH, and returns the Sale shape', async () => {
  await prisma.tradingHistory.createMany({
    data: [
      { nftContract: CONTRACT, tokenId: 1, seller: ALICE, buyer: BOB, price: eth(9), platformFee: '0', royaltyFee: '0', transactionHash: '0xa' },
      { nftContract: CONTRACT, tokenId: 2, seller: ALICE, buyer: BOB, price: eth(10), platformFee: '0', royaltyFee: '0' },
    ],
  });
  const sales = await analyticsService.getMostExpensiveSales(5);
  assert.deepEqual(sales.map(s => s.tokenId), [2, 1]);
  assert.equal(sales[0].transactionHash, '');
  assert.equal(sales[1].transactionHash, '0xa');
  assert.deepEqual(Object.keys(sales[0]).sort(), ['buyer', 'price', 'seller', 'soldAt', 'tokenId', 'transactionHash']);
});

test('getTradingVolumeOverTime buckets sales by UTC date, oldest first, and the window cuts off older sales', async () => {
  await seed();
  const within30 = await analyticsService.getTradingVolumeOverTime(30);
  assert.deepEqual(within30, [
    { date: dateOf(day(1, 3)), volume: '3000000000000000000', salesCount: 2 },
    { date: dateOf(day(0, 12)), volume: '500000000000000000', salesCount: 1 },
  ]);
  const within365 = await analyticsService.getTradingVolumeOverTime(365);
  assert.deepEqual(within365.map(b => b.date), [dateOf(day(40, 3)), dateOf(day(1, 3)), dateOf(day(0, 12))]);
});

test('getTradingVolumeOverTime treats the day count as a value: injected SQL text is rejected and the table survives', async () => {
  await seed();
  const attack = '1 days\'; DROP TABLE trading_history; --';
  await failure(() => analyticsService.getTradingVolumeOverTime(attack as unknown as number));
  assert.equal(await prisma.tradingHistory.count(), 4);
});

test('getPriceDistribution groups active listings into the six price ranges, lowest range first', async () => {
  await prisma.marketplaceListing.createMany({
    data: [0.05, 0.3, 0.7, 2, 7, 12].map((price, i) => ({ nftContract: CONTRACT, tokenId: i + 1, seller: ALICE, price: eth(price) })).concat(
      [{ nftContract: CONTRACT, tokenId: 99, seller: ALICE, price: eth(0.01) }],
    ).map((l, i) => (i === 6 ? { ...l, active: false } : l)),
  });
  assert.deepEqual(await analyticsService.getPriceDistribution(), [
    { range: '0.00 - 0.09', count: 1 },
    { range: '0.10 - 0.49', count: 1 },
    { range: '0.50 - 0.99', count: 1 },
    { range: '1.00 - 4.99', count: 1 },
    { range: '5.00 - 9.99', count: 1 },
    { range: '10.00+', count: 1 },
  ]);
});

test('getCreatorStats adds up a creator\'s own sales and the royalties earned when others resell their NFTs', async () => {
  await seed();
  const stats = await analyticsService.getCreatorStats(ALICE.toUpperCase().replace('0X', '0x'));
  assert.equal(stats.totalMinted, 2);
  assert.equal(stats.totalSold, 2);
  assert.equal(stats.avgPrice, '1500000000000000000');
  assert.equal(stats.totalRevenue, '2775000000000000000');
  assert.equal(stats.floorPrice, '2000000000000000000');
  assert.equal(stats.totalRoyalties, '25000000000000000');
  assert.deepEqual(stats.salesHistory.map(s => s.tokenId), [2, 1]);
  assert.equal(stats.salesHistory[0].buyer, CAROL);
  assert.deepEqual(stats.royaltyHistory.map(r => r.tokenId), [1]);
  assert.equal(stats.royaltyHistory[0].royaltyFee, eth(0.025));
});

test('getCreatorStats gives a creator no royalty for their own sales, and zeros for an unknown address', async () => {
  await seed();
  const carol = await analyticsService.getCreatorStats(CAROL);
  assert.equal(carol.totalMinted, 1);
  assert.equal(carol.totalRoyalties, '0');
  assert.deepEqual(carol.royaltyHistory, []);
  const nobody = await analyticsService.getCreatorStats('0x0000000000000000000000000000000000000001');
  assert.deepEqual(
    { minted: nobody.totalMinted, sold: nobody.totalSold, revenue: nobody.totalRevenue, floor: nobody.floorPrice, avg: nobody.avgPrice },
    { minted: 0, sold: 0, revenue: '0', floor: '0', avg: '0' },
  );
});

test('getVolumeByNFT ranks tokens by total value with their sale counts', async () => {
  await seed();
  assert.deepEqual(await analyticsService.getVolumeByNFT(), [
    { tokenId: 3, totalVolume: '10000000000000000000', salesCount: 1 },
    { tokenId: 2, totalVolume: '2000000000000000000', salesCount: 1 },
    { tokenId: 1, totalVolume: '1500000000000000000', salesCount: 2 },
  ]);
  assert.equal((await analyticsService.getVolumeByNFT(1)).length, 1);
});

test('getSalesByTimeOfDay counts sales per UTC hour in hour order and skips sales with no time', async () => {
  await seed();
  await prisma.tradingHistory.create({
    data: { nftContract: CONTRACT, tokenId: 9, seller: ALICE, buyer: BOB, price: '1', platformFee: '0', royaltyFee: '0', soldAt: null },
  });
  assert.deepEqual(await analyticsService.getSalesByTimeOfDay(), [
    { hour: 3, salesCount: 2 },
    { hour: 12, salesCount: 1 },
    { hour: 15, salesCount: 1 },
  ]);
});

test('getUserStats combines Prisma counts with exact wei volumes for one address', async () => {
  await seed();
  assert.deepEqual(await analyticsService.getUserStats(BOB.toUpperCase().replace('0X', '0x')), {
    nftsOwned: 1,
    nftsMinted: 1,
    totalSales: 1,
    totalPurchases: 1,
    volumeAsSeller: '500000000000000000',
    volumeAsBuyer: '1000000000000000000',
    activeListings: 1,
  });
  assert.deepEqual(await analyticsService.getUserStats('0x0000000000000000000000000000000000000001'), {
    nftsOwned: 0, nftsMinted: 0, totalSales: 0, totalPurchases: 0, volumeAsSeller: '0', volumeAsBuyer: '0', activeListings: 0,
  });
});

test('every analytics result can go straight into res.json: no bigint, no Decimal object', async () => {
  await seed();
  const results = [
    await analyticsService.getPlatformStats(),
    await analyticsService.getTopTraders(),
    await analyticsService.getTradingVolumeOverTime(365),
    await analyticsService.getMostExpensiveSales(),
    await analyticsService.getPriceDistribution(),
    await analyticsService.getCreatorStats(ALICE),
    await analyticsService.getVolumeByNFT(),
    await analyticsService.getSalesByTimeOfDay(),
    await analyticsService.getUserStats(ALICE),
  ];
  for (const result of results) {
    const json = JSON.stringify(result);
    assert.deepEqual(JSON.parse(json), JSON.parse(JSON.stringify(JSON.parse(json))));
    assert.doesNotMatch(json, /"d":|"s":|"e":/, 'a Decimal object serializes with d, s and e keys');
  }
});
