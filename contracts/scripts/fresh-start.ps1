# Fresh Start Script - Clean everything and prepare for deployment

Write-Host ""
Write-Host "Starting fresh cleanup..." -ForegroundColor Cyan
Write-Host ""

# Clean Hardhat artifacts
Write-Host "Cleaning Hardhat artifacts..." -ForegroundColor Yellow
npx hardhat clean

# Remove Ignition deployment state
Write-Host "Removing Ignition deployment state..." -ForegroundColor Yellow
if (Test-Path "ignition\deployments") {
    Remove-Item -Recurse -Force "ignition\deployments"
    Write-Host "  Removed ignition\deployments" -ForegroundColor Gray
}

# Remove deployment info
Write-Host "Removing deployment info..." -ForegroundColor Yellow
if (Test-Path "deployments.json") {
    Remove-Item -Force "deployments.json"
    Write-Host "  Removed deployments.json" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Terminal 1: npx hardhat node" -ForegroundColor White
Write-Host "  2. Terminal 2: npm run deploy" -ForegroundColor White
Write-Host ""