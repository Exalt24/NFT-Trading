import { prisma } from '../config/database.js';
import { nowUtc } from './prismaHelpers.js';

/** The last block the indexer has fully read for a contract. A contract seen for the first time starts at block 0. */
export async function getLastSyncedBlock(contractAddress: string): Promise<number> {
  const address = contractAddress.toLowerCase();
  // Raw on purpose: Prisma 7's upsert() is a SELECT then an INSERT and fails with P2002 when two first reads race for one
  // contract. INSERT ... ON CONFLICT DO NOTHING creates the row at block 0 exactly once and leaves an existing row alone.
  await prisma.$executeRaw`
    INSERT INTO sync_status (contract_address, last_synced_block, updated_at)
    VALUES (${address}, 0, ${nowUtc})
    ON CONFLICT (contract_address) DO NOTHING`;
  const status = await prisma.syncStatus.findUniqueOrThrow({ where: { contractAddress: address } });
  return status.lastSyncedBlock;
}

/** Moves the marker forward. A missing or non-numeric block is ignored, and an unknown contract is left alone. */
export async function setLastSyncedBlock(contractAddress: string, blockNumber: number): Promise<void> {
  if (blockNumber === null || blockNumber === undefined || isNaN(blockNumber)) {
    return;
  }

  await prisma.syncStatus.updateMany({
    where: { contractAddress: contractAddress.toLowerCase() },
    data: { lastSyncedBlock: blockNumber },
  });
}
