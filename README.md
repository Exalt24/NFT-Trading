# NFT Trading Platform

A complete, production-ready full-stack NFT marketplace and creator platform built with modern web3 technologies. Features ERC-721 NFT minting, IPFS metadata storage, real-time marketplace trading, creator tools, and comprehensive analytics.

## ✨ Features

### 🎨 Creator Dashboard
- **Single & Batch NFT Minting** - Mint up to 20 NFTs simultaneously
- **IPFS Integration** - Decentralized image and metadata storage via Pinata
- **Royalty Management** - Set default (2.5%) or per-token royalties (0-10%)
- **Creator Analytics** - Track minting activity, sales, and royalty earnings
- **Direct Marketplace Listing** - List NFTs for sale immediately after creation

### 🏪 NFT Marketplace
- **Browse & Search** - Filter by price, status, and search by token ID/name
- **Real-time Updates** - WebSocket-powered live activity feed
- **Buy/Sell/List** - Complete trading functionality with MetaMask integration
- **Advanced Analytics** - Trading volume charts, price distribution, top traders
- **Price History** - Per-NFT price tracking with Recharts visualizations
- **My NFTs** - Personal collection management with quick actions

### 🔗 Smart Contracts
- **ERC-721 Standard** - OpenZeppelin 5.4.0 compliant NFT contract
- **ERC-2981 Royalties** - Built-in royalty support for creators
- **Marketplace Contract** - Secure trading with 2.5% platform fee
- **Reentrancy Protection** - Security-hardened with OpenZeppelin guards
- **Comprehensive Testing** - 52 tests covering all contract functions

### 🚀 Backend Infrastructure
- **Event Indexer** - Automatic blockchain event synchronization
- **REST API** - 23 endpoints for NFT, marketplace, and analytics data
- **WebSocket Server** - Room-based real-time broadcasting (Socket.IO)
- **PostgreSQL 18** - High-performance data persistence with optimized indexes
- **IPFS Caching** - Metadata caching for faster load times

---

## 🎯 Quick Start (One Command)

```powershell
.\scripts\docker-up.ps1
```

That's it! This command:
1. ✅ Builds all Docker images
2. ✅ Starts PostgreSQL and Hardhat node
3. ✅ Deploys smart contracts
4. ✅ Copies fresh ABIs to frontends
5. ✅ Updates all environment variables
6. ✅ Starts backend + marketplace + creator dashboard

**Time:** 3-5 minutes first run, 1-2 minutes after

---

## 🌐 Access Your Platform

| Service | URL | Purpose |
|---------|-----|---------|
| 🏪 **Marketplace** | http://localhost:3002 | Browse and trade NFTs |
| 🎨 **Creator Dashboard** | http://localhost:3003 | Mint and manage NFTs |
| 🔌 **Backend API** | http://localhost:4001/api | REST API endpoints |
| 💚 **Health Check** | http://localhost:4001/health | System status |
| ⛓️ **Hardhat RPC** | http://localhost:8546 | Blockchain node |
| 🗄️ **PostgreSQL** | localhost:5433 | Database |

> **Note:** Ports are different from defaults (3002/3003/4001/5433/8546 instead of 3000/3001/4000/5432/8545) to avoid conflicts with other projects. Internal Docker networking uses standard ports.

---

## 📋 Prerequisites

- **Node.js** 22.12+ ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **PowerShell** (included with Windows)
- **Pinata Account** (optional, for IPFS) ([Sign up](https://pinata.cloud/))

---

## 🛠️ Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Smart Contracts** | Solidity | 0.8.30 | ERC-721 NFTs + Marketplace |
| | Hardhat | 3.0.7 | Development & Testing |
| | OpenZeppelin | 5.4.0 | Audited contract libraries |
| | ethers.js | 6.15.0 | Blockchain interaction |
| **Backend** | Node.js | 22.20.0 | Server runtime |
| | Express | 5.1.0 | REST API framework |
| | PostgreSQL | 18.0 | Database |
| | Socket.IO | 4.8.1 | Real-time WebSocket |
| | Pinata SDK | 0.5.0+ | IPFS storage |
| **Frontend** | React | 19.2.0 | UI framework |
| | Vite | 7.1.10 | Build tool & dev server |
| | Tailwind CSS | 4.1.14 | Styling |
| | Recharts | 3.3.0 | Analytics charts |
| **Language** | TypeScript | 5.9.x | Type safety |
| **Container** | Docker | 24+ | Deployment |

---

## 📦 Installation

### Option 1: Docker (Recommended) ⭐

```powershell
# Clone repository
git clone <repository-url>
cd nft-trading-game

# Start everything (Docker handles all configuration)
.\scripts\docker-up.ps1
```

> **Note:** Docker automatically configures all ports and addresses. Your `.env` files are overridden by `docker-compose.yml`, so no manual environment setup needed!

### Option 2: Manual Setup

```powershell
# 1. Install dependencies
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd marketplace-frontend && npm install && cd ..
cd creator-dashboard && npm install && cd ..

# 2. Setup environment files
Copy-Item backend\.env.example backend\.env
Copy-Item marketplace-frontend\.env.example marketplace-frontend\.env
Copy-Item creator-dashboard\.env.example creator-dashboard\.env

# 3. Start PostgreSQL
docker-compose up postgres -d

# 4. Start services (separate terminals)
cd contracts && npx hardhat node                    # Terminal 1
cd backend && npm run migrate && npm run dev        # Terminal 2
cd marketplace-frontend && npm run dev              # Terminal 3
cd creator-dashboard && npm run dev                 # Terminal 4
```

---

## 🎮 Usage Guide

### 1. Connect MetaMask

Add Hardhat network to MetaMask:
- **Network Name:** Hardhat Local
- **RPC URL:** `http://localhost:8546`
- **Chain ID:** `31338`
- **Currency Symbol:** ETH

Import test account (from Hardhat node logs):
```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Owner)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 2. Mint Your First NFT

1. Open Creator Dashboard: http://localhost:3003
2. Connect MetaMask (owner account)
3. Upload an image (drag & drop or select)
4. Fill in metadata (name, description, attributes)
5. Click "Upload to IPFS" → Wait for upload
6. Click "Mint NFT" → Confirm in MetaMask
7. Success! Your NFT is minted with a token ID

### 3. List on Marketplace

1. In Creator Dashboard, find your minted NFT
2. Click "List on Marketplace"
3. Set price (e.g., 0.5 ETH)
4. Click "Approve NFT" → Confirm in MetaMask
5. Click "List for Sale" → Confirm in MetaMask
6. Your NFT is now listed!

### 4. Buy an NFT

1. Switch to different MetaMask account
2. Open Marketplace: http://localhost:3002
3. Browse NFTs or search by token ID
4. Click on an NFT to see details
5. Click "Buy Now" → Confirm in MetaMask
6. Success! You now own the NFT

### 5. View Analytics

1. Open Marketplace → Click "Analytics" tab
2. View:
   - Platform statistics (sales, volume, traders)
   - Trading volume chart (7d/30d/90d)
   - Price distribution histogram
   - Top traders leaderboard
   - Most expensive sales

---

## 📁 Project Structure

```
nft-trading-game/
├── contracts/              # Smart contracts
│   ├── contracts/          # Solidity files (GameNFT.sol, Marketplace.sol)
│   ├── test/              # Contract tests (52 tests)
│   ├── ignition/          # Hardhat Ignition deployment modules
│   └── scripts/           # Deployment scripts
├── backend/               # Backend services
│   ├── src/
│   │   ├── services/      # Event indexer, NFT, Marketplace, Analytics
│   │   ├── api/          # REST API routes (23 endpoints)
│   │   ├── websocket/    # Socket.IO server
│   │   └── config/       # Database, blockchain, IPFS config
│   └── migrations/        # PostgreSQL schema
├── marketplace-frontend/  # NFT marketplace UI
│   ├── src/
│   │   ├── components/   # React components (21)
│   │   ├── hooks/        # Custom hooks (9)
│   │   ├── services/     # API client, contracts
│   │   └── abis/         # Contract ABIs
├── creator-dashboard/    # NFT creator tools
│   ├── src/
│   │   ├── components/   # React components (12)
│   │   ├── hooks/        # Custom hooks (9)
│   │   └── abis/         # Contract ABIs
├── tests/                # Integration tests
│   ├── integration/      # 4 test suites
│   └── e2e/             # End-to-end tests
├── scripts/              # Deployment & testing scripts
├── docs/                 # Documentation
│   ├── TESTING.md        # Testing guide
│   ├── PRODUCTION.md     # Production deployment
│   ├── SECURITY.md       # Security checklist
│   └── ARCHITECTURE.md   # System architecture
└── docker/               # Dockerfiles
```

---

## 🔧 Essential Commands

### Docker Management

```powershell
# Start everything
.\scripts\docker-up.ps1

# Stop (keep data)
.\scripts\docker-down.ps1 -keep-data

# Stop (delete all data)
.\scripts\docker-down.ps1

# View logs (all services)
.\scripts\docker-logs.ps1

# View logs (specific service)
.\scripts\docker-logs.ps1 backend -Follow
.\scripts\docker-logs.ps1 marketplace -Follow

# Check deployment status
npx tsx scripts/verify-stack.ts

# Restart a service
docker-compose restart backend
docker-compose restart marketplace

# Check individual service status
docker ps | Select-String "nft-"
```

### Development Workflow

**Smart Contracts:**
```powershell
cd contracts
# Edit contracts/GameNFT.sol or contracts/Marketplace.sol
npx hardhat compile
npx hardhat test
npx tsx scripts/docker-deploy-contracts.ts  # Auto-deploys + copies ABIs
docker-compose restart backend
```

**Backend:**
```powershell
cd backend
# Edit files in src/
# Backend auto-reloads with tsx watch
# View logs: .\scripts\docker-logs.ps1 backend -Follow
```

**Frontend:**
```powershell
cd marketplace-frontend  # or creator-dashboard
# Edit files in src/
# Vite hot-reloads automatically
# View in browser: http://localhost:3002 (marketplace) or http://localhost:3003 (creator)
```

### Database Management

```powershell
# Connect to PostgreSQL
docker exec -it nft-marketplace-postgres psql -U postgres -d nft_marketplace

# View tables
\dt

# View NFTs
SELECT token_id, LEFT(owner, 10) as owner, LEFT(token_uri, 30) as uri FROM nfts ORDER BY token_id DESC LIMIT 10;

# View listings
SELECT token_id, LEFT(seller, 10) as seller, price, active FROM marketplace_listings WHERE active = true;

# View recent sales
SELECT token_id, price, LEFT(seller, 10) as seller, LEFT(buyer, 10) as buyer, sold_at FROM trading_history ORDER BY sold_at DESC LIMIT 10;

# Check database size
SELECT pg_size_pretty(pg_database_size('nft_marketplace'));

# Exit
\q

# Reset database (delete all data)
.\scripts\docker-down.ps1  # Deletes volumes
.\scripts\docker-up.ps1    # Fresh start with empty database
```

### Copy ABIs After Contract Changes

```powershell
# Automatically copy ABIs to both frontends
.\scripts\copy-abis.ps1

# Or manually:
Copy-Item contracts\artifacts\contracts\GameNFT.sol\GameNFT.json marketplace-frontend\src\abis\
Copy-Item contracts\artifacts\contracts\Marketplace.sol\Marketplace.json marketplace-frontend\src\abis\
Copy-Item contracts\artifacts\contracts\GameNFT.sol\GameNFT.json creator-dashboard\src\abis\
Copy-Item contracts\artifacts\contracts\Marketplace.sol\Marketplace.json creator-dashboard\src\abis\
```

---

## 🧪 Testing

### Smart Contract Tests

```powershell
cd contracts
npx hardhat test

# Output: 52 tests passing
# - GameNFT.sol: 27 tests (minting, royalties, batch operations)
# - Marketplace.sol: 25 tests (listing, buying, canceling, fees)

# With gas reporting
npx hardhat test --gas-report

# Run specific test
npx hardhat test --grep "Should allow claiming"
```

### Integration Tests

```powershell
cd scripts
npm run test-all

# Runs 4 test suites (50+ scenarios):
# 1. Full Mint Flow (20-30s) - Contract → IPFS → Backend → API
# 2. Marketplace Flow (40-50s) - List → Buy → Ownership transfer
# 3. WebSocket Flow (35s) - Real-time event broadcasting
# 4. Analytics Flow (2s) - Platform statistics calculation
```

### E2E Test

```powershell
npx tsx tests/e2e/full-stack.test.ts

# Complete lifecycle test (90-120s):
# ✅ 3 NFT mints with real IPFS images
# ✅ Multiple marketplace listings (0.1, 0.5, 1.0 ETH)
# ✅ Multiple purchase transactions
# ✅ Analytics and volume verification
# ✅ WebSocket event propagation
```

### Stack Verification

```powershell
npx tsx scripts/verify-stack.ts

# Comprehensive health check:
# ✅ PostgreSQL: Connection + table existence
# ✅ Backend API: Health endpoint + NFT count
# ✅ World State: 100 tiles initialized (if applicable)
# ✅ Game Client: HTTP accessibility
# ✅ Creator Dashboard: HTTP accessibility

# Expected output: All services [OK] in green
```

---

## 🐛 Troubleshooting

### Services Won't Start

```powershell
# Check Docker is running
docker --version
docker info

# View all service logs
.\scripts\docker-logs.ps1

# Check specific service
docker logs nft-marketplace-backend
docker logs nft-marketplace-hardhat
docker logs nft-marketplace-postgres

# Check service health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Backend Not Responding

```powershell
# Check backend logs
docker logs nft-marketplace-backend -f

# Check if migrations ran
docker exec nft-marketplace-postgres psql -U postgres -d nft_marketplace -c "\dt"

# Manually run migrations
docker exec -it nft-marketplace-backend npm run migrate

# Restart backend
docker-compose restart backend

# Check backend health
curl http://localhost:4001/health
```

### Frontend Not Loading

```powershell
# Check if backend is healthy
curl http://localhost:4001/health

# Check contract addresses in env
Get-Content marketplace-frontend\.env | Select-String "CONTRACT"
Get-Content creator-dashboard\.env | Select-String "CONTRACT"

# Check frontend logs
docker logs nft-marketplace-frontend
docker logs nft-marketplace-creator

# Restart frontends
docker-compose restart marketplace creator-dashboard

# Clear browser cache (Ctrl+Shift+R)
```

### Contracts Not Deployed

```powershell
# Check Hardhat logs
docker logs nft-marketplace-hardhat

# Check if contracts exist
docker exec nft-marketplace-hardhat ls -la artifacts/contracts/

# Redeploy contracts
npx tsx scripts/docker-deploy-contracts.ts

# Verify deployment
npx tsx scripts/verify-stack.ts
```

### Port Already in Use

```powershell
# Find process using port
netstat -ano | findstr :3002  # Marketplace
netstat -ano | findstr :3003  # Creator Dashboard
netstat -ano | findstr :4001  # Backend
netstat -ano | findstr :5433  # PostgreSQL
netstat -ano | findstr :8546  # Hardhat

# Kill process (replace <PID> with actual number)
taskkill /PID <PID> /F

# Or stop conflicting Docker containers
docker ps
docker stop <container-name>
```

### Database Connection Error

```powershell
# Check PostgreSQL is running
docker ps | Select-String postgres

# Check PostgreSQL logs
docker logs nft-marketplace-postgres

# Verify PostgreSQL is accepting connections
docker exec nft-marketplace-postgres pg_isready -U postgres

# Restart PostgreSQL
docker-compose restart postgres

# If still failing, recreate database
docker-compose down -v
.\scripts\docker-up.ps1
```

### MetaMask Issues

```powershell
# 1. Reset MetaMask account
#    Settings → Advanced → Reset Account

# 2. Verify network settings
#    RPC URL: http://localhost:8546
#    Chain ID: 31338

# 3. Check Hardhat accounts
docker logs nft-marketplace-hardhat | Select-String "Account"

# 4. Import fresh account
#    Use Account #0 private key from Hardhat logs
```

### IPFS Upload Failures

```powershell
# Check Pinata JWT in environment
Get-Content creator-dashboard\.env | Select-String "PINATA_JWT"

# Test Pinata connection (if you have a test script)
# Otherwise, verify JWT is valid at https://pinata.cloud/

# Use fallback: If Pinata fails, the system will use mock URIs
# Check backend logs for IPFS-related errors
docker logs nft-marketplace-backend | Select-String "IPFS"
```

### Clear Everything and Start Fresh

```powershell
# Complete reset (removes all data and images)

# 1. Stop all containers
docker-compose down -v

# 2. Remove all project images
docker-compose down --rmi all

# 3. Clean Docker cache (optional)
docker system prune -a --volumes

# 4. Rebuild from scratch
.\scripts\docker-up.ps1

# Takes ~5-10 minutes but guarantees fresh state
# All contract addresses will be new
# Database will be empty
# All volumes recreated
```

---

## 📊 Performance Metrics

**Expected Response Times:**
- Contract deployment: <10 seconds
- Single NFT mint: 5-10 seconds
- Marketplace listing: 5-10 seconds
- NFT purchase: 5-10 seconds
- Backend event indexing: 15-20 seconds
- API response: <100ms
- WebSocket broadcast: <1 second

**Resource Usage (Docker):**
- PostgreSQL: ~100 MB RAM
- Hardhat Node: ~200 MB RAM
- Backend: ~150 MB RAM
- Marketplace Frontend: ~50 MB RAM
- Creator Dashboard: ~50 MB RAM
- **Total: ~550 MB RAM**

**Recommended System Requirements:**
- RAM: 8GB+ (4GB minimum)
- CPU: 4 cores+ (2 cores minimum)
- Disk: 10GB free space
- Docker Desktop: 4GB RAM allocation

---

## 📚 Documentation

Additional documentation available in `docs/`:

- **[docs/TESTING.md](docs/TESTING.md)** - Complete testing guide with test scenarios
- **[docs/PRODUCTION.md](docs/PRODUCTION.md)** - Production deployment strategies
- **[docs/SECURITY.md](docs/SECURITY.md)** - Security best practices and checklist
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design and architecture

> **Note:** All essential deployment information is contained in this README. The docs/ folder contains supplementary guides for advanced topics.

---

## 🔒 Security

This project implements security best practices:

### Smart Contract Security
- ✅ OpenZeppelin audited contract libraries
- ✅ Reentrancy guards on sensitive functions (buyNFT, withdrawFees)
- ✅ Access control with owner-only modifiers
- ✅ SafeERC20 transfers
- ✅ Input validation (price > 0, valid addresses)
- ✅ Integer overflow protection (Solidity 0.8.30)

### Backend Security
- ✅ Parameterized SQL queries (no injection)
- ✅ CORS configuration
- ✅ Input validation on all endpoints
- ✅ Rate limiting ready (production)
- ✅ Environment variable secrets
- ✅ Type safety with TypeScript strict mode

### Frontend Security
- ✅ XSS protection (React automatic escaping)
- ✅ CSRF protection patterns
- ✅ Secure WebSocket connections
- ✅ Contract ABI verification
- ✅ Transaction confirmation before execution

**See [docs/SECURITY.md](docs/SECURITY.md) for complete security checklist.**

**⚠️ Important:** 
- This is development software with test accounts and local blockchain
- Professional security audit required before production use
- Never commit private keys or production environment variables
- Use hardware wallets for mainnet deployments

---

## 🚀 Production Deployment

### Mainnet/Testnet Deployment

See [docs/PRODUCTION.md](docs/PRODUCTION.md) for complete production deployment guide including:

**Infrastructure:**
- Smart contract deployment to mainnet/testnet (Ethereum, Polygon, etc.)
- Backend deployment to cloud providers (AWS, Azure, GCP, DigitalOcean)
- Frontend deployment to CDN/hosting (Vercel, Netlify, Cloudflare Pages)
- Database setup with managed PostgreSQL (AWS RDS, Azure Database)
- SSL/TLS certificate configuration (Let's Encrypt, Cloudflare)

**Operations:**
- Monitoring and logging setup (Grafana, ELK Stack, Datadog)
- Automated backups and disaster recovery
- Load balancing and auto-scaling
- CI/CD pipeline setup (GitHub Actions, GitLab CI)

**Security:**
- Environment variable management (AWS Secrets Manager, Vault)
- Network security groups and firewalls
- DDoS protection (Cloudflare)
- Regular security audits

**Costs:**
- Infrastructure cost estimates
- Gas fee optimization strategies
- Scaling considerations

**⚠️ Critical:** Get smart contracts professionally audited before mainnet deployment. Recommended auditors:
- OpenZeppelin
- ConsenSys Diligence
- Trail of Bits
- CertiK

---

## 📊 Project Statistics

- **Total Lines of Code:** ~30,000+
- **Smart Contract Tests:** 52 (100% passing)
- **Integration Tests:** 50+ scenarios
- **API Endpoints:** 23 (NFT, Marketplace, Analytics)
- **React Components:** 33 total (21 marketplace + 12 creator)
- **Custom Hooks:** 18 total (9 per frontend)
- **Docker Containers:** 5 services
- **Database Tables:** 5 (with 10 optimized indexes)
- **WebSocket Events:** 6 event types
- **Documentation:** 2,500+ lines across multiple files

---

## 🗺️ Roadmap

### Completed Features ✅
- [x] ERC-721 NFT smart contracts with royalties
- [x] Marketplace with platform fees
- [x] Single and batch minting
- [x] Real-time WebSocket updates
- [x] IPFS integration via Pinata
- [x] Advanced analytics with Recharts
- [x] Docker deployment
- [x] Comprehensive testing (52 contract tests + 50+ integration tests)

### Potential Future Enhancements 🚀

**Trading Features:**
- [ ] Auction system (English/Dutch auctions)
- [ ] Offer/bid functionality below listing price
- [ ] NFT bundling (sell multiple NFTs as package)
- [ ] Escrow for peer-to-peer trades
- [ ] Price history predictions with ML

**Discovery & Social:**
- [ ] Collection pages with collection-level stats
- [ ] Advanced trait filtering with rarity scores
- [ ] User profiles with reputation system
- [ ] Social features (comments, favorites, follows)
- [ ] Activity notifications and email alerts
- [ ] Featured/trending NFT sections

**Technical Improvements:**
- [ ] Multi-chain support (Polygon, Arbitrum, Base, Optimism)
- [ ] ENS support for human-readable addresses
- [ ] Multi-wallet support (WalletConnect, Coinbase Wallet, Rainbow)
- [ ] Mobile apps (React Native)
- [ ] Progressive Web App (PWA)
- [ ] GraphQL API alongside REST
- [ ] Redis caching layer
- [ ] Elasticsearch for advanced search

**Governance & Community:**
- [ ] DAO governance for platform decisions
- [ ] Creator verification system
- [ ] Dispute resolution mechanism
- [ ] Community moderation tools
- [ ] Revenue sharing for platform contributors

**Creator Tools:**
- [ ] Generative art tools
- [ ] Lazy minting (gasless minting)
- [ ] Whitelist/allowlist management
- [ ] Drop scheduling
- [ ] Custom royalty splits
- [ ] Creator analytics dashboard enhancements

---

## 🤝 Contributing

This is a demonstration project showcasing a complete NFT marketplace implementation. 

**If you'd like to use it as a foundation:**

1. **Fork the repository**
   ```bash
   git clone <your-fork-url>
   cd nft-trading-game
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow existing code style and patterns
   - Add tests for new features
   - Update documentation as needed

4. **Test thoroughly**
   ```bash
   # Run contract tests
   cd contracts && npx hardhat test
   
   # Run integration tests
   cd scripts && npm run test-all
   
   # Verify full stack
   npx tsx scripts/verify-stack.ts
   ```

5. **Submit a pull request**
   - Describe your changes clearly
   - Reference any related issues
   - Ensure all tests pass

**Development Guidelines:**
- Write clean, documented code
- Follow TypeScript strict mode
- Add comprehensive tests
- Update README if adding features
- Keep commits atomic and well-described

---

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

**In summary:** You are free to use, modify, and distribute this project for personal or commercial purposes, with attribution.

---

## 🙏 Acknowledgments

Built with these amazing technologies:

**Blockchain & Smart Contracts:**
- [OpenZeppelin](https://openzeppelin.com/) - Secure, audited smart contract libraries
- [Hardhat](https://hardhat.org/) - Ethereum development environment with Rust EDR
- [ethers.js](https://docs.ethers.org/) - Ethereum library for JavaScript/TypeScript

**Backend Technologies:**
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Express](https://expressjs.com/) - Web framework
- [PostgreSQL](https://www.postgresql.org/) - Relational database
- [Socket.IO](https://socket.io/) - Real-time communication

**Frontend Technologies:**
- [React](https://react.dev/) - UI library with latest features
- [Vite](https://vitejs.dev/) - Lightning-fast build tool
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Recharts](https://recharts.org/) - Composable charting library

**Infrastructure & Tools:**
- [Docker](https://www.docker.com/) - Containerization platform
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Pinata](https://pinata.cloud/) - IPFS pinning service

**Special Thanks:**
- OpenZeppelin team for secure contract patterns
- Hardhat team for excellent developer experience
- React team for cutting-edge frontend technology
- The Ethereum community for comprehensive documentation

---

## 📞 Support & Community

### Getting Help

**Documentation:**
1. Review this README thoroughly
2. Check the troubleshooting section above
3. Review specific docs in `docs/` folder
4. Check service logs: `.\scripts\docker-logs.ps1 <service>`

**Common Issues:**
- **Port conflicts** → Close applications using ports 3002, 3003, 4001, 5433, 8546
- **Docker memory** → Allocate at least 4GB RAM to Docker Desktop
- **Node version** → Requires Node.js 22.12+ (`node --version`)
- **Windows paths** → Use PowerShell, not CMD
- **Contract errors** → Ensure Hardhat node is running and contracts deployed
- **MetaMask issues** → Reset account and verify network settings

**Debugging Steps:**
```powershell
# 1. Check all services are running
docker ps

# 2. Verify deployment
npx tsx scripts/verify-stack.ts

# 3. Check specific service logs
.\scripts\docker-logs.ps1 backend -Follow

# 4. Test backend health
curl http://localhost:4001/health

# 5. If all else fails, fresh start
.\scripts\docker-down.ps1
.\scripts\docker-up.ps1
```

---

## ✅ Production Readiness Checklist

Before deploying to production:

**Smart Contracts:**
- [ ] Professional security audit completed
- [ ] Gas optimization verified
- [ ] All tests passing (52/52)
- [ ] Deployed to testnet first
- [ ] Contract verification on Etherscan
- [ ] Multi-sig wallet for contract ownership

**Backend:**
- [ ] Environment variables secured (Secrets Manager)
- [ ] Rate limiting enabled
- [ ] Monitoring and alerts configured
- [ ] Database backups automated
- [ ] Error logging to external service
- [ ] Load testing completed (100+ concurrent users)

**Frontend:**
- [ ] SSL/TLS certificates configured
- [ ] CDN for static assets
- [ ] Error boundary implemented
- [ ] Analytics integrated (Google Analytics, Mixpanel)
- [ ] SEO optimization
- [ ] Browser compatibility testing

**Operations:**
- [ ] CI/CD pipeline configured
- [ ] Incident response plan documented
- [ ] Team trained on operations
- [ ] Documentation updated
- [ ] Legal review (Terms of Service, Privacy Policy)
- [ ] Insurance for smart contract vulnerabilities

**Security:**
- [ ] Penetration testing completed
- [ ] DDoS protection enabled
- [ ] WAF (Web Application Firewall) configured
- [ ] Regular security updates scheduled
- [ ] Bug bounty program considered

See [docs/SECURITY.md](docs/SECURITY.md) and [docs/PRODUCTION.md](docs/PRODUCTION.md) for detailed checklists.

---

## 🚀 Quick Commands Cheat Sheet

```powershell
# === DEPLOYMENT ===
.\scripts\docker-up.ps1              # Start everything
.\scripts\docker-down.ps1            # Stop (keep data)
.\scripts\docker-down.ps1 -v         # Stop (delete data)

# === LOGS ===
.\scripts\docker-logs.ps1            # All services
.\scripts\docker-logs.ps1 backend -Follow  # Follow backend logs

# === HEALTH CHECKS ===
npx tsx scripts/verify-stack.ts     # Full stack verification
curl http://localhost:4001/health   # Backend health
docker ps                            # Running containers

# === DEVELOPMENT ===
cd contracts && npx hardhat test    # Run contract tests
cd scripts && npm run test-all      # Run integration tests
.\scripts\copy-abis.ps1             # Copy ABIs to frontends

# === DATABASE ===
docker exec -it nft-marketplace-postgres psql -U postgres -d nft_marketplace
\dt                                 # List tables
\q                                  # Exit

# === RESTART SERVICES ===
docker-compose restart backend
docker-compose restart marketplace
docker-compose restart creator-dashboard
```

---

**Status:** ✅ Complete - All 6 phases implemented and tested

**Version:** 1.0.0

**Last Updated:** October 2025

**Made with ❤️ for the blockchain gaming community**

---

**Built with:** Hardhat 3 (Rust EDR) • React 19 • Express 5 • PostgreSQL 18 • Vite 7 • Tailwind CSS 4 • Docker 24

💡 **Pro Tip:** Keep Docker Desktop running in the background for the best development experience. The entire stack starts in under 5 minutes!