# Testing Guide

Complete testing documentation for the NFT Trading Platform.

## Test Suites Overview

| Suite | Location | Tests | Duration | Purpose |
|-------|----------|-------|----------|---------|
| Smart Contracts | `contracts/test/` | 52 | <15s | Contract logic verification |
| Integration | `tests/integration/` | 4 | ~90s | Cross-component flows |
| E2E | `tests/e2e/` | 1 | ~120s | Full stack lifecycle |
| Manual | Browser | N/A | Varies | User acceptance testing |

## Running Tests

### Smart Contract Tests

```powershell
cd contracts
npx hardhat test

# Expected: 52 tests passing
# - GameNFT.test.ts: 27 tests
# - Marketplace.test.ts: 25 tests
```

### Integration Tests

```powershell
# Ensure services are running first
.\scripts\docker-up.ps1

# Run all integration tests
cd scripts
npm run test-all

# Or run individual tests
npx tsx ../tests/integration/01-full-mint-flow.test.ts
npx tsx ../tests/integration/02-marketplace-flow.test.ts
npx tsx ../tests/integration/03-websocket-flow.test.ts
npx tsx ../tests/integration/04-analytics-flow.test.ts
```

### E2E Test

```powershell
# Full stack test with real IPFS uploads
npx tsx tests/e2e/full-stack.test.ts

# Duration: 90-120 seconds
# Requires: Pinata JWT configured (optional)
```

### Stack Verification

```powershell
# Quick health check of all services
npx tsx scripts/verify-stack.ts

# Expected: All services healthy
```

## Test Coverage

### Contract Tests (52 total)

**GameNFT.sol (27 tests)**
- Deployment and initialization
- Single NFT minting
- Batch minting (1-20 tokens)
- Royalty management (default and per-token)
- Access control (owner-only functions)
- ERC-721 and ERC-2981 compliance

**Marketplace.sol (25 tests)**
- Listing creation and management
- NFT purchasing with payment distribution
- Price updates and cancellations
- Platform fee management
- Royalty payment integration
- Reentrancy protection

### Integration Tests (4 suites)

**Test 1: Full Mint Flow**
- Wallet connection
- IPFS image upload (SVG generation)
- Metadata creation and upload
- Smart contract minting
- Backend event indexing
- API data verification

**Test 2: Marketplace Flow**
- Multi-account setup
- NFT minting and approval
- Marketplace listing
- Purchase transaction
- Ownership transfer
- Trading volume updates

**Test 3: WebSocket Flow**
- Server connection
- Room-based subscriptions
- Real-time event broadcasting
- Event deduplication
- Multiple client simulation

**Test 4: Analytics Flow**
- Platform statistics
- Top traders leaderboard
- Trading volume over time
- Price distribution
- Most expensive sales
- User-specific analytics

### E2E Test (Full Lifecycle)

- 3 NFT mints with real IPFS images
- Multiple marketplace listings
- Floor price calculation
- Multiple purchases
- Platform statistics verification
- WebSocket event tracking

## Manual Testing Checklist

### Prerequisites

- [ ] Docker services running (`.\scripts\docker-up.ps1`)
- [ ] MetaMask installed in browser
- [ ] MetaMask connected to localhost:8545
- [ ] Test accounts imported (from Hardhat node output)

### Marketplace Frontend Testing

**Wallet Connection**
- [ ] Connect MetaMask wallet
- [ ] Verify address displayed correctly
- [ ] Verify balance shown
- [ ] Test account switching
- [ ] Test network switching

**NFT Browsing**
- [ ] View all NFTs in grid
- [ ] Click NFT to see details
- [ ] Verify IPFS images load
- [ ] Check metadata display
- [ ] Test pagination (if >20 NFTs)

**Search & Filters**
- [ ] Search by token ID
- [ ] Filter by price range
- [ ] Sort by price (low/high)
- [ ] Sort by recent
- [ ] Apply multiple filters
- [ ] Clear filters

**Buying NFTs**
- [ ] Find listed NFT
- [ ] Click "Buy Now"
- [ ] Confirm transaction in MetaMask
- [ ] Wait for confirmation
- [ ] Verify ownership transfer
- [ ] Check balance deducted

**Selling NFTs**
- [ ] Go to "My NFTs"
- [ ] Select owned NFT
- [ ] Click "List for Sale"
- [ ] Set price
- [ ] Approve NFT (first time)
- [ ] Confirm listing
- [ ] Verify appears in marketplace

**Real-time Updates**
- [ ] Open marketplace in 2 browser windows
- [ ] List NFT in window 1
- [ ] Verify appears in window 2 immediately
- [ ] Buy NFT in window 2
- [ ] Verify disappears in window 1

**Analytics Dashboard**
- [ ] View platform statistics
- [ ] Check trading volume chart
- [ ] View top traders table
- [ ] Check price distribution
- [ ] Verify data accuracy

### Creator Dashboard Testing

**Owner Verification**
- [ ] Connect owner wallet
- [ ] Verify access granted
- [ ] Connect non-owner wallet
- [ ] Verify access message shown

**Single NFT Minting**
- [ ] Upload image (drag & drop)
- [ ] Fill name and description
- [ ] Add attributes
- [ ] Click "Upload to IPFS"
- [ ] Wait for IPFS upload
- [ ] Click "Mint NFT"
- [ ] Confirm transaction
- [ ] Verify success message
- [ ] Check token ID displayed

**Batch Minting**
- [ ] Select multiple images (5-10)
- [ ] Choose metadata option (CSV or auto-generate)
- [ ] Upload batch to IPFS
- [ ] Verify progress bars
- [ ] Click "Batch Mint"
- [ ] Confirm transaction
- [ ] Verify all token IDs
- [ ] Check success summary

**NFT Management**
- [ ] View all created NFTs
- [ ] Search for specific NFT
- [ ] Filter by status (All/Listed/Unlisted)
- [ ] Check statistics dashboard
- [ ] Verify counts accurate

**Royalty Settings**
- [ ] View default royalty (2.5%)
- [ ] Update default royalty to 5%
- [ ] Set per-token royalty
- [ ] Verify updates successful

**Marketplace Listing from Creator Dashboard**
- [ ] Select created NFT
- [ ] Click "List on Marketplace"
- [ ] Set price
- [ ] Approve if needed
- [ ] Confirm listing
- [ ] Verify appears in marketplace

**Analytics**
- [ ] View minting activity chart
- [ ] Check sales by NFT chart
- [ ] View royalty earnings
- [ ] Export data to CSV
- [ ] Verify CSV format

### Error Handling Testing

**Invalid Inputs**
- [ ] Try listing with 0 ETH price
- [ ] Try listing with negative price
- [ ] Try batch mint with >20 NFTs
- [ ] Try uploading >10MB image
- [ ] Try unsupported file format

**Transaction Failures**
- [ ] Try buying without enough ETH
- [ ] Try listing NFT you don't own
- [ ] Try buying your own NFT
- [ ] Try cancelling someone else's listing
- [ ] Reject transaction in MetaMask

**Network Issues**
- [ ] Disconnect wallet mid-transaction
- [ ] Switch networks during action
- [ ] Close backend server
- [ ] Check error messages displayed

## Performance Testing

### Load Testing Scenarios

**Concurrent Minting**
- 10 users minting simultaneously
- Expected: All succeed within 30s

**High Transaction Volume**
- 50 listings + 50 purchases in 5 minutes
- Expected: All process correctly

**WebSocket Load**
- 100+ concurrent connections
- Expected: All receive events <1s latency

### Performance Benchmarks

| Operation | Expected Time |
|-----------|--------------|
| Contract deployment | <10s |
| Single NFT mint | 5-10s |
| Batch mint (10 NFTs) | 30-60s |
| IPFS image upload | 5-15s |
| Marketplace listing | 5-10s |
| NFT purchase | 5-10s |
| Backend event indexing | 15-20s |
| API response time | <100ms |
| WebSocket event broadcast | <1s |

## Debugging Tests

### Common Issues

**Tests Timeout**
- Increase wait times in test helpers
- Check backend event indexer logs
- Verify Hardhat node running

**Contract Not Found Errors**
- Redeploy contracts
- Update .env files with new addresses
- Restart backend

**Database Query Errors**
- Check PostgreSQL running
- Verify migrations ran
- Check for NULL values

**IPFS Upload Failures**
- Verify Pinata JWT configured
- Check file size <10MB
- Test graceful fallback to mock URIs

### Debug Commands

```powershell
# View all container logs
.\scripts\docker-logs.ps1 -Follow

# Check specific service
.\scripts\docker-logs.ps1 backend -Follow

# Check database state
docker exec nft-postgres psql -U postgres -d nft_marketplace -c "SELECT * FROM nfts ORDER BY token_id DESC LIMIT 5;"

# Check Hardhat accounts
docker logs nft-hardhat | Select-String "Account"

# Test contract interaction
docker exec nft-hardhat npx hardhat console --network localhost
```

## Test Data

### Sample NFTs (tests/integration/testData.ts)

1. **Legendary Sword** - Rarity: Legendary, Power: 100, Element: Fire
2. **Epic Shield** - Rarity: Epic, Defense: 85, Material: Mythril  
3. **Rare Potion** - Rarity: Rare, Healing: 50, Effect: Instant
4. **Dragon Armor** - Rarity: Legendary, Defense: 95, Set: Dragon
5. **Mana Crystal** - Rarity: Epic, Mana: 200, Recharge: Fast

### Test Accounts (Hardhat Node)

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Owner)
Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Seller)
Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (Buyer)
```

Private keys available in Hardhat node startup logs.

## Continuous Integration

### GitHub Actions (Optional)

See `.github/workflows/ci.yml` for automated testing on push.

**Pipeline Steps:**
1. Setup Node.js 22
2. Install dependencies
3. Start Docker services
4. Deploy contracts
5. Run all tests
6. Generate coverage report
7. Upload artifacts

## Test Maintenance

### Adding New Tests

1. Create test file in appropriate directory
2. Import test helpers from `tests/integration/helpers.ts`
3. Use proper async/await patterns
4. Include wait times for blockchain operations
5. Clean up test data after completion

### Updating Tests After Changes

**Smart Contract Changes:**
- Update contract tests
- Rebuild contracts
- Redeploy to test network
- Update integration tests

**Backend API Changes:**
- Update API endpoint tests
- Verify response format changes
- Update frontend integration

**Database Schema Changes:**
- Update migration files
- Regenerate types
- Update service tests

## Test Coverage Goals

- [ ] Smart Contracts: 100% function coverage
- [ ] Backend Services: 90%+ coverage
- [ ] API Endpoints: 100% endpoint coverage
- [ ] Integration Tests: All critical paths
- [ ] E2E Tests: Complete user workflows
- [ ] Manual Tests: All UI interactions

## Known Test Limitations

1. **Local Network Only** - Tests run on Hardhat localhost, not testnet/mainnet
2. **IPFS Optional** - Tests work with or without Pinata configuration
3. **No Load Testing** - Performance tests are manual
4. **Sequential Execution** - Some tests must run sequentially
5. **Time-Dependent** - Tests include fixed wait times for blockchain operations

## Getting Help

**Test Failures:**
1. Check service logs: `.\scripts\docker-logs.ps1`
2. Verify deployment: `npx tsx scripts/verify-stack.ts`
3. Review test output for specific errors
4. Check Progress Reports for known issues

**Performance Issues:**
1. Increase wait times in test helpers
2. Check system resources (Docker memory/CPU)
3. Verify network connectivity to IPFS

**Questions:**
- Check DOCKER-DEPLOYMENT.md for setup issues
- See PRODUCTION.md for deployment guidance