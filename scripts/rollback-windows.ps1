# Rollback deploy produksi Windows (RDP) ke tag checkpoint terakhir.
# Kebalikan deploy-windows.ps1: checkout tag, build ulang, restart PM2.
#
# Cara pakai:
#   powershell -ExecutionPolicy Bypass -File scripts\rollback-windows.ps1
#   # atau ke tag tertentu:
#   powershell -ExecutionPolicy Bypass -File scripts\rollback-windows.ps1 -Tag release-1.4.3
#
# Catatan: .env (AUTH_SECRET, DATABASE_URL, PORT) TIDAK disentuh — hanya kode.
# EPERM pipe PM2? Lihat DEPLOYMENT.md §1.4 (konflik akun PM2 di Windows).

param(
  [string]$Tag = ""
)

$ErrorActionPreference = "Stop"
if ($env:SERVER_PATH) {
  Set-Location $env:SERVER_PATH
} else {
  Set-Location (Split-Path -Parent $PSScriptRoot)
}

Write-Host "== EPS rollback (Windows) =="

# Tag default: release-* terbaru secara version-sort (bukan waktu).
if ($Tag -eq "") {
  $Tag = (git tag --list "release-*" | Sort-Object { [version]($_ -replace '^release-', '') } | Select-Object -Last 1)
  if (-not $Tag) { Write-Host "Tidak ada tag release-* untuk rollback." -ForegroundColor Red; exit 1 }
}
Write-Host "Rollback ke tag: $Tag"

# Checkout tag dengan aman (dalam keadaan bersih); reset hard karena
# perubahan kerja lokal bisa mengganggu checkout.
git fetch origin --tags
git reset --hard $Tag
git checkout $Tag

Write-Host "[1/4] npm ci"
npm ci --include=dev

Write-Host "[2/4] prisma generate"
npx prisma generate

Write-Host "[3/4] build"
npm run build

Write-Host "[4/4] restart PM2"
# Sama dengan deploy: install pm2 bila belum ada di PATH, lalu start/reload.
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
  Write-Host "pm2 tidak ada di PATH — install global dulu"
  npm i -g pm2
}
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'pm2|next start' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
  & pm2 start ecosystem.config.cjs --env production 2>$null
  if ($LASTEXITCODE -ne 0) { & pm2 reload ecosystem.config.cjs --update-env }
  & pm2 save
} else {
  npx pm2 start ecosystem.config.cjs --env production 2>$null
  if ($LASTEXITCODE -ne 0) { npx pm2 reload ecosystem.config.cjs --update-env }
  npx pm2 save
}
# EPERM pipe PM2? Bersihkan daemon akun lain di RDP (`pm2 kill` / `taskkill
# /F /IM node.exe`) — lihat DEPLOYMENT.md §1.4.

Write-Host "== Selesai. Cek: pm2 status / pm2 logs eps-v2 =="
