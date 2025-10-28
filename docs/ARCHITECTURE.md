# System Architecture

Technical architecture documentation for the NFT Trading Platform.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend Layer                          │
├────────────────────────────────┬────────────────────────────────┤
│   Marketplace Frontend         │   Creator Dashboard            │
│   (React 19 + Vite 7)         │   (React 19 + Vite 7)         │
│   - NFT Browsing              │   - NFT Minting               │
│   - Buy/Sell/List             │   - Batch Operations          │
│   - Analytics Dashboard       │   - Royalty Management        │
│   - Real-time Updates         │   - Creator Analytics         │
└────────────────────────────────┴────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend Layer                            │
│                    (Node.js 22 + Express 5)                     │
├─────────────────────────────────────────────────────────────────┤
│  REST API (23 endpoints)    │  WebSocket Server (Socket.IO)   │
│  Event Indexer             │  Real-time Broadcasting          │
│  IPFS Service (Pinata)     │  Room-based Subscriptions       │
└─────────────────────────────────────────────────────────────────┘
            │                      │                    │
            │ ethers.js v6         │ pg v8.13          │ Pinata SDK
            ▼                      ▼                    ▼
┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐
│  Blockchain     │  │  PostgreSQL 18   │  │  IPFS Network     │
│  (Hardhat Node) │  │  (5 tables)      │  │  (via Pinata)     │
│                 │  │  (10 indexes)    │  │                   │
│  GameNFT        │  │  - nfts          │  │  - Images         │
│  Marketplace    │  │  - listings      │  │  - Metadata       │
│                 │  │  - history       │  │  - JSON files     │
└─────────────────┘  └──────────────────┘  └───────────────────┘
```

## Component Details

### Smart Contracts Layer

**GameNFT.sol**
- **Standard**: ERC-721 (NFT) + ERC-2981 (Royalties)
- **Functions**: mint, batchMint, setRoyalty
- **Access Control**: Ownable pattern
- **Events**: Minted(tokenId, owner, tokenURI)

**Marketplace.sol**
- **Functions**: listNFT, buyNFT, cancelListing, updatePrice
- **Security**: ReentrancyGuard, input validation
- **Fee Structure**: 2.5% platform fee + creator royalty
- **Events**: Listed, Sold, Cancelled, PriceUpdated

**Technology:**
- Solidity 0.8.30
- OpenZeppelin Contracts 5.4.0
- Hardhat 3.0.7 (Rust EDR runtime)

### Backend Services

**1. Event Indexer**

```typescript
// Polling-based event detection (2-second intervals)
class EventIndexer {
  private lastBlock = 0;
  
  async poll() {
    const currentBlock = await provider.getBlockNumber();
    const events = await contract.queryFilter('*', this.lastBlock + 1, currentBlock);
    
    for (const event of events) {
      await this.processEvent(event);
    }
    
    this.lastBlock = currentBlock;
  }
}
```

**Processed Events:**
- GameNFT: Minted, Transfer
- Marketplace: Listed, Sold, Cancelled, PriceUpdated

**Data Flow:**
```
Blockchain Event → Event Indexer → Parse Args → Fetch IPFS Metadata →
→ Store in PostgreSQL → Broadcast via WebSocket → Update Frontend
```

**2. IPFS Service**

```typescript
class IPFSService {
  private pinata: PinataSDK;
  private cache: Map<string, NFTMetadata>;
  
  // Upload workflow
  async uploadMetadata(metadata: NFTMetadata): Promise<string> {
    const upload = await this.pinata.upload.json(metadata);
    return upload.IpfsHash; // CID
  }
  
  // Fetch with caching
  async getMetadata(cid: string): Promise<NFTMetadata> {
    if (this.cache.has(cid)) return this.cache.get(cid);
    
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    const metadata = await response.json();
    
    // Cache in PostgreSQL
    await this.cacheInDatabase(cid, metadata);
    this.cache.set(cid, metadata);
    
    return metadata;
  }
}
```

**Gateways** (Fallback chain):
1. Pinata dedicated gateway (fastest)
2. ipfs.io
3. cloudflare-ipfs.com

**3. REST API**

**NFT Endpoints (6):**
```
GET /api/nft/total
GET /api/nft/recent?limit=20
GET /api/nft/search?q=query
GET /api/nft/owner/:address
GET /api/nft/metadata/:tokenId
GET /api/nft/:tokenId
```

**Marketplace Endpoints (9):**
```
GET /api/marketplace/listings
GET /api/marketplace/listing/:tokenId
GET /api/marketplace/seller/:address
GET /api/marketplace/floor
GET /api/marketplace/volume
GET /api/marketplace/history/:tokenId
GET /api/marketplace/recent-sales?limit=20
GET /api/marketplace/expensive-sales?limit=10
GET /api/marketplace/price-range?min=0&max=10
```

**Analytics Endpoints (8):**
```
GET /api/analytics/stats
GET /api/analytics/top-traders?limit=10
GET /api/analytics/volume?days=30
GET /api/analytics/expensive-sales?limit=10
GET /api/analytics/price-distribution
GET /api/analytics/volume-by-nft?limit=10
GET /api/analytics/sales-by-hour
GET /api/analytics/user/:address
```

**4. WebSocket Server**

```typescript
// Room-based broadcasting
class WebSocketServer {
  private io: Server;
  
  broadcast(event: NFTEvent) {
    // Global room (all users)
    this.io.to('global').emit(event.type, event.data);
    
    // NFT-specific room
    this.io.to(`nft-${event.tokenId}`).emit(event.type, event.data);
    
    // Owner-specific rooms
    if (event.owner) {
      this.io.to(`owner-${event.owner}`).emit(event.type, event.data);
    }
  }
}
```

**Rooms:**
- `global` - All marketplace events
- `marketplace` - Listing/sale events only
- `nft-{tokenId}` - Events for specific NFT
- `owner-{address}` - Events for specific owner

### Database Schema

**nfts Table:**
```sql
token_id (PK)
owner (VARCHAR 42)
token_uri (TEXT)
ipfs_cid (VARCHAR 100)
metadata (JSONB)          -- ERC-721 metadata
royalty_receiver (VARCHAR 42)
royalty_amount (INTEGER)  -- Basis points (250 = 2.5%)
minted_at (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**marketplace_listings Table:**
```sql
id (PK, SERIAL)
nft_contract (VARCHAR 42)
token_id (INTEGER)
seller (VARCHAR 42)
price (TEXT)              -- Stored as TEXT to avoid overflow
active (BOOLEAN)
listed_at (TIMESTAMP)
```

**trading_history Table:**
```sql
id (PK, SERIAL)
nft_contract (VARCHAR 42)
token_id (INTEGER)
seller (VARCHAR 42)
buyer (VARCHAR 42)
price (TEXT)
platform_fee (TEXT)
royalty_fee (TEXT)
transaction_hash (VARCHAR 66)
sold_at (TIMESTAMP)
```

**Performance Indexes (10):**
- `idx_nft_owner` - Fast owner lookups
- `idx_nft_minted_at` - Recent NFTs query
- `idx_listing_active` - Active listings filter
- `idx_listing_nft` - Listing by contract+token
- `idx_listing_seller` - Seller's listings
- `idx_listing_listed_at` - Recent listings
- `idx_history_token` - Trading history by token
- `idx_history_buyer` - Buyer's purchases
- `idx_history_seller` - Seller's sales
- `idx_history_sold_at` - Recent sales

**Design Decisions:**
1. **TEXT for Prices** - Prevents DECIMAL overflow with large ETH values
2. **JSONB for Metadata** - Flexible structure, supports JSON queries
3. **Separate Tables** - Normalized design for listings vs history
4. **Timestamps** - All times in UTC

### Frontend Architecture

**Marketplace Frontend:**

```
src/
├── components/
│   ├── Marketplace.tsx           # Main gallery view
│   ├── NFTCard.tsx               # Individual NFT display
│   ├── NFTDetail.tsx             # Detailed modal view
│   ├── MyNFTs.tsx                # User's collection
│   ├── ActivityFeed.tsx          # Real-time events
│   ├── analytics/                # Recharts visualizations
│   ├── modals/                   # Transaction flows
│   └── SearchBar.tsx             # Search + filters
├── hooks/
│   ├── useWallet.ts              # MetaMask connection
│   ├── useNFT.ts                 # NFT data fetching
│   ├── useMarketplace.ts         # Trading operations
│   ├── useWebSocket.ts           # Real-time updates
│   └── useAnalytics.ts           # Analytics data
├── services/
│   ├── api.ts                    # REST API client
│   ├── contracts.ts              # ethers.js contracts
│   └── websocket.ts              # Socket.IO client
└── types/
    └── index.ts                  # TypeScript definitions
```

**State Management:**
- React 19 hooks (useState, useEffect)
- No global state library (Redux/Zustand)
- Single WebSocket instance in App.tsx
- Props-based data flow

**Creator Dashboard:**

Similar structure but focused on:
- NFT minting (single + batch)
- IPFS uploads from frontend
- Royalty management
- Creator analytics

### Data Flow Patterns

**1. NFT Minting Flow**

```
User (Creator Dashboard)
  └─> Upload Image to IPFS (Pinata)
       └─> Generate Metadata JSON
            └─> Upload Metadata to IPFS
                 └─> Call GameNFT.mint(tokenURI)
                      └─> Transaction Confirmed
                           └─> Event Emitted
                                └─> Backend Indexes Event
                                     └─> Store in Database
                                          └─> Broadcast WebSocket
                                               └─> Update Frontend
```

**2. NFT Purchase Flow**

```
User (Marketplace)
  └─> Click "Buy Now"
       └─> Confirm in MetaMask
            └─> Call Marketplace.buyNFT{value: price}
                 └─> Payment Split:
                      ├─> Seller (95%)
                      ├─> Platform Fee (2.5%)
                      └─> Creator Royalty (2.5%)
                 └─> NFT Transferred to Buyer
                      └─> Event Emitted
                           └─> Backend Processes:
                                ├─> Update Ownership
                                ├─> Deactivate Listing
                                └─> Record in Trading History
                           └─> Broadcast WebSocket
                                └─> Update All Clients
```

**3. Real-time Synchronization**

```
Blockchain Event
  └─> Event Indexer (polls every 2s)
       └─> Parse Event Args
            └─> Update Database
                 └─> WebSocket.broadcast()
                      └─> All Connected Clients
                           ├─> Marketplace: Update grid
                           ├─> NFT Detail: Update status
                           ├─> Activity Feed: Add event
                           └─> Creator Dashboard: Update stats
```

## Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Smart Contracts | Solidity | 0.8.30 | ERC-721 + Marketplace |
| Contract Deployment | Hardhat | 3.0.7 | Testing + Deployment |
| Contract Libraries | OpenZeppelin | 5.4.0 | Audited standards |
| Blockchain Client | ethers.js | 6.15.0 | Contract interaction |
| Backend Runtime | Node.js | 22.20.0 | Server execution |
| Backend Framework | Express | 5.1.0 | REST API |
| Database | PostgreSQL | 18.0 | Data persistence |
| Database Client | pg | 8.13.1 | PostgreSQL driver |
| WebSocket | Socket.IO | 4.8.1 | Real-time updates |
| IPFS Service | Pinata SDK | 0.5.0+ | Metadata storage |
| Frontend Framework | React | 19.2.0 | UI components |
| Frontend Build | Vite | 7.1.10 | Dev server + bundler |
| Frontend Styling | Tailwind CSS | 4.1.14 | CSS framework |
| Charts | Recharts | 3.3.0 | Data visualization |
| Language | TypeScript | 5.9.x | Type safety |
| Container | Docker | 24+ | Deployment |

## Scaling Considerations

### Horizontal Scaling

**Backend:**
- Multiple Node.js instances behind load balancer
- Sticky sessions for WebSocket connections
- Shared Redis for session state
- Database read replicas for heavy queries

**Frontend:**
- Static files on CDN
- Edge caching for API responses
- Geo-distributed deployments

### Database Optimization

**Query Optimization:**
- Prepared statements
- Connection pooling (25-50 connections)
- Index optimization based on slow query log
- Materialized views for complex analytics

**Data Archiving:**
- Archive trading_history older than 1 year
- Keep active listings in hot storage
- Move historical data to cold storage

### Caching Strategy

```typescript
// Redis caching layer
const cache = new Redis(process.env.REDIS_URL);

async function getCachedData(key: string, fetchFn: () => Promise<any>, ttl: number) {
  const cached = await cache.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetchFn();
  await cache.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Cache NFT data for 5 minutes
const nft = await getCachedData(`nft:${tokenId}`, () => getNFTFromDB(tokenId), 300);
```

### Load Testing

**Expected Performance (1000 concurrent users):**
- API Response Time: <200ms (p95)
- WebSocket Latency: <500ms
- Database Queries: <50ms
- IPFS Fetch: <1s (cached: <10ms)

**Bottlenecks:**
1. Database queries (use read replicas)
2. IPFS metadata fetching (cache aggressively)
3. Blockchain RPC calls (use provider with high rate limits)
4. WebSocket broadcasting (shard by rooms)

## Monitoring & Observability

**Key Metrics:**
- Request rate and response times
- Error rates by endpoint
- Database connection pool usage
- WebSocket connection count
- Blockchain sync lag
- IPFS upload/fetch success rate
- Transaction success rate

**Logging:**
- Structured JSON logs
- Request/response logging
- Error stack traces
- Blockchain transaction hashes
- User actions (anonymized)

**Alerting:**
- Error rate > 5% for 5 minutes
- Response time p95 > 2 seconds
- Database connections > 80% pool
- Blockchain sync lag > 100 blocks

## Development Workflow

**Local Development:**
```powershell
# Terminal 1: Contracts
cd contracts && npx hardhat node

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Marketplace
cd marketplace-frontend && npm run dev

# Terminal 4: Creator Dashboard
cd creator-dashboard && npm run dev
```

**Docker Development:**
```powershell
.\scripts\docker-up.ps1
```

**Testing:**
```powershell
# Smart contracts
cd contracts && npx hardhat test

# Integration tests
cd scripts && npm run test-all

# Stack verification
npx tsx scripts/verify-stack.ts
```

## Future Enhancements

**Phase 7+ Roadmap:**
1. **Auction System** - English/Dutch auctions
2. **Offer System** - Make offers below listing price
3. **NFT Bundling** - Sell multiple NFTs as package
4. **Collection Pages** - Group NFTs by collection
5. **Advanced Filtering** - Rarity scores, trait filters
6. **User Profiles** - Reputation, badges, followers
7. **Multi-chain Support** - Polygon, Arbitrum, Base
8. **Mobile Apps** - React Native for iOS/Android
9. **Social Features** - Comments, favorites, shares
10. **DAO Governance** - Community-driven decisions