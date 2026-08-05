# Zentrail IDE — developer bootstrap for Windows (PowerShell).
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

Push-Location $root
try {
    Write-Host "==> Installing workspace dependencies"
    pnpm install

    Write-Host "==> Starting Go core"
    Start-Process -NoNewWindow pnpm -ArgumentList "go:run"

    Write-Host "==> Starting Python runtime"
    Start-Process -NoNewWindow pnpm -ArgumentList "py:run"

    Write-Host "==> Starting desktop shell (Tauri dev)"
    pnpm dev
} finally {
    Pop-Location
}
