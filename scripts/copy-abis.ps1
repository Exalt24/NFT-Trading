Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Copying Contract ABIs to Frontends" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Check if running from project root
if (-not (Test-Path "contracts\artifacts")) {
    Write-Host "[ERROR] Must run from project root directory" -ForegroundColor Red
    Write-Host "[INFO] Current directory: $PWD" -ForegroundColor Yellow
    exit 1
}

$abis = @(
    @{
        Name = "GameNFT"
        Source = "contracts\artifacts\contracts\GameNFT.sol\GameNFT.json"
    },
    @{
        Name = "Marketplace"
        Source = "contracts\artifacts\contracts\Marketplace.sol\Marketplace.json"
    }
)

$frontends = @(
    "marketplace-frontend\src\abis",
    "creator-dashboard\src\abis"
)

# Create ABI directories if they don't exist
foreach ($frontend in $frontends) {
    if (-not (Test-Path $frontend)) {
        New-Item -ItemType Directory -Path $frontend -Force | Out-Null
        Write-Host "[INFO] Created directory: $frontend" -ForegroundColor Yellow
    }
}

$copied = 0
$failed = 0

foreach ($abi in $abis) {
    if (-not (Test-Path $abi.Source)) {
        Write-Host "[ERROR] $($abi.Name): Source not found at $($abi.Source)" -ForegroundColor Red
        $failed++
        continue
    }

    foreach ($frontend in $frontends) {
        try {
            $dest = Join-Path $frontend "$($abi.Name).json"
            Copy-Item $abi.Source $dest -Force
            Write-Host "[OK] Copied $($abi.Name).json to $frontend" -ForegroundColor Green
            $copied++
        } catch {
            Write-Host "[ERROR] Failed to copy $($abi.Name) to $frontend : $_" -ForegroundColor Red
            $failed++
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Copied: $copied files" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "Failed: $failed files" -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host "[INFO] All ABIs copied successfully" -ForegroundColor Green
    Write-Host "[INFO] Frontends will use the latest contract interfaces" -ForegroundColor Cyan
}