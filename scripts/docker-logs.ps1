param(
    [string]$Service = "all",
    [switch]$Follow
)

$services = @{
    "postgres" = "nft-postgres"
    "hardhat" = "nft-hardhat"
    "backend" = "nft-backend"
    "marketplace" = "nft-marketplace"
    "creator" = "nft-creator"
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " NFT Trading Platform - Docker Logs" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($Service -eq "all") {
    Write-Host "[INFO] Showing logs from all services..." -ForegroundColor Yellow
    Write-Host "[INFO] Press Ctrl+C to exit" -ForegroundColor Cyan
    Write-Host ""
    
    if ($Follow) {
        docker-compose logs -f
    } else {
        docker-compose logs --tail=50
    }
} else {
    if ($services.ContainsKey($Service)) {
        $containerName = $services[$Service]
        Write-Host "[INFO] Showing logs from: $Service ($containerName)" -ForegroundColor Yellow
        
        if ($Follow) {
            Write-Host "[INFO] Press Ctrl+C to exit" -ForegroundColor Cyan
            Write-Host ""
            docker logs -f $containerName
        } else {
            docker logs --tail=50 $containerName
        }
    } else {
        Write-Host "[ERROR] Unknown service: $Service" -ForegroundColor Red
        Write-Host ""
        Write-Host "Available services:" -ForegroundColor Yellow
        Write-Host "  - postgres" -ForegroundColor White
        Write-Host "  - hardhat" -ForegroundColor White
        Write-Host "  - backend" -ForegroundColor White
        Write-Host "  - marketplace" -ForegroundColor White
        Write-Host "  - creator" -ForegroundColor White
        Write-Host "  - all (default)" -ForegroundColor White
        Write-Host ""
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host "  .\scripts\docker-logs.ps1                    - Show recent logs from all services" -ForegroundColor White
        Write-Host "  .\scripts\docker-logs.ps1 -Follow            - Follow all logs" -ForegroundColor White
        Write-Host "  .\scripts\docker-logs.ps1 backend            - Show backend logs" -ForegroundColor White
        Write-Host "  .\scripts\docker-logs.ps1 backend -Follow    - Follow backend logs" -ForegroundColor White
        exit 1
    }
}