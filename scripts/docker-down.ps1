Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Stopping NFT Trading Platform Docker Stack" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$KeepData = $args -contains "-keep-data"

if ($KeepData) {
    Write-Host "[INFO] Stopping containers (keeping data volumes)..." -ForegroundColor Yellow
    docker-compose down
} else {
    Write-Host "[WARNING] Stopping containers and removing volumes..." -ForegroundColor Yellow
    Write-Host "[WARNING] This will delete all blockchain data and database records!" -ForegroundColor Red
    Write-Host ""
    $confirmation = Read-Host "Are you sure? Type 'yes' to continue"
    
    if ($confirmation -ne "yes") {
        Write-Host "[CANCELLED] Operation cancelled" -ForegroundColor Yellow
        exit 0
    }
    
    docker-compose down -v
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] All services stopped" -ForegroundColor Green
    
    if (-not $KeepData) {
        Write-Host "[OK] Data volumes removed" -ForegroundColor Green
        Write-Host ""
        Write-Host "[INFO] To start fresh, run: .\scripts\docker-up.ps1" -ForegroundColor Cyan
    } else {
        Write-Host "[OK] Data volumes preserved" -ForegroundColor Green
        Write-Host ""
        Write-Host "[INFO] To restart with existing data: docker-compose up -d" -ForegroundColor Cyan
        Write-Host "[INFO] To start fresh: .\scripts\docker-down.ps1 (without -keep-data)" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "[ERROR] Failed to stop services" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  .\scripts\docker-down.ps1           - Stop and remove all data" -ForegroundColor White
Write-Host "  .\scripts\docker-down.ps1 -keep-data - Stop but keep data volumes" -ForegroundColor White