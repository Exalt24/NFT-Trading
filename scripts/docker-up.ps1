Write-Host "============================================" -ForegroundColor Cyan
Write-Host " NFT Trading Platform - Docker Stack Startup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

Write-Host "[Step 1] Checking prerequisites..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    docker-compose --version | Out-Null
    Write-Host "[OK] Docker and Docker Compose are installed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker or Docker Compose not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[Step 2] Cleaning up old containers..." -ForegroundColor Yellow
docker-compose down -v 2>$null
Write-Host "[OK] Cleanup complete" -ForegroundColor Green

Write-Host ""
Write-Host "[Step 3] Building Docker images..." -ForegroundColor Yellow
docker-compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] All images built successfully" -ForegroundColor Green

Write-Host ""
Write-Host "[Step 4] Starting core services (PostgreSQL and Hardhat)..." -ForegroundColor Yellow
docker-compose up -d postgres hardhat
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start core services" -ForegroundColor Red
    exit 1
}

Write-Host "[WAIT] Waiting for services to be healthy (30 seconds)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

$postgresHealthy = docker inspect --format='{{.State.Health.Status}}' nft-marketplace-postgres
$hardhatHealthy = docker inspect --format='{{.State.Health.Status}}' nft-marketplace-hardhat

if ($postgresHealthy -ne "healthy") {
    Write-Host "[ERROR] PostgreSQL failed to start properly" -ForegroundColor Red
    docker logs nft-marketplace-postgres
    exit 1
}

if ($hardhatHealthy -ne "healthy") {
    Write-Host "[ERROR] Hardhat node failed to start properly" -ForegroundColor Red
    docker logs nft-marketplace-hardhat
    exit 1
}

Write-Host "[OK] Core services are healthy" -ForegroundColor Green

Write-Host ""
Write-Host "[Step 5] Deploying smart contracts..." -ForegroundColor Yellow
npx tsx scripts/docker-deploy-contracts.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Contract deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Contracts deployed successfully" -ForegroundColor Green

Write-Host ""
Write-Host "[Step 6] Starting remaining services (Backend, Frontends)..." -ForegroundColor Yellow
docker-compose up -d backend marketplace creator-dashboard
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start remaining services" -ForegroundColor Red
    exit 1
}

Write-Host "[WAIT] Waiting for backend to initialize (10 seconds)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "[Step 7] Running database migrations..." -ForegroundColor Yellow
docker exec nft-marketplace-backend npm run migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Migrations may have already run or failed" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Database migrations completed" -ForegroundColor Green
}

Write-Host "[WAIT] Waiting for services to initialize (10 seconds)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  Marketplace:        http://localhost:3002" -ForegroundColor White
Write-Host "  Creator Dashboard:  http://localhost:3003" -ForegroundColor White
Write-Host "  Backend API:        http://localhost:4001/api" -ForegroundColor White
Write-Host "  Health Check:       http://localhost:4001/health" -ForegroundColor White
Write-Host "  Hardhat RPC:        http://localhost:8546" -ForegroundColor White
Write-Host "  PostgreSQL:         localhost:5433" -ForegroundColor White
Write-Host ""
Write-Host "View Logs:" -ForegroundColor Cyan
Write-Host "  All services:       .\scripts\docker-logs.ps1" -ForegroundColor White
Write-Host "  Specific service:   docker logs -f nft-marketplace-backend" -ForegroundColor White
Write-Host ""
Write-Host "Stop Services:" -ForegroundColor Cyan
Write-Host "  .\scripts\docker-down.ps1" -ForegroundColor White
Write-Host ""
Write-Host "NOTE: Press Ctrl+C to exit (containers will keep running)" -ForegroundColor Yellow