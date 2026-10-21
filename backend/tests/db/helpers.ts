import './setup.js';
import { prisma } from '../../src/config/database.js';

export { prisma };

/** Empty every table and restart the id sequences, so each test starts from nothing. */
export async function resetTables(): Promise<void> {
  const [{ current_database }] = await prisma.$queryRaw<Array<{ current_database: string }>>`SELECT current_database()`;
  if (!current_database.endsWith('_test')) {
    throw new Error(`Refusing to truncate "${current_database}": the database tests only run against a _test database`);
  }
  await prisma.$executeRaw`TRUNCATE TABLE nfts, marketplace_listings, trading_history, ipfs_metadata_cache, sync_status RESTART IDENTITY`;
}

export const CONTRACT = '0x5fbdb2315678afecb367f032d93f642f64180aa3';
export const MARKET = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512';
export const ALICE = '0xf39fd6e51aad88f6f4ce6ab8827279cffb92266';
export const BOB = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
export const CAROL = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';

export const eth = (n: number): string => (BigInt(Math.round(n * 1000)) * 10n ** 15n).toString();

/** Run a statement that must fail and return its error, failing the test if it succeeds. */
export async function failure(run: () => Promise<unknown>): Promise<Error> {
  try {
    await run();
  } catch (error) {
    return error as Error;
  }
  throw new Error('Expected the statement to fail, but it succeeded');
}
