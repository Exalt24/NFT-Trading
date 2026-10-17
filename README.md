# NFT Trading Platform

[![CI](https://github.com/Exalt24/NFT-Trading/actions/workflows/ci.yml/badge.svg)](https://github.com/Exalt24/NFT-Trading/actions/workflows/ci.yml)

![Marketplace demo: connect a wallet, buy an NFT, resell it, then the live feed and analytics, on a local Hardhat chain](docs/demo.gif)

*The real marketplace UI on a local Hardhat chain, driven through a scripted stand-in for MetaMask: connect, buy, resell, live activity feed, analytics. Silent, 37 seconds. [Full quality mp4](docs/demo.mp4). How it was recorded is [below](#how-the-demo-was-recorded).*

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
- An event indexer that reads contract events into PostgreSQL
- 25 REST endpoints under `/api` (6 NFT, 10 marketplace, 9 analytics) plus `/health`
- A Socket.IO server with room-based broadcasting
- 5 PostgreSQL tables and 10 indexes (`backend/migrations/001_nft_tables.sql`)

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
| PostgreSQL | localhost:5433 |

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

### Connect MetaMask

Add the Hardhat network:
- Network name: Hardhat Local
- RPC URL: `http://localhost:8546`
- Chain ID: `31337`
- Currency symbol: ETH

Import test account #0 from the Hardhat node logs:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Owner)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This is the public Hardhat default test account. It ships with every Hardhat node and only holds funds on your local chain. Never use it on a public network.

### Buy, list, mint

After seeding:

1. Open the marketplace at http://localhost:3002 and press "Connect Wallet". Use a second MetaMask account (for example Hardhat account #1) to buy.
2. Open a listing and press "Buy Now for ... ETH", then "Confirm". The page confirms with "Purchase successful! The NFT is now yours." and the NFT appears under "My NFTs".
3. In "My NFTs" press "List" on an NFT you own. The first time, "Approve & List" approves the marketplace contract, then "List NFT" sets the price. "Update" and "Cancel" appear on listed NFTs.
4. The "Activity" tab is the live feed and the "Analytics" tab shows platform statistics, the volume chart, the price distribution, top traders and the most expensive sales.
5. Minting happens in the creator dashboard at http://localhost:3003 and needs Pinata: upload an image, fill in the metadata, upload to IPFS, then mint and confirm in MetaMask. That path is not covered by the demo clip.

## How the demo was recorded

The clip at the top is the real marketplace frontend, backend, indexer and contracts running in the Docker stack above on a local Hardhat chain. Nothing in it is mocked on the server side. Three things make it a recording and not a manual session:

- **No MetaMask.** The browser was headless Chromium driven by a Playwright script, which has no wallet extension. [`scripts/demo/wallet-stub.js`](scripts/demo/wallet-stub.js) is a small stand-in for `window.ethereum` that answers account, connect and chain-switch requests itself and forwards everything else, including `eth_sendTransaction`, to the local Hardhat node, which signs for its unlocked test account #1. It holds no keys. It is a recording aid, not part of the app. The Playwright driver script itself is not in this repo.
- **Seeded data.** The marketplace was filled with `scripts/seed-demo.ts` as described above: 13 NFTs, 8 listed, 3 already sold, art embedded as `data:` URIs, no Pinata.
- **Captions.** The captions were burned in afterwards with ffmpeg, and the GIF was made from that video.

What it does not show: minting and IPFS upload, the real MetaMask confirmation popups, the creator dashboard, and any deployed network. There is none.

## Project structure

```
NFT-Trading/
├── contracts/              # Solidity contracts, Hardhat tests, Ignition modules
│   ├── contracts/          # GameNFT.sol, Marketplace.sol
│   └── test/               # GameNFT.test.ts, Marketplace.test.ts
├── backend/
│   ├── src/
│   │   ├── services/       # Event indexer, NFT, marketplace, analytics, IPFS
│   │   ├── api/            # REST routes
│   │   ├── websocket/      # Socket.IO server and rooms
│   │   └── config/         # Database, blockchain, IPFS, env
│   └── migrations/         # PostgreSQL schema
├── marketplace-frontend/   # Marketplace UI (React, Vite)
├── creator-dashboard/      # Creator UI (React, Vite)
├── tests/
│   ├── integration/        # 4 integration scripts
│   └── e2e/                # full-stack.test.ts
├── scripts/                # Docker helpers, deployment, seeding, stack verification
│   └── demo/               # wallet-stub.js, the MetaMask stand-in used for the recording
├── docs/                   # TESTING, SECURITY, ARCHITECTURE, PRODUCTION, demo.gif, demo.mp4
└── docker/                 # Dockerfiles
```

## Tech stack

| Layer | Technology |
|-------|------------|
| Contracts | Solidity 0.8.30, Hardhat 3.0.7, OpenZeppelin 5.4.0, ethers.js 6.15 |
| Backend | Node.js 22, Express 5.1, PostgreSQL 18, Socket.IO 4.8, Pinata SDK |
| Frontend | React 19.2, Vite 7.1, Tailwind CSS 4.1, Recharts 3.3 |
| Language | TypeScript 5.9 |
| Container | Docker |

## Testing

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

- **Services will not start:** check `docker info`, then `.\scripts\docker-logs.ps1` and `docker logs nft-marketplace-backend`.
- **The build fails with `ETXTBSY` from esbuild:** a race while the images install packages in parallel. Run `.\scripts\docker-up.ps1` again.
- **Backend not responding:** `curl http://localhost:4001/health`. If the tables are missing, run `docker exec -it nft-marketplace-backend npm run migrate` and restart the backend.
- **Backend exits with "NFT_CONTRACT_ADDRESS not set":** the root `.env` is missing the contract addresses, usually because the deploy step did not finish. Run `.\scripts\docker-up.ps1` again.
- **Frontend shows no data:** confirm the backend is healthy and that the contract addresses in the root `.env` match the deployment. `npx tsx scripts/verify-stack.ts` prints the deployed addresses.
- **Contracts not deployed:** run `npx tsx scripts/docker-deploy-contracts.ts` and then `npx tsx scripts/verify-stack.ts`.
- **Port in use:** find the process with `netstat -ano | findstr :3002` (and 3003, 4001, 5433, 8546) and stop it with `taskkill /PID <PID> /F`.
- **Database errors:** `docker exec nft-marketplace-postgres pg_isready -U postgres`. As a last resort `docker-compose down -v` and `.\scripts\docker-up.ps1` start from an empty database with new contract addresses.
- **MetaMask rejects transactions after a restart:** the local chain restarted and its nonces reset. In MetaMask use Settings, Advanced, Reset Account, and check the network is `http://localhost:8546` with chain ID 31337.
- **IPFS upload fails:** `PINATA_JWT` is not set or is invalid in the creator dashboard environment. The backend IPFS service throws an error when Pinata is not configured, and there is no mock fallback there.

## Security status

What the code does:
- Contracts use OpenZeppelin libraries, owner-only minting and fee updates, input checks (zero price, zero address, empty URI, batch size, royalty and fee caps) and a reentrancy guard on `buyNFT` and `withdrawFees`. Solidity 0.8.30 gives overflow checks.
- The backend uses parameterized SQL queries.

What it does not do:
- No rate limiting on the REST API or the WebSocket server.
- CORS defaults to `*` unless `CORS_ORIGIN` is set.
- The creator dashboard receives the Pinata token as a browser-side variable, so anyone who can open the dashboard can read it.
- The contracts have not been audited. This is development software built around test accounts and a local chain.

`docs/SECURITY.md` has the full checklist, including the open items. Get the contracts audited before putting them on a public network, and keep private keys and real environment files out of the repository.

## Documentation

- [docs/TESTING.md](docs/TESTING.md): test suites and a manual testing checklist
- [docs/SECURITY.md](docs/SECURITY.md): security checklist and open items
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system design
- [docs/PRODUCTION.md](docs/PRODUCTION.md): notes on what a public deployment would need; I have not followed it

## Not done

- No public deployment, testnet or mainnet
- No rate limiting
- No contract audit
- No frontend unit tests, and the integration scripts need the whole Docker stack running
- Auctions, offers and bids, collections, multi-chain support and lazy minting

## License

MIT. See [LICENSE](LICENSE).
