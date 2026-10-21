# Data layer notes

The README has the short version: what uses Prisma, what stays raw, and the commands. This file holds the details behind it.

## How the tests are built

- `npm run test:db` first drops and recreates a database named `<name>_test` on the same server (`nft_marketplace_test` for the default URL), then applies the repo's own `npm run migrate` to it. The development database is never touched, and the helpers refuse to truncate any database whose name does not end in `_test`.
- Every test file starts with positive controls: a query on a missing table must be rejected, a wrong filter must find nothing, an empty database must report zeros. They show that the later assertions are able to fail.
- `npm run test:db:mutation` edits one guard in the source, runs the database tests, expects red, and puts the file back. The nine mutations are listed at the top of `backend/tests/db/mutation-check.ts`.
- The 63 tests passed with the Node time zone set to UTC, Asia/Manila and America/Los_Angeles, and with the database session set to Asia/Manila.

## Behaviour that is deliberate

- The raw write statements use `NOW() AT TIME ZONE 'UTC'` and an explicit UTC conversion, so a row written raw and a row written by Prisma Client carry the same kind of time.
- Money is never passed through a JS number or a Prisma `Decimal` on the way out of a raw query. Sums are cast to text in SQL, and counts are cast to `integer` because Prisma returns a `bigint` for `COUNT`, which `JSON.stringify` refuses.
- `updateNFTOwner`, `updateNFTRoyalty` and `updateNFTMetadata` use `updateMany`, so an event for a token the indexer never stored is a silent no-op, as it was with the old `UPDATE` statements. Prisma's `update()` throws P2025 for that.
- `recordSale` writes the sale and closes the listing in one transaction. The old code ran them as two statements.
- The old pool's `process.exit` on an idle connection error is gone: the pg driver underneath Prisma handles pool errors itself.

## Known limits

- The marketplace service's floor price, price range filter and `getMostExpensiveSales` compare the TEXT price column as text, so a 10 ETH price sorts below a 9 ETH one. This is carried over unchanged from the `pg` code. The analytics endpoint of the same name sorts by value.
- Price distribution compares the stored price with ETH thresholds, but the indexer stores wei, so indexed data lands in the top range.
- Prisma reads and writes `timestamp` columns as UTC. The old `pg` code used the Node process time zone, so rows written by it under a non-UTC zone would read shifted by the offset. Inside Docker both are UTC and the results are identical.
- `trading_history.token_id` has no foreign key in the database, so the relation to `nfts` exists only in Prisma (`relationMode = "prisma"`). Prisma warns that the relation field has no index of its own, which matches the old join.
- `prisma generate` has to run before the code compiles. The `typecheck`, `build` and `dev` scripts run it first, and the Docker image gets it through `npm run dev`.
