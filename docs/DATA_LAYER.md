# Data layer notes

The README has the short version: what uses Prisma, what stays raw, and the commands. This file holds the details behind it.

## How the tests are built

- `npm run test:db` first drops and recreates a database named `<name>_test` on the same server (`nft_marketplace_test` for the default URL), then applies the repo's own `npm run migrate` to it. The development database is never touched, and the helpers refuse to truncate any database whose name does not end in `_test`.
- Every test file starts with positive controls: a query on a missing table must be rejected, a wrong filter must find nothing, an empty database must report zeros. They show that the later assertions are able to fail.
- `npm run test:db:mutation` edits one guard in the source, runs the database tests, expects red, and puts the file back. The 15 mutations are listed at the top of `backend/tests/db/mutation-check.ts`.
- The 74 tests passed with the Node time zone set to UTC, Asia/Manila and America/Los_Angeles, and with the connection option `timezone=Asia/Manila`.

## Behaviour that is deliberate

- The floor price, the price range filter and the marketplace `getMostExpensiveSales` order and compare `CAST(price AS numeric)`. The range bounds are in wei, like the stored price, and are bound parameters cast to numeric in SQL, so a decimal point or an exponent works and a non-number makes the method throw. The method that loads the rows takes the ids in numeric order from a raw query and then reads them with Prisma Client.
- The price distribution converts its ETH edges (0.1, 0.5, 1, 5, 10) to wei in code and binds them, so a 10 ETH listing lands in `10.00+` and a 0.5 ETH listing in `0.50 - 0.99`.
- The raw write statements use `NOW() AT TIME ZONE 'UTC'` and an explicit UTC conversion, so a row written raw and a row written by Prisma Client carry the same kind of time.
- Money is never passed through a JS number or a Prisma `Decimal` on the way out of a raw query. Sums are cast to text in SQL, and counts are cast to `integer` because Prisma returns a `bigint` for `COUNT`, which `JSON.stringify` refuses.
- `updateNFTOwner`, `updateNFTRoyalty` and `updateNFTMetadata` use `updateMany`, so an event for a token the indexer never stored is a silent no-op, as it was with the old `UPDATE` statements. Prisma's `update()` throws P2025 for that.
- `recordSale` writes the sale and closes the listing in one transaction. The old code ran them as two statements.
- The old pool's `process.exit` on an idle connection error is gone: the pg driver underneath Prisma handles pool errors itself.

## Known limits

- Prisma reads and writes `timestamp` columns as UTC. The old `pg` code used the Node process time zone, so rows written by it under a non-UTC zone would read shifted by the offset. Inside Docker both are UTC and the results are identical.
- `trading_history.token_id` has no foreign key in the database, so the relation to `nfts` exists only in Prisma (`relationMode = "prisma"`). Prisma warns that the relation field has no index of its own, which matches the old join.
- `prisma generate` has to run before the code compiles. The `typecheck`, `build` and `dev` scripts run it first, and the Docker image gets it through `npm run dev`.
