# Security Guide

Comprehensive security checklist and best practices for the NFT Trading Platform.

## Security Checklist

### Smart Contract Security

- [x] **OpenZeppelin Contracts** - Using audited v5.4.0 libraries
- [x] **Reentrancy Guards** - Applied on `buyNFT()` and `withdrawFees()`
- [x] **Access Control** - `onlyOwner` modifiers on sensitive functions
- [x] **Input Validation** - Price > 0, valid addresses, max limits
- [x] **SafeMath** - Built into Solidity 0.8.30
- [ ] **Professional Audit** - Required before mainnet deployment
- [ ] **Bug Bounty Program** - Consider after audit
- [ ] **Emergency Pause** - Add pausable pattern for emergencies
- [ ] **Upgrade Proxy** - Consider transparent proxy pattern

**Recommendations:**
1. Get contracts audited by reputable firm (OpenZeppelin, ConsenSys Diligence, Trail of Bits)
2. Implement emergency pause mechanism
3. Add time-lock for owner functions
4. Consider multi-sig wallet for contract ownership

### Backend Security

**Current Implementation:**
- [x] **CORS Configuration** - Environment-based CORS_ORIGIN
- [x] **Input Validation** - Address regex, token ID parsing, limit ranges
- [x] **Error Handling** - Proper try-catch blocks, no stack traces in production
- [x] **Database Security** - Parameterized queries (no SQL injection)
- [ ] **Rate Limiting** - Not implemented yet
- [ ] **Authentication** - No user authentication (consider for admin endpoints)
- [ ] **API Keys** - No API key requirement

**Required for Production:**

```typescript
// Add rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
});

app.use('/api/', limiter);
```

```typescript
// Add helmet for security headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

```typescript
// Sanitize inputs
import sanitize from 'mongo-sanitize';

app.post('/api/search', (req, res) => {
  const query = sanitize(req.body.query);
  // Process sanitized query
});
```

### Frontend Security

**Current Status:**
- [x] **Environment Variables** - VITE_ prefix for public vars
- [x] **No Secrets in Frontend** - API keys server-side only
- [ ] **Content Security Policy** - Not configured
- [ ] **Subresource Integrity** - Not enabled for CDN resources
- [ ] **XSS Protection** - Relies on React's default escaping

**Recommendations:**

```typescript
// Add CSP headers (if using custom server)
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://cdn.example.com; 
               style-src 'self' 'unsafe-inline';">
```

```typescript
// Sanitize user inputs before display
import DOMPurify from 'dompurify';

const cleanDescription = DOMPurify.sanitize(nft.description);
```

### Database Security

**Current Implementation:**
- [x] **Parameterized Queries** - Using pg with bound parameters
- [x] **Connection Pooling** - Limited connections (20 max)
- [ ] **SSL/TLS** - Not enforced (development only)
- [ ] **Least Privilege** - Single user with all permissions
- [ ] **Encryption at Rest** - Depends on hosting

**Production Requirements:**

```typescript
// Enable SSL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
  },
});
```

```sql
-- Create read-only user for analytics
CREATE USER analytics_readonly WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_readonly;

-- Create application user with limited permissions
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
```

### IPFS/Storage Security

**Current Status:**
- [x] **Pinata JWT** - Stored in environment variables
- [x] **Public Gateway** - Uses public IPFS gateways
- [ ] **Content Validation** - No hash verification
- [ ] **Dedicated Gateway** - Not using dedicated gateway

**Recommendations:**

1. **Use Dedicated Gateway** (Pinata Pro)
   - Faster access
   - No rate limits
   - Custom domain

2. **Verify Content Hashes**
```typescript
import { create as ipfsHttpClient } from 'ipfs-http-client';
import { CID } from 'multiformats/cid';

async function verifyCID(cid: string, expectedContent: Buffer): Promise<boolean> {
  const actualCID = await calculateCID(expectedContent);
  return cid === actualCID.toString();
}
```

3. **Restrict Upload Access**
   - Separate JWT for frontend (upload only)
   - Backend JWT with full permissions
   - Implement upload quotas

### Wallet Security

**User Education (Add to UI):**

```typescript
// Display security warning on wallet connection
const SecurityWarning = () => (
  <div className="security-warning">
    <h3>Security Tips</h3>
    <ul>
      <li>Never share your private keys or seed phrase</li>
      <li>Verify contract addresses before transactions</li>
      <li>Always check transaction details in MetaMask</li>
      <li>Be cautious of phishing attempts</li>
      <li>Use hardware wallets for large amounts</li>
    </ul>
  </div>
);
```

**Transaction Safety:**
- [x] **Transaction Preview** - Show amounts before confirmation
- [x] **Address Validation** - Regex pattern matching
- [ ] **Transaction Simulation** - Consider Tenderly integration
- [ ] **Gas Estimation** - Show estimated gas costs

### Dependency Security

**Current Practice:**
- [x] **Locked Versions** - package.json with exact versions
- [ ] **Automated Scanning** - No Dependabot/Snyk configured
- [ ] **Regular Updates** - Manual process

**Recommended Tools:**

```powershell
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

**GitHub Actions (Automated Security):**

```yaml
name: Security Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm audit --audit-level=high
```

### Environment Variables

**Current Status:**
- [x] **.env Files** - Used for configuration
- [x] **.gitignore** - Prevents .env commit
- [ ] **Secrets Management** - No vault/secrets manager

**Production Requirements:**

**AWS Secrets Manager:**
```typescript
import { SecretsManager } from 'aws-sdk';

const client = new SecretsManager({ region: 'us-east-1' });

async function getSecret(secretName: string): Promise<string> {
  const data = await client.getSecretValue({ SecretId: secretName }).promise();
  return data.SecretString || '';
}

const dbPassword = await getSecret('nft-platform/db-password');
```

**Azure Key Vault:**
```typescript
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const client = new SecretClient(process.env.KEY_VAULT_URL, credential);

const secret = await client.getSecret('db-password');
const dbPassword = secret.value;
```

### WebSocket Security

**Current Status:**
- [x] **Public Access** - No authentication
- [ ] **Connection Limits** - No limit enforcement
- [ ] **Rate Limiting** - No rate limiting per connection
- [ ] **Origin Validation** - Accepts all origins

**Recommendations:**

```typescript
import { Server } from 'socket.io';

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e6, // 1MB max message size
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Connection throttling
const connectionCounts = new Map<string, number>();

io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  const count = connectionCounts.get(ip) || 0;
  
  if (count > 10) {
    socket.disconnect();
    return;
  }
  
  connectionCounts.set(ip, count + 1);
  
  socket.on('disconnect', () => {
    connectionCounts.set(ip, count);
  });
});
```

## Common Vulnerabilities

### 1. SQL Injection

**Vulnerable Code (DON'T DO THIS):**
```typescript
// ❌ BAD: String concatenation
const query = `SELECT * FROM nfts WHERE token_id = ${tokenId}`;
```

**Secure Code:**
```typescript
// ✅ GOOD: Parameterized query
const query = 'SELECT * FROM nfts WHERE token_id = $1';
const result = await pool.query(query, [tokenId]);
```

### 2. Cross-Site Scripting (XSS)

**Vulnerable Code:**
```typescript
// ❌ BAD: Rendering unsanitized HTML
<div dangerouslySetInnerHTML={{ __html: nft.description }} />
```

**Secure Code:**
```typescript
// ✅ GOOD: React escapes by default
<div>{nft.description}</div>

// Or sanitize explicitly
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(nft.description) }} />
```

### 3. Reentrancy Attacks

**Vulnerable Code:**
```solidity
// ❌ BAD: State update after external call
function withdraw() external {
    uint256 amount = balances[msg.sender];
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    balances[msg.sender] = 0; // State update AFTER external call
}
```

**Secure Code:**
```solidity
// ✅ GOOD: State update before external call
function withdraw() external nonReentrant {
    uint256 amount = balances[msg.sender];
    balances[msg.sender] = 0; // State update BEFORE external call
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

### 4. Integer Overflow/Underflow

**Fixed in Solidity 0.8+:**
```solidity
// ✅ GOOD: Solidity 0.8.30 has built-in overflow checks
uint256 price = listing.price * quantity; // Reverts on overflow
```

### 5. Front-Running

**Mitigation:**
- Use commit-reveal schemes for sensitive operations
- Consider Flashbots for MEV protection
- Implement slippage protection

## Incident Response Plan

### Detection

**Monitoring Alerts:**
- Unusual transaction patterns
- High error rates (>5%)
- Failed authentication attempts
- Database connection issues
- Smart contract events anomalies

### Response Steps

1. **Identify**
   - Confirm security incident
   - Determine scope and impact
   - Identify affected systems

2. **Contain**
   - Pause affected services
   - Isolate compromised systems
   - Block malicious IPs
   - Disable compromised accounts

3. **Eradicate**
   - Remove malicious code
   - Patch vulnerabilities
   - Update credentials
   - Deploy fixes

4. **Recover**
   - Restore from backups
   - Verify system integrity
   - Resume operations gradually
   - Monitor closely

5. **Learn**
   - Document incident
   - Update procedures
   - Improve defenses
   - Communicate with stakeholders

### Emergency Contacts

```
Security Lead: [Name] - [Phone] - [Email]
DevOps Lead: [Name] - [Phone] - [Email]
CTO: [Name] - [Phone] - [Email]
Legal: [Name] - [Phone] - [Email]
PR: [Name] - [Phone] - [Email]
```

## Security Testing

### Penetration Testing

**Areas to Test:**
- Authentication and authorization
- Input validation
- API endpoint security
- Smart contract logic
- WebSocket connections
- Database access

**Tools:**
- **OWASP ZAP** - Web application security scanner
- **Burp Suite** - HTTP intercepting proxy
- **Slither** - Solidity static analyzer
- **Mythril** - Smart contract security analyzer

### Smart Contract Auditing

**Audit Checklist:**
- [ ] Reentrancy vulnerabilities
- [ ] Integer overflow/underflow
- [ ] Access control issues
- [ ] Logic errors
- [ ] Gas optimization
- [ ] Front-running risks
- [ ] Timestamp dependencies
- [ ] Randomness issues
- [ ] Denial of service vectors

**Recommended Auditors:**
- OpenZeppelin (https://openzeppelin.com/security-audits/)
- Trail of Bits (https://www.trailofbits.com/)
- ConsenSys Diligence (https://consensys.net/diligence/)
- Quantstamp (https://quantstamp.com/)

### Bug Bounty Program

**After Audit, Consider:**

```markdown
# Bug Bounty Program

## Rewards

- **Critical**: $5,000 - $20,000
- **High**: $1,000 - $5,000
- **Medium**: $500 - $1,000
- **Low**: $100 - $500

## Scope

- Smart contracts
- Backend API
- WebSocket server
- Frontend XSS

## Out of Scope

- DDoS attacks
- Social engineering
- Physical attacks

## Reporting

security@your-domain.com
```

## Compliance

### GDPR (If EU Users)

- [ ] Data collection transparency
- [ ] User consent mechanisms
- [ ] Right to deletion
- [ ] Data portability
- [ ] Privacy policy
- [ ] Data processor agreements

### SOC 2 (For Enterprise)

- [ ] Access controls
- [ ] Logging and monitoring
- [ ] Incident response
- [ ] Business continuity
- [ ] Risk assessment

## Security Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Smart Contract Best Practices**: https://consensys.github.io/smart-contract-best-practices/
- **Node.js Security Best Practices**: https://nodejs.org/en/docs/guides/security/
- **PostgreSQL Security**: https://www.postgresql.org/docs/current/security.html

## Reporting Security Issues

**Please report security vulnerabilities to:**

Email: security@your-domain.com  
PGP Key: [Public key link]

**Do NOT:**
- Open public GitHub issues for security vulnerabilities
- Disclose vulnerability before we've had time to fix
- Exploit vulnerabilities beyond proof-of-concept

**We will:**
- Acknowledge receipt within 24 hours
- Provide status updates every 48 hours
- Credit you in our security hall of fame (if desired)
- Consider bug bounty rewards after audit