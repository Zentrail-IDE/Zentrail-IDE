# Zentrail IDE — build every layer for a release (Windows / PowerShell).
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $root
try {
    Write-Host "==> Lint / typecheck / test"
    pnpm lint
    pnpm typecheck
    pnpm test

    Write-Host "==> Build TypeScript packages"
    pnpm build

    Write-Host "==> Build Go core"
    pnpm go:build

    Write-Host "==> Build desktop (Tauri)"
    pnpm tauri build
} finally {
    Pop-Location
}
