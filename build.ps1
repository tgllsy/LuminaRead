param (
    [ValidateSet("all", "frontend", "backend", "test")]
    [string]$Target = "all"
)

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot

function Build-Frontend {
    Write-Host "[Frontend] Building React/Vite application..." -ForegroundColor Cyan
    Push-Location "$RootDir\frontend"
    try {
        npm run build
    } finally {
        Pop-Location
    }
}

function Build-Backend {
    Write-Host "[Backend] Building Rust release binary with Cargo..." -ForegroundColor Cyan
    wsl -e bash -c "source ~/.cargo/env && cd /mnt/d/AiCode/read/backend && cargo build --release && cp target/release/luminaread ../luminaread"
}

function Test-Backend {
    Write-Host "[Backend] Running Cargo tests..." -ForegroundColor Cyan
    wsl -e bash -c "source ~/.cargo/env && cd /mnt/d/AiCode/read/backend && cargo test"
}

switch ($Target) {
    "frontend" { Build-Frontend }
    "backend"  { Build-Backend }
    "test"     { Test-Backend }
    "all" {
        Build-Frontend
        Build-Backend
        Write-Host "[Success] All builds finished successfully!" -ForegroundColor Green
    }
}
