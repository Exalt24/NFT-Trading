# Production Deployment Guide

**⚠️ WARNING: Current Docker setup is for DEVELOPMENT ONLY**

This guide covers production deployment considerations, security hardening, and scaling strategies.

## Production vs Development Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| Network | Local Hardhat | Ethereum Mainnet/L2 |
| Database | Docker PostgreSQL | Managed PostgreSQL (AWS RDS/Azure) |
| Storage | Local volumes | Cloud storage + backups |
| HTTPS | None | Required (SSL/TLS certificates) |
| Environment Variables | .env files | Secrets management |
| Logging | Console logs | Centralized logging |
| Monitoring | None | APM + Metrics + Alerts |
| Scalability | Single instance | Load balanced |
| CI/CD | Manual | Automated pipelines |

## Prerequisites

### Infrastructure

- [ ] **Domain Name** - Registered and configured DNS
- [ ] **SSL Certificates** - Let's Encrypt or commercial CA
- [ ] **Cloud Provider Account** - AWS, Azure, GCP, or DigitalOcean
- [ ] **Ethereum Node** - Infura, Alchemy, or self-hosted
- [ ] **PostgreSQL Database** - Managed service (RDS, Azure Database, etc.)
- [ ] **IPFS Gateway** - Pinata Pro or self-hosted IPFS node
- [ ] **Monitoring Service** - Datadog, New Relic, or Prometheus
- [ ] **Email Service** - SendGrid, AWS SES for notifications

### Accounts & Credentials

- [ ] Ethereum wallet with deployment funds
- [ ] Database credentials
- [ ] IPFS service API keys
- [ ] Cloud storage credentials
- [ ] CDN configuration
- [ ] Domain registrar access

## Architecture for Production

```
                                    [Users]
                                       |
                                   [CDN/CloudFlare]
                                       |
                            [HTTPS Load Balancer]
                                       |
                    +------------------+------------------+
                    |                                     |
            [Web Apps]                            [API Server]
         (React Static)                         (Node.js Backend)
                                                          |
                    +------------------+------------------+
                    |                  |                  |
            [PostgreSQL]        [Ethereum Node]      [IPFS Gateway]
            (Managed DB)         (Infura/Alchemy)        (Pinata)
```

## Deployment Steps

### 1. Smart Contract Deployment

**To Ethereum Testnet (Sepolia)**

```powershell
# Update hardhat.config.ts with Sepolia network
networks: {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.PRIVATE_KEY]
  }
}

# Deploy contracts
cd contracts
npx hardhat ignition deploy ignition/modules/DeployAll.ts --network sepolia

# Verify contracts on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

**To Ethereum Mainnet**

```powershell
# Similar to testnet, but use mainnet network
npx hardhat ignition deploy ignition/modules/DeployAll.ts --network mainnet

# Always verify contracts after deployment
```

**Layer 2 Options (Lower Gas Costs)**

- **Polygon** - EVM-compatible, low fees
- **Arbitrum** - Optimistic rollup
- **Optimism** - Optimistic rollup
- **Base** - Coinbase L2

### 2. Database Setup

**Managed PostgreSQL (Recommended)**

```sql
-- Create production database
CREATE DATABASE nft_marketplace_prod;

-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;

-- Enable connection pooling (PgBouncer)
-- Configure max_connections appropriate for load
```

**Run Migrations**

```powershell
# Set production database URL
$env:DB_HOST = "your-db-instance.region.rds.amazonaws.com"
$env:DB_NAME = "nft_marketplace_prod"
$env:DB_USER = "admin"
$env:DB_PASSWORD = "secure_password"

cd backend
npm run migrate
```

**Backup Strategy**

- Automated daily backups
- Point-in-time recovery enabled
- Backup retention: 30 days minimum
- Test restoration procedures monthly

### 3. Backend Deployment

**Docker Production Build**

```dockerfile
# backend/Dockerfile.prod
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

**Environment Variables (Production)**

```bash
NODE_ENV=production
PORT=4000

# Database (use managed service)
DB_HOST=production-db.region.provider.com
DB_PORT=5432
DB_NAME=nft_marketplace_prod
DB_USER=app_user
DB_PASSWORD=<from-secrets-manager>
DB_SSL=true

# Blockchain (use Infura/Alchemy)
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
NFT_CONTRACT_ADDRESS=0x...
MARKETPLACE_CONTRACT_ADDRESS=0x...
CHAIN_ID=1

# IPFS (Pinata Pro)
PINATA_JWT=<from-secrets-manager>
PINATA_GATEWAY=dedicated-gateway.mypinata.cloud

# Security
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15min

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=info
```

**Deploy to Cloud**

**AWS (EC2 + ECS)**
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -f Dockerfile.prod -t nft-backend:prod .
docker tag nft-backend:prod <account-id>.dkr.ecr.us-east-1.amazonaws.com/nft-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/nft-backend:latest

# Deploy to ECS
aws ecs update-service --cluster nft-cluster --service backend --force-new-deployment
```

**Azure (App Service)**
```bash
az acr build --registry <registry-name> --image nft-backend:prod .
az webapp config container set --name nft-backend --resource-group nft-rg --docker-custom-image-name <registry-name>.azurecr.io/nft-backend:prod
```

**Google Cloud (Cloud Run)**
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/nft-backend
gcloud run deploy nft-backend --image gcr.io/PROJECT_ID/nft-backend --platform managed
```

### 4. Frontend Deployment

**Build for Production**

```powershell
# Marketplace
cd marketplace-frontend
npm run build
# Output: dist/ folder

# Creator Dashboard  
cd creator-dashboard
npm run build
# Output: dist/ folder
```

**Deploy to CDN/Static Hosting**

**Vercel (Recommended)**
```bash
npm install -g vercel
vercel --prod
```

**Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**AWS S3 + CloudFront**
```bash
# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
```

**Azure Static Web Apps**
```bash
az staticwebapp create --name nft-marketplace --resource-group nft-rg --source dist/
```

**Environment Variables (Frontend)**

```env
# Marketplace Frontend
VITE_API_URL=https://api.your-domain.com/api
VITE_NFT_CONTRACT_ADDRESS=0x...
VITE_MARKETPLACE_CONTRACT_ADDRESS=0x...
VITE_CHAIN_ID=1
VITE_NETWORK_NAME=Ethereum Mainnet

# Creator Dashboard
VITE_API_URL=https://api.your-domain.com/api
VITE_NFT_CONTRACT_ADDRESS=0x...
VITE_MARKETPLACE_CONTRACT_ADDRESS=0x...
VITE_PINATA_JWT=<frontend-only-jwt>
VITE_PINATA_GATEWAY=dedicated-gateway.mypinata.cloud
```

### 5. Reverse Proxy (Nginx)

**nginx.conf**

```nginx
upstream backend {
    server backend-1:4000;
    server backend-2:4000;
    server backend-3:4000;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 6. Monitoring & Logging

**Application Monitoring**

```typescript
// backend/src/monitoring.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

export const captureException = (error: Error) => {
  Sentry.captureException(error);
};
```

**Structured Logging**

```typescript
// Use winston for structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

**Metrics to Track**

- Request rate (requests/second)
- Response times (p50, p95, p99)
- Error rates (4xx, 5xx)
- Database query performance
- WebSocket connections count
- NFT mint/sale volumes
- Gas prices and transaction costs
- IPFS upload success rates

**Alerting Rules**

- Error rate > 5% for 5 minutes
- Response time p95 > 2 seconds
- Database connections > 80% pool size
- WebSocket connection failures
- Blockchain sync lag > 100 blocks
- IPFS upload failures > 10%

### 7. Security Hardening

See `docs/SECURITY.md` for complete security checklist.

**Key Security Measures:**

- [ ] HTTPS everywhere (force SSL)
- [ ] Rate limiting on all endpoints
- [ ] Input validation and sanitization
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (CSP headers)
- [ ] CORS properly configured
- [ ] Secrets in environment variables (never in code)
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning
- [ ] Smart contract audits by professionals

### 8. Scaling Strategies

**Horizontal Scaling**

- Multiple backend instances behind load balancer
- Database read replicas for analytics
- CDN for static assets
- Redis for session management

**Caching Strategy**

```typescript
// Add Redis caching layer
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCachedNFT(tokenId: number) {
  const cached = await redis.get(`nft:${tokenId}`);
  if (cached) return JSON.parse(cached);
  
  const nft = await getNFTFromDatabase(tokenId);
  await redis.setex(`nft:${tokenId}`, 300, JSON.stringify(nft));
  return nft;
}
```

**Database Optimization**

- Connection pooling (25-50 connections)
- Read replicas for heavy queries
- Indexes on frequently queried columns
- Query result caching
- Archive old data

**CDN Configuration**

- Cache static assets (images, JS, CSS)
- Edge locations near users
- Automatic compression
- Cache invalidation on deploy

## Cost Estimates

**Monthly Costs (1000 daily active users)**

| Service | Provider | Cost |
|---------|----------|------|
| Smart Contracts | Ethereum Mainnet | $50-500 (gas) |
| Backend Server | AWS EC2 t3.medium | $30 |
| Database | AWS RDS db.t3.small | $50 |
| Static Hosting | Vercel Pro | $20 |
| CDN | CloudFlare | $20 |
| IPFS Storage | Pinata (100GB) | $20 |
| Monitoring | Datadog | $15 |
| Domain + SSL | Namecheap + Let's Encrypt | $15 |
| **Total** | | **$220-670/month** |

**Scaling Costs (10,000 daily active users)**

Add:
- Load balancer: $20/month
- Additional backend instances (3x): $90/month
- Larger database (db.t3.medium): $100/month
- More IPFS storage: $50/month
- **Total: $480-930/month**

## Maintenance Schedule

### Daily
- [ ] Monitor error logs
- [ ] Check system health
- [ ] Review transaction volumes
- [ ] Verify backups completed

### Weekly
- [ ] Review performance metrics
- [ ] Check database size and optimization
- [ ] Update dependencies (patch versions)
- [ ] Review security alerts

### Monthly
- [ ] Update dependencies (minor versions)
- [ ] Test backup restoration
- [ ] Review and optimize costs
- [ ] Security vulnerability scan
- [ ] Performance optimization review

### Quarterly
- [ ] Update dependencies (major versions)
- [ ] Security audit
- [ ] Disaster recovery drill
- [ ] Capacity planning review

## Disaster Recovery

**Backup Strategy**

- Database: Automated daily backups, 30-day retention
- Smart contracts: Source code in git, verified on Etherscan
- IPFS: Metadata backed up to cloud storage
- Configuration: Infrastructure as code (Terraform/CloudFormation)

**Recovery Procedures**

1. **Database Failure**: Restore from latest backup, expect <15 min downtime
2. **Backend Crash**: Auto-restart via orchestrator, <1 min downtime
3. **Frontend Down**: Deploy from git, update CDN, <5 min downtime
4. **Blockchain Sync Issue**: Restart indexer from last synced block
5. **Complete Infrastructure Loss**: Rebuild from IaC, restore database

**RTO/RPO Targets**

- Recovery Time Objective (RTO): <1 hour
- Recovery Point Objective (RPO): <15 minutes

## Rollback Procedures

**Smart Contracts**
- Cannot rollback (immutable)
- Deploy new version if needed
- Maintain contract upgrade proxy pattern

**Backend**
```bash
# Rollback to previous Docker image
docker pull <registry>/nft-backend:previous
docker service update --image <registry>/nft-backend:previous backend
```

**Frontend**
```bash
# Revert to previous deployment
vercel rollback
# or
aws s3 sync s3://backup-bucket/previous/ s3://live-bucket/ --delete
```

## Post-Deployment Checklist

- [ ] All services responding to health checks
- [ ] Smart contracts verified on block explorer
- [ ] Database migrations applied successfully
- [ ] Frontend assets loading from CDN
- [ ] SSL certificates valid and auto-renewing
- [ ] Monitoring dashboards showing data
- [ ] Alerts configured and tested
- [ ] Backup procedures verified
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Documentation updated
- [ ] Team trained on operations
- [ ] Rollback procedure tested
- [ ] Customer support prepared
- [ ] Announcement communications sent

## Getting Help

**Support Resources**

- Technical Issues: Review logs and metrics
- Smart Contract Issues: Consult with auditors
- Infrastructure Issues: Cloud provider support
- Security Incidents: Follow incident response plan

**Escalation Path**

1. On-call engineer (15 min response)
2. Team lead (30 min response)
3. CTO (1 hour response)
4. External consultants (4 hour response)

## Legal & Compliance

**Considerations**

- Terms of Service
- Privacy Policy (GDPR compliance if EU users)
- Smart contract disclaimers
- Intellectual property rights
- Tax reporting (depending on jurisdiction)
- KYC/AML requirements (if required)
- Securities laws (consult lawyer)

**Recommended Actions**

- [ ] Consult with blockchain attorney
- [ ] Implement privacy policy
- [ ] Add terms of service
- [ ] Set up customer support channels
- [ ] Implement transaction reporting
- [ ] Consider insurance (smart contract insurance)