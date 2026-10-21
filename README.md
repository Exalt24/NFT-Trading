# NFT Trading Platform

[![CI](https://github.com/Exalt24/NFT-Trading/actions/workflows/ci.yml/badge.svg)](https://github.com/Exalt24/NFT-Trading/actions/workflows/ci.yml)

![Marketplace demo: connect a wallet, buy an NFT, resell it, then the live feed and analytics, on a local Hardhat chain](docs/demo.gif)

*The real marketplace UI on a local Hardhat chain, driven through a scripted stand-in for MetaMask: connect, buy, resell, live activity feed, analytics. Silent, 37 seconds. [Full quality mp4](docs/demo.mp4). How it was recorded is in [docs/DEMO_RECORDING.md](docs/DEMO_RECORDING.md).*

ERC-721 NFT marketplace with batch minting, royalties and a PostgreSQL event indexer, on a local Hardhat chain. Creators mint single or batch NFTs with IPFS metadata, list them on a marketplace contract that pays royalties and a platform fee, and a PostgreSQL event indexer feeds a REST API and a Socket.IO feed that both frontends read. It is a demonstration project. It has never been deployed to a public network and its own security notes say a professional audit is required before any real use.

## What is in it

### Creator dashboard
- Single and batch minting, up to 20 NFTs in one transaction (the contract enforces the cap)
- Image and metadata upload to IPFS through Pinata (needs a `PINATA_JWT`; without one the dashboard shows "IPFS Not Configured" and the upload returns an error)
- Default royalty of 2.5% or a per-token royalty up to 10%, through ERC-2981
- Creator analytics and a list of your creations, with direct listing after minting

### Marketplace
- Browse, search by token ID or name, and filter by price and status
- Live activity feed over WebSocket
- Buy, list, cancel and re-price with MetaMask
- Analytics charts (volume, price distribution, top traders) and per-NFT price history, drawn with Recharts

### Contracts (`contracts/`)
- `GameNFT.sol`: ERC-721 with URI storage and ERC-2981 royalties on OpenZeppelin 5.4.0, owner-only minting
- `Marketplace.sol`: listing, buying, cancelling and price updates, a 2.5% platform fee capped at 10%, royalty payout, overpayment refund, and a reentrancy guard on `buyNFT` and `withdrawFees`
- 62 passing Hardhat tests: 27 for GameNFT and 35 for Marketplace

### Backend (`backend/`)
- An event indexer that reads contract events into PostgreSQL, with every chain read retried with backoff so one dropped RPC request does not skip a block range
- Analytics responses cached in memory for 15 seconds and cleared whenever the indexer processes new events; a burst of identical requests shares one database query
- 25 REST endpoints under `/api` (6 NFT, 10 marketplace, 9 analytics) plus `/health`
- A Socket.IO server with room-based broadcasting
- 5 PostgreSQL tables and 10 indexes (`backend/migrations/001_nft_tables.sql`), read and written through Prisma 7 (see [Data layer](#data-layer))
- 14 backend unit tests (the cache and the retry helper) and 63 database tests against a real PostgreSQL, a TypeScript typecheck and a build, all run in CI

## Quick start

You need Node.js 22.12 or newer, Docker Desktop and PowerShell. A Pinata account is optional and only needed for IPFS uploads.

```powershell
git clone https://github.com/Exalt24/NFT-Trading.git
cd NFT-Trading
.\scripts\docker-up.ps1
```

The script builds the images, starts PostgreSQL and a Hardhat node, deploys the contracts, copies the fresh ABIs into both frontends and the backend, writes a root `.env` with the deployed contract addresses (docker-compose reads it), then starts the backend and both frontends and runs the database migration. The first run takes a few minutes. Running it again wipes the containers and the database volume and starts from a fresh chain.

| Service | URL |
|---------|-----|
| Marketplace | http://localhost:3002 |
| Creator dashboard | http://localhost:3003 |
| Backend API | http://localhost:4001/api |
| Health check | http://localhost:4001/health |
| Hardhat RPC | http://localhost:8546 |
| PostgreSQL | localhost:55432 |

The ports differ from the usual defaults (3000, 3001, 4000, 5432, 8545) so the stack does not collide with other projects. Inside Docker the standard ports are used.

To get IPFS uploads in the creator dashboard, put `PINATA_JWT=` and `PINATA_GATEWAY=` in the root `.env` (see `.env.docker.example`) before running the script. The dashboard reads the token as `VITE_PINATA_JWT`, which ends up in the browser bundle, so use a throwaway key meant for local testing and never commit the file.

### Seed demo data

An empty marketplace has nothing to browse, so `scripts/seed-demo.ts` fills it:

```powershell
cd scripts
npm install
npx tsx seed-demo.ts
```

It mints 13 generated-art NFTs from Hardhat account #0, lists 8 of them at prices from 0.15 to 2.0 ETH, and has account #1 buy three. Without a `PINATA_JWT` it embeds each NFT's metadata and SVG art in the token URI as `data:` URIs, so it needs no external account and no network; the backend indexer decodes those. With `PINATA_JWT` set in your shell it uploads to IPFS instead. Run it once per fresh stack, since `docker-up.ps1` resets the chain. `RPC_URL`, `NFT_CONTRACT_ADDRESS` and `MARKETPLACE_CONTRACT_ADDRESS` override its defaults (`http://localhost:8546` and the two addresses a fresh Hardhat node produces).

The full stack is supported through Docker only. Running the four services by hand needs the same ABI copy, address wiring and migration steps and has not been re-verified, so it is not documented here.

## Using it

MetaMask setup and the buy, list and mint steps are in [docs/USING.md](docs/USING.md).

## Project structure

```
NFT-Trading/
├── contracts/              # Solidity contracts, Hardhat tests, Ignition modules
│   ├── contracts/          # GameNFT.sol, Marketplace.sol
│   └── test/               # GameNFT.test.ts, Marketplace.test.ts
├── backend/
│   ├── src/
│   │   ├── services/       # Event indexer, NFT, marketplace, analytics, IPFS, cache
│   │   ├── api/            # REST routes
│   │   ├── websocket/      # Socket.IO server and rooms
│   │   ├── utils/          # retry with backoff
│   │   ├── types/          # row, event and metadata types
│   │   └── config/         # Database, blockchain, IPFS, env
│   ├── prisma/             # schema.prisma
│   ├── tests/unit/         # cache.test.ts, retry.test.ts
│   ├── tests/db/           # Prisma tests on a real PostgreSQL, mutation-check.ts
│   └── migrations/         # PostgreSQL schema and its runner
├── marketplace-frontend/   # Marketplace UI (React, Vite)
├── creator-dashboard/      # Creator UI (React, Vite)
├── tests/
│   ├── integration/        # 4 integration scripts
│   └── e2e/                # full-stack.test.ts
├── scripts/                # Docker helpers, deployment, seeding, stack verification
│   └── demo/               # wallet-stub.js, the MetaMask stand-in used for the recording
├── docs/                   # TESTING, SECURITY, ARCHITECTURE, PRODUCTION, DEMO_RECORDING, demo.gif, demo.mp4
└── docker/                 # Dockerfiles
```

## Tech stack

| Layer | Technology |
|-------|------------|
| Contracts | Solidity 0.8.30, Hardhat 3.0.7, OpenZeppelin 5.4.0, ethers.js 6.15 |
| Backend | Node.js 22, Express 5.1, PostgreSQL 18, Prisma 7, Socket.IO 4.8, Pinata SDK |
| Frontend | React 19.2, Vite 7.1, Tailwind CSS 4.1, Recharts 3.3 |
| Language | TypeScript 5.9 |
| Container | Docker |

## Data layer

The backend reaches PostgreSQL through Prisma 7 (`backend/prisma/schema.prisma`). The tables are still built by `backend/migrations/001_nft_tables.sql` (`npm run migrate`). Prisma Migrate is not used, and `npm run db:drift` fails when the schema file and the migrated database disagree. Service methods keep their signatures and snake_case row types, so the routes did not change.

Of the 36 data-access methods (counted 2026-10-22), 21 use Prisma Client only, 2 mix it with raw SQL and 13 are raw, written as `$queryRaw` or `$executeRaw` tagged templates with bound parameters. Raw stays for four reasons:

- Price and fees are TEXT wei strings, so totals, averages, minimums and ordering by value need `CAST(... AS numeric)`, which `aggregate()` and `orderBy` cannot do. This is platform stats, top traders, volume over time, volume per NFT, most expensive sales and price distribution (analytics), trading volume (marketplace) and the volume half of user stats.
- Prisma has no syntax for sales by hour (`EXTRACT`), the activity feed (`UNION ALL`) or NFT search (`LIKE` on `token_id::text` plus `ILIKE` on a JSON field).
- `createNFT`, `createListing`, the IPFS cache write and the first read of a sync marker are `INSERT ... ON CONFLICT`. Prisma 7.10.1 runs `upsert()` as a SELECT then an INSERT, and ten simultaneous calls for one key failed with P2002 in 3 of 6 runs on 2026-10-22.
- `migrations/run.ts` stays on `pg`, because it sends a multi-statement file. The event indexer has no batched inserts, so nothing else is kept raw for speed.

```powershell
docker compose up -d --wait postgres      # PostgreSQL 18 on host port 55432
cd backend
npm install
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:55432/nft_marketplace"
npm run migrate                           # apply the SQL migration
npm run db:generate                       # build the Prisma Client (typecheck, build and dev also do it)
npm run db:drift                          # schema.prisma against the migrated database
npm test                                  # 14 unit tests, no database needed
npm run test:db                           # 63 tests on a rebuilt nft_marketplace_test database
npm run test:db:mutation                  # breaks 9 guards one at a time, expects red each time
```

On 2026-10-22, before the port: typecheck clean, 14 unit tests passed. After: typecheck clean, the same 14 plus 63 database tests pass (63 in 5.0 seconds on a fresh clone), 9 of 9 mutations are caught, and CI runs the typecheck, unit tests, drift check and database tests against a Postgres service. Each database test file opens with positive controls. Known limits are in [docs/DATA_LAYER.md](docs/DATA_LAYER.md).

## Testing

### Backend unit tests and typecheck

```powershell
cd backend
npm install
npm test            # 14 tests: the TTL cache (expiry, shared computation, failures are not cached) and the retry helper
npm run typecheck   # tsc --noEmit
npm run build
```

These need no database or chain. The database tests are described under [Data layer](#data-layer). The indexer and the REST routes are covered by the integration scripts below, which need the Docker stack.

### Contract tests

```powershell
cd contracts
npm install
npx hardhat test
```

On 2026-10-11 this printed `62 passing` (run inside the Hardhat container): 27 in `GameNFT.test.ts` and 35 in `Marketplace.test.ts`. Add `--gas-report` for gas figures, or `--grep "Should allow claiming"` to run one test.

### Integration scripts

```powershell
.\scripts\docker-up.ps1
cd scripts
npm run test-all
```

`test-all` runs four scripts from `tests/integration/` against the running stack: the mint flow (contract, IPFS, backend, API), the marketplace flow (list, buy, ownership transfer), the WebSocket flow (room subscriptions and event broadcasting) and the analytics flow (platform statistics). They are scripts, not a test-framework suite: the four scripts hold about 43 assert calls between them, and the end-to-end script adds about 18 more. All of them need the running Docker stack. The mint flow uploads to IPFS, so it expects Pinata to be configured. These were not re-run when the demo was recorded.

`tests/e2e/full-stack.test.ts` (`npx tsx tests/e2e/full-stack.test.ts`) runs a longer lifecycle across mints, listings, purchases, analytics and WebSocket events.

### Stack verification

```powershell
npx tsx scripts/verify-stack.ts
```

This checks the PostgreSQL container and schema, the backend health endpoint, the deployed contract addresses and that both frontends answer over HTTP.

## Everyday commands

```powershell
.\scripts\docker-up.ps1                  # start everything (resets the chain and the database)
.\scripts\docker-down.ps1 -keep-data     # stop, keep data
.\scripts\docker-down.ps1                # stop, delete data
.\scripts\docker-logs.ps1 backend -Follow
docker-compose restart backend
.\scripts\copy-abis.ps1                  # copy ABIs to both frontends after a contract change
docker exec -it nft-marketplace-postgres psql -U postgres -d nft_marketplace
```

After editing a contract, run `npx hardhat compile` and `npx hardhat test` in `contracts/`, then `npx tsx scripts/docker-deploy-contracts.ts` (deploys and copies the ABIs) and `docker-compose restart backend`.

## Troubleshooting

The common failures (services will not start, backend not responding, contracts not deployed, MetaMask rejecting transactions after a restart, IPFS upload failing) and their fixes are in [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Security status

What the code does:
- Contracts use OpenZeppelin libraries, owner-only minting and fee updates, input checks (zero price, zero address, empty URI, batch size, royalty and fee caps) and a reentrancy guard on `buyNFT` and `withdrawFees`. Solidity 0.8.30 gives overflow checks.
- The backend sends every value to PostgreSQL as a bound parameter, through Prisma Client or a tagged `$queryRaw` template. One query used to paste the day count into its SQL text, and now binds it.

What it does not do:
- No rate limiting on the REST API or the WebSocket server.
- CORS defaults to `*` unless `CORS_ORIGIN` is set.
- The creator dashboard receives the Pinata token as a browser-side variable, so anyone who can open the dashboard can read it.
- The contracts have not been audited. This is development software built around test accounts and a local chain.

`docs/SECURITY.md` has the full checklist, including the open items. Get the contracts audited before putting them on a public network, and keep private keys and real environment files out of the repository.

## Documentation

- [docs/TESTING.md](docs/TESTING.md): test suites and a manual testing checklist
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md): fixes for the common stack failures
- [docs/SECURITY.md](docs/SECURITY.md): security checklist and open items
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system design
- [docs/PRODUCTION.md](docs/PRODUCTION.md): notes on what a public deployment would need; I have not followed it

## Not done

- The cache is in memory in one process, so it would need a shared store if the backend ran as several instances
- A block range whose chain reads still fail after three attempts is logged and skipped, not replayed

- No public deployment, testnet or mainnet
- No rate limiting
- No contract audit
- No frontend unit tests, and the integration scripts need the whole Docker stack running
- Auctions, offers and bids, collections, multi-chain support and lazy minting

## License

MIT. See [LICENSE](LICENSE).
