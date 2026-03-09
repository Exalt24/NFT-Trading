NFT Trading Platform - Interview Cheat Sheet

ONE-LINER

It's a full-stack NFT marketplace with two Solidity smart contracts (ERC-721 with ERC-2981 royalties + a Marketplace with fee distribution and reentrancy protection), 74 Hardhat tests, a Node.js backend that indexes on-chain events into PostgreSQL with real-time Socket.IO broadcasting, and two React frontends for marketplace trading and creator tools.


QUICK FACTS

Item                Detail
What it does        Full NFT marketplace: mint, list, buy, trade with royalties
Smart Contracts     GameNFT.sol (ERC-721 + ERC-2981), Marketplace.sol (trading + fees)
Solidity Version    0.8.30
OpenZeppelin        5.4.0
Testing             Hardhat + Chai + TypeScript, 74 tests (32 + 42)
Backend             Node.js 22, Express 5, ethers.js 6.15, PostgreSQL 18
Frontend            React 19, Vite 7.1, Tailwind CSS 4.1, Recharts 3.3
Real-time           Socket.IO 4.8 (8 event types)
IPFS                Pinata SDK 0.5+
Docker              5 containers (PostgreSQL, Hardhat, Backend, Marketplace, Creator)
API Endpoints       25 total
GitHub              https://github.com/Exalt24/NFT-Trading


ARCHITECTURE IN PLAIN ENGLISH

Users interact with the marketplace frontend or creator dashboard. Both talk to the backend API. When someone mints, lists, or buys an NFT, the transaction goes through ethers.js to the smart contracts on-chain. The backend's EventIndexer service monitors the blockchain by polling every 2 seconds, queries for 8 different event types in parallel across block ranges of 100, processes them sequentially sorted by block number and log index, then writes results to marketplace-specific PostgreSQL tables (nfts, marketplace_listings, trading_history, ipfs_metadata_cache, sync_status). Socket.IO broadcasts events to all connected clients so the UI updates in real time. IPFS stores NFT metadata through Pinata.


EVERY POSSIBLE INTERVIEW QUESTION


WHAT/HOW QUESTIONS

Q: How do your smart contracts work?
A: I have two contracts. GameNFT extends OpenZeppelin's ERC721URIStorage and ERC2981. It has single mint and batchMint (up to 20 tokens per transaction). Default royalty is 2.5% (250 basis points), max 10%. The owner can set per-token royalty overrides with setTokenRoyalty. Marketplace handles trading. listNFT requires the seller to have approved the marketplace. buyNFT calculates the split: platform fee (2.5%) + royalty (via ERC-2981 interface check) + seller proceeds. It uses ReentrancyGuard on buyNFT and withdrawFees since both transfer ETH. Custom errors instead of require strings for gas efficiency.

I went with OpenZeppelin over writing from scratch because security is the real concern here, not originality. Their contracts are audited and battle-tested. I thought about it and the risk/reward calculus just doesn't make sense for rolling your own ERC-721. The only trade-off is a slightly larger contract size since you inherit things you might not use, but the gas difference is negligible and the security guarantee is worth it. Foundry is gaining serious traction right now for Solidity testing since it lets you write tests in Solidity itself (faster execution, no JS async overhead, built-in fuzzing), but I stuck with Hardhat because the deployment tooling and plugin ecosystem are more mature. If I were starting today I'd probably use both: Foundry for unit tests and fuzzing, Hardhat for deployment scripts and integration tests.

Q: How does the payment distribution work in buyNFT?
A: When someone calls buyNFT, the contract first checks the NFT is listed and the payment covers the price. Then it calculates the platform fee (price * platformFee / 10000). It checks if the NFT contract supports ERC-2981 via supportsInterface. If yes, it calls royaltyInfo to get the royalty amount and receiver. The seller gets price minus platform fee minus royalty. All three payments happen via low-level call. If the buyer overpaid, the excess gets refunded. All this happens in one transaction.

The reason I use low-level call instead of transfer or send is that transfer forwards only 2300 gas, which can break if the recipient is a smart contract with a fallback function that needs more gas. This was a real issue that bit some high-profile projects. The trade-off is that call doesn't revert on failure by default, so you have to check the return value yourself. I do that. The ordering matters too: I follow checks-effects-interactions to prevent reentrancy even beyond what ReentrancyGuard provides. Belt and suspenders.

Q: How does the event indexing work?
A: The backend has an EventIndexer service in EventIndexer.ts that connects to the blockchain via ethers.js. It polls every 2 seconds for new blocks. When it detects new blocks, it queries for 8 event types in parallel across block ranges of 100 blocks using Promise.all on contract.queryFilter calls. All events get sorted by block number and log index to maintain ordering, then processed sequentially. Each event type has its own handler that writes to the appropriate PostgreSQL table and broadcasts through Socket.IO to all connected frontends.

I went with a custom polling indexer instead of The Graph or Alchemy webhooks for a few reasons. The Graph is the industry standard for production dApps, and if this were a mainnet deployment I'd probably use it since it handles reorgs, has a decentralized network of indexers, and gives you a GraphQL API out of the box. But for a portfolio project running on a local Hardhat node, spinning up a subgraph would be overkill. The custom approach also gave me full control over the processing pipeline and let me write directly to my own PostgreSQL schema, which is more flexible than The Graph's entity model. The limitation is that my indexer doesn't handle chain reorgs. On a local Hardhat node that's fine, but on mainnet you'd need to watch for removed events and roll back state. That's one of the things The Graph handles for you.

The 100-block batch size for querying is a balance between RPC call overhead (too small means too many calls) and memory usage (too large and you might hit response limits on public RPC nodes). For a local Hardhat node it could be much larger, but I kept it at 100 to be realistic for production scenarios.

Q: What do your 74 tests cover?
A: GameNFT has 32 tests: deployment (4), single minting (6), batch minting (6) including the 20-token max limit, royalties (6) including the 10% cap, and ERC-721/ERC-2981 compliance (4). Marketplace has 42 tests: deployment (3), listing (6) including approval checks, buying (10) including payment distribution and overpayment refunds, canceling (4), price updates (5), fee management (8), and complex scenarios (2) like full trading cycles. I use a deployMarketplaceFixture that deploys both contracts and mints 3 test NFTs. Each test gets a clean snapshot.

One gap I'm aware of: these are all unit tests and integration tests at the contract level. I don't have end-to-end tests that exercise the full pipeline (frontend sends transaction, indexer picks it up, WebSocket pushes update). In a production system I'd add those, probably using a Hardhat fork of a testnet with Playwright for the frontend side. I also don't have fuzz tests, which Foundry would give me for free. Fuzz testing is particularly valuable for payment math where edge cases with large or small numbers can cause unexpected behavior.

Q: How does batch minting work?
A: batchMint takes an array of URI strings and mints them all in one transaction. It has a max of 20 tokens per call to prevent gas limit issues. Internally it loops through the URIs, calls _safeMint for each, sets the tokenURI, and emits a Minted event per token. The function returns an array of all the new tokenIds. I have tests for the exact boundary: 20 works, 21 reverts.

The 20-token limit is a practical gas limit consideration. Each mint costs roughly 100-150k gas, so 20 mints hits around 2-3M gas, well under the 30M block gas limit on Ethereum mainnet but leaving room for the function overhead. I could have made this configurable by the contract owner, but a hard-coded limit is simpler and eliminates a potential attack vector where someone sets it too high and creates transactions that always fail. The trade-off is flexibility, but in practice nobody needs to mint more than 20 at once. If they do, they can just call it multiple times.

Q: What's the database schema?
A: 5 marketplace-specific tables with 10 optimized indexes. The nfts table stores token data with owner, tokenURI, IPFS CID, metadata as JSONB, and royalty info. marketplace_listings tracks active and historical listings with a UNIQUE constraint on (nft_contract, token_id). trading_history records every sale with price, platform fee, and royalty fee. ipfs_metadata_cache stores fetched IPFS metadata keyed by CID. sync_status tracks the last synced block per contract address for crash recovery.

One interesting decision: I store prices as TEXT instead of DECIMAL. That sounds wrong at first, but ETH values in wei are 18-decimal integers that can exceed what DECIMAL(20,8) handles cleanly. Storing the raw wei string and converting in the application layer avoids precision issues. The trade-off is that you can't do native SQL arithmetic on prices, so aggregate queries like "total volume" need to handle the conversion. I do that in the analytics service.

The 10 indexes cover the most common query patterns: owner lookups, active listing filters, seller/buyer queries, and time-ordered history. I deliberately indexed sold_at DESC and listed_at DESC since the app almost always wants the most recent data. The trade-off is slower writes (every insert updates 10 indexes), but for a marketplace where reads vastly outnumber writes, that's the right call.


WHY QUESTIONS / ARCHITECTURAL DECISIONS

Q: Why ERC-721 instead of ERC-1155?
A: ERC-721 is the standard for unique NFTs. ERC-1155 is for semi-fungible tokens where you want both fungible and non-fungible in one contract. For a marketplace where each NFT is unique with its own metadata and royalty settings, ERC-721 is the right choice. Plus ERC-721 has broader wallet and marketplace compatibility.

The genuine trade-off: ERC-1155 is more gas efficient for batch operations since it has native batch transfer built into the standard, while I had to implement my own batchMint on top of ERC-721. ERC-1155 also lets you do things like "100 copies of this card" which ERC-721 can't. But for a marketplace focused on unique digital assets, the simplicity and ecosystem compatibility of ERC-721 wins. OpenSea, Rarible, and most wallets have deeper ERC-721 support. If I were building a gaming marketplace where items could have quantities (like "50 healing potions"), I'd go ERC-1155.

Q: Why OpenZeppelin instead of writing from scratch?
A: Security is the main reason. OpenZeppelin contracts are audited by multiple firms and used in contracts holding billions in value. Writing my own ERC-721 would mean reinventing battle-tested code and introducing potential security holes. I extend their contracts and add my own logic on top. ReentrancyGuard, Ownable, ERC2981 are all proven patterns.

The trade-off is contract size and gas. When you inherit from OpenZeppelin, you pull in code you might not use. My GameNFT inherits ERC721URIStorage which includes the full ERC-721 implementation plus URI storage, even though I only use a subset of the functionality. This adds to deployment cost. There are alternatives like Solmate (by Paradigm) that offer more gas-optimized implementations, or you could use OpenZeppelin's minimal proxy pattern. But for a portfolio project, the priority is showing that I make secure architectural decisions, not saving a few thousand gas on deployment.

Q: Why custom errors instead of require strings?
A: Gas efficiency. Custom errors are cheaper than require with string messages because the string gets stored in the contract bytecode and inflates deployment cost. Custom errors like NotTokenOwner, TileAlreadyClaimed encode the error data more efficiently using selector bytes. This is a Solidity 0.8+ pattern that's now considered best practice.

Worth noting: custom errors also compose better with tooling. Ethers.js can decode them into structured error objects, so the frontend can show specific error messages to users without parsing strings. The downside is slightly worse readability in the contract code itself, since the error definitions are separate from where they're used. But that's a small price for the gas savings and tooling benefits.

Q: Why batch processing for event indexing?
A: Performance and RPC efficiency. Querying events one block at a time would mean one RPC call per block per event type. With 8 event types, that's 8 calls per block. At 2-second polling intervals, you'd quickly overwhelm an RPC endpoint. By querying 100 blocks at a time with Promise.all across all event types, I reduce it to 8 parallel calls per batch.

The 100-block batch size was a conscious choice. Too small and you're making too many RPC calls. Too large and you risk hitting response size limits on public RPC nodes (Alchemy and Infura typically cap at 10,000 blocks per query, but the response payload can get huge with active contracts). 100 is conservative and production-safe. On a local Hardhat node I could use much larger batches, but I wanted the code to work without changes on real networks.

One limitation: I process events sequentially within each batch (sorted by block and log index). This maintains ordering guarantees but means a slow database write blocks subsequent events. In a high-throughput scenario, I'd consider a write-ahead queue pattern where events go into a buffer and a separate worker drains them to the database.

Q: Why separate contracts instead of one monolithic contract?
A: Separation of concerns. GameNFT handles token logic (minting, metadata, royalties). Marketplace handles trading logic (listing, buying, fees). This makes each contract simpler to test and audit. It also means the NFT contract could work with any marketplace, not just mine, which is how real NFT projects work. Your NFTs should be portable.

The trade-off is cross-contract calls. When buyNFT executes, it calls safeTransferFrom on the NFT contract, which is an external call that costs more gas than an internal function call would in a monolithic design. It also introduces a potential attack surface at the contract boundary. But the composability benefit is huge, since this is actually how the entire DeFi/NFT ecosystem is built. Protocols compose with each other through standardized interfaces.

Q: Why Express instead of Fastify for the backend?
A: Honestly, Express was the familiar choice and Express 5 was freshly released when I built this. For a blockchain backend that spends most of its time waiting on RPC calls and database queries, the raw request throughput difference between Express and Fastify (Fastify handles roughly 2-3x more requests per second in benchmarks) doesn't matter much. The bottleneck is the blockchain, not the HTTP framework.

That said, if I were building this today for production, I'd seriously consider Fastify. It has native TypeScript support, built-in schema validation with AJV (which would replace manual input validation), and the plugin architecture is cleaner than Express middleware. The main reason Express still wins for projects like this is ecosystem: more middleware, more examples, more Stack Overflow answers. But Fastify's ecosystem has caught up significantly.

Q: Why Socket.IO instead of raw WebSockets?
A: Socket.IO gives me automatic reconnection, room-based broadcasting, and fallback to long-polling if WebSocket connections fail. Raw WebSockets would be leaner but I'd have to implement reconnection logic, heartbeats, and message serialization myself.

The trade-off is overhead. Socket.IO adds its own protocol layer on top of WebSocket, which means larger message sizes and slightly higher latency. For a real-time trading platform where microseconds matter (like a DEX), I'd use raw WebSockets or even WebTransport. For an NFT marketplace where updates are event-driven and latency in the hundreds of milliseconds is fine, Socket.IO's developer experience wins. I broadcast 8 event types: nftMinted, nftTransferred, nftListed, nftSold, nftCancelled, priceUpdated, defaultRoyaltyUpdated, and tokenRoyaltyUpdated.

Q: Why Pinata for IPFS instead of alternatives?
A: Pinata has the best developer experience for IPFS pinning. Their SDK is straightforward, the dashboard is useful for debugging, and they have dedicated IPFS gateways for fast retrieval.

The alternatives each have different strengths. NFT.Storage uses Filecoin for long-term persistence, meaning your data survives even if the pinning service goes down since it's backed by an on-chain endowment. That's the "correct" choice for production NFTs that need to last forever. Filebase offers S3-compatible APIs and geo-redundant pinning with 3x replication, which is great for reliability. For a portfolio project, Pinata's simplicity won and I cache IPFS metadata in PostgreSQL anyway so I'm not hammering the gateway on every request. In production I'd probably use NFT.Storage for the permanence guarantee and Pinata as a fast retrieval layer.

Q: Why React + Vite instead of Next.js for the frontends?
A: These are pure client-side dApps that interact directly with the blockchain through the user's wallet. There's no server-side rendering benefit since all the data comes from on-chain events and the backend API. Next.js would add complexity (server components, routing conventions, SSR hydration) without a clear payoff for a wallet-connected dApp.

Vite gives me instant HMR, TypeScript support out of the box, and a fast build. The two-frontend architecture (marketplace + creator dashboard) maps cleanly to two separate Vite apps. With Next.js I'd either need a monorepo setup or two separate Next.js projects, both of which add deployment complexity. The trade-off: Next.js has better SEO support, so if the marketplace needed public-facing pages that search engines could index (like OpenSea's collection pages), I'd use Next.js for those and keep the wallet-connected trading UI as a Vite SPA.


WALK ME THROUGH QUESTIONS

Q: Walk me through what happens when someone buys an NFT
A: User clicks buy on the marketplace frontend. React sends a transaction through ethers.js calling Marketplace.buyNFT with the NFT contract address and tokenId, sending ETH as msg.value. The contract checks the NFT is listed (mapping lookup), checks msg.value >= listing price. Calculates platform fee: price * 250 / 10000 = 2.5%. Checks if the NFT contract supports ERC-2981 via supportsInterface. If yes, calls royaltyInfo(tokenId, price) to get royalty amount and receiver. Seller gets price - platformFee - royalty. Transfers the NFT from seller to buyer via safeTransferFrom. Sends platform fee to contract (accumulated for owner withdrawal). Sends royalty to creator. Sends remainder to seller. Refunds overpayment to buyer. Emits Sold event. Backend's EventIndexer picks up the event on its next 2-second poll cycle, processes it, stores the sale in trading_history and updates the nfts table owner, then broadcasts via Socket.IO. Marketplace frontend updates in real time.

One thing worth calling out: there's an inherent delay between the on-chain transaction confirming and the frontend updating. The transaction confirms in whatever the block time is (12 seconds on mainnet, instant on Hardhat), then the indexer picks it up within 2 seconds, processes it, and broadcasts. So worst case you're looking at about 14 seconds of latency on mainnet. The frontend could optimistically update the UI immediately and reconcile when the event comes through, but I didn't implement that. It's a common pattern in production dApps though.

Q: Walk me through the testing workflow
A: I run npx hardhat test. Hardhat spins up a local blockchain. The fixture function deployMarketplaceFixture runs first: deploys GameNFT, deploys Marketplace, mints 3 test NFTs to the seller account. Each test gets a snapshot of this state so they're isolated. Tests use Chai expectations and Hardhat's expect(tx).to.emit for event testing. I test happy paths, reverts with custom errors, edge cases like max batch size, and complex scenarios like a full list-update-buy cycle.

The fixture pattern is key for test performance. Without it, every test would need to deploy contracts fresh, which takes time. Hardhat's loadFixture takes a snapshot after the first deployment and reverts to it before each test, so you get clean state without the deployment overhead. This is similar to how database tests use transactions that roll back.


WHAT WOULD YOU CHANGE QUESTIONS

Q: What would you do differently?
A: A few things, in order of impact:

First, I'd add Foundry alongside Hardhat. Foundry tests run in Solidity itself, which is 2-5x faster than JavaScript-based Hardhat tests. More importantly, Foundry gives you fuzz testing and invariant testing for free. For payment distribution math, fuzz testing would automatically find edge cases with weird price values. Hardhat would still handle deployment scripts since its Ignition deployment framework is more mature.

Second, I'd implement a proxy pattern (UUPS or Transparent) for upgradeability. Right now if I find a bug in production, I'd need to deploy a new contract and somehow migrate all state. With a proxy, I can upgrade the logic while keeping the same address and state. The trade-off is complexity and a larger attack surface (the proxy admin becomes a critical security role), but for a production marketplace it's worth it.

Third, I'd implement off-chain order signing (EIP-712) so listings don't require on-chain transactions. Users would sign a typed message, the signature gets stored off-chain, and the buyer submits the signature with their purchase transaction. This saves gas for sellers (listing is free) and enables gasless experiences. OpenSea's Seaport protocol does this.

Fourth, I'd add chain reorg handling to the indexer. On mainnet, blocks can be reorganized (replaced by competing blocks), which means events you already processed might be invalidated. I'd need to watch for "removed" events and roll back database state accordingly. This is one of the main reasons production dApps use The Graph instead of custom indexers.

Q: What are the limitations?
A: No upgradeability pattern, so if I find a bug in production I'd need to deploy a new contract and migrate. No off-chain order book, so every listing costs gas. The batch mint limit of 20 is a pragmatic gas limit choice but does restrict use cases. No auction mechanism, only fixed-price sales. No support for ERC-20 token payments (ETH only). The indexer doesn't handle chain reorgs, which would be critical on mainnet. No rate limiting or authentication on the API endpoints. No HTTPS or CORS configuration for production deployment. The Socket.IO setup doesn't use rooms or namespaces, so every client gets every event even if they're only watching one NFT.

I'm also aware that storing all event data in a single PostgreSQL instance doesn't scale horizontally. For a high-traffic marketplace, I'd need read replicas or a time-series database for the analytics queries that do the heaviest lifting.

Q: How would you adapt this for ERC-20 tokenization?
A: The patterns transfer directly. Instead of ERC721URIStorage, I'd use ERC20 with additional compliance features. Mint and burn functions map directly. The big addition is an allowlist: a mapping of approved addresses checked before any transfer. OpenZeppelin's AccessControl handles role-based permissions for minter, burner, compliance officer roles. The event indexing from my backend translates directly, just indexing Transfer, Mint, and Burn events instead of NFT events. The database schema simplifies since ERC-20 tokens are fungible, so instead of tracking individual tokens you track balances per address.

Q: How would you scale the indexer for production?
A: The current architecture polls a single node every 2 seconds. For production I'd make several changes. First, I'd switch to WebSocket subscriptions instead of polling, so I get events pushed to me in real time instead of polling for them. Second, I'd add a message queue (Redis or RabbitMQ) between the event fetcher and the database writer, so spikes in event volume don't overwhelm PostgreSQL. Third, I'd shard the indexer by contract address so different instances handle different contracts. Fourth, I'd add monitoring and alerting for indexer lag, since if the indexer falls behind the chain tip, users see stale data.

Alternatively, for production I'd probably just use The Graph. It handles all of this, plus chain reorgs, plus it gives you a GraphQL API. The custom indexer was a great learning exercise and gives me full control, but The Graph exists precisely because custom indexers are hard to get right at scale.


MODELS AND LIBRARIES CHEAT SHEET

Name                    What it does                                Why it's here
Solidity 0.8.30         Smart contract language                     Latest stable, custom errors, overflow protection built-in
OpenZeppelin 5.4.0      Contract libraries                          Audited, battle-tested ERC-721, ERC-2981, ReentrancyGuard, Ownable
Hardhat 3.0.7           Dev environment                             Compile, test, deploy. Local blockchain for testing
ethers.js 6.15.0        Blockchain interaction                      Connect frontend/backend to smart contracts. Native BigInt support
Express 5.1.0           REST API                                    25 endpoints for marketplace, NFTs, analytics
PostgreSQL 18.0         Database                                    Event storage, analytics queries, TEXT columns for wei values
Socket.IO 4.8.1         Real-time                                   WebSocket broadcasting for live marketplace updates (8 event types)
Pinata SDK 0.5+         IPFS                                        NFT metadata storage (images, attributes)
React 19.2.0            Frontend                                    Two apps: marketplace (18 components) + creator dashboard (10 components)
Vite 7.1.10             Build tool                                  Fast HMR, TypeScript out of box
Tailwind CSS 4.1.14     Styling                                     Utility-first CSS for both frontends
Recharts 3.3.0          Charts                                      Trading volume, price history, analytics visualizations
Chai                    Test assertions                             expect().to.equal, expect().to.be.revertedWithCustomError
Docker Compose          Orchestration                               5 containers, one-command startup with docker-up.ps1


KEY FILES MAP

If they ask about...                    Open this file
NFT minting and royalties               contracts/contracts/GameNFT.sol
Marketplace trading logic                contracts/contracts/Marketplace.sol
GameNFT tests (32)                       contracts/test/GameNFT.test.ts
Marketplace tests (42)                   contracts/test/Marketplace.test.ts
Event indexing and processing            backend/src/services/EventIndexer.ts (polling, parallel queries, sequential processing)
NFT data management                      backend/src/services/NFTService.ts
Marketplace operations                   backend/src/services/MarketplaceService.ts
Analytics and stats                      backend/src/services/AnalyticsService.ts
IPFS metadata caching                    backend/src/services/IPFSService.ts
API routes (25 endpoints)                backend/src/api/nftRoutes.ts, marketplaceRoutes.ts, analyticsRoutes.ts
Real-time WebSocket server               backend/src/websocket/server.ts
Database schema (5 tables, 10 indexes)   backend/migrations/001_nft_tables.sql
Docker orchestration                     docker-compose.yml
One-command startup                      scripts/docker-up.ps1
Marketplace frontend (18 components)     marketplace-frontend/src/components/
Creator dashboard (10 components)        creator-dashboard/src/components/
Hardhat config                           contracts/hardhat.config.ts
Deployment script                        contracts/ignition/modules/
