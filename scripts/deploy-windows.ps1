# Deploy produksi di Windows (server akses RDP — tanpa SSH).
# Jalankan via PowerShell (Admin opsional) di folder project, mis. C:\apps\eps.
#
# Persyaratan sekali jalan:
#   - Git for Windows, Node.js LTS, lalu:  npm i -g pm2
#   - pm2-windows-startup install          # auto-start saat Windows boot
#   - Salin .env (AUTH_SECRET, DATABASE_URL, PORT) ke folder ini
#   - Pertama kali: jalankan script ini (berlaku juga utk update)
#
# Cara update setelah ada push ke GitHub:
#   - buka folder di RDP, jalankan:  powershell -ExecutionPolicy Bypass -File scripts\deploy-windows.ps1

$ErrorActionPreference = "Stop"
if ($env:SERVER_PATH) {
  Set-Location $env:SERVER_PATH   # via CI variabel repo
} else {
  Set-Location (Split-Path -Parent $PSScriptRoot)  # root project
}

Write-Host "== EPS deploy (Windows) =="

Write-Host "[1/5] git pull"
git pull origin main

Write-Host "[2/5] npm ci"
# --include=dev: runner kadang omit devDependencies (mis. NODE_ENV=production),
# padahal @tailwindcss/postcss & typescript wajib untuk build.
npm ci --include=dev

Write-Host "[3/5] prisma generate"
npx prisma generate

Write-Host "[4/5] build"
npm run build

Write-Host "[5/5] restart PM2"
# start utk pertama kali; reload utk update.
# pm2 global diakun RDP tidak terlihat oleh akun service runner —
# auto-install utk akun berjalan bila belum ada di PATH.
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
  Write-Host "pm2 tidak ada di PATH — install global dulu"
  npm i -g pm2
}
# Pipe PM2 Windows (`\\.\pipe\rpc.sock`) satu namespace GLOBAL — nama pipe
# hardcoded, tidak unik per akun (Unitech/pm2#2946). Daemon dari akun lain
# (mis. deploy manual via RDP) atau zombie pipe memblokir nama → `connect
# EPERM`. Bunuh dulu daemon milik akun ini (zombie) agar pipe bebas; proses
# akun lain akan gagal di-Stop (access denied) & dilewati aman.
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'pm2|next start' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
  & pm2 start ecosystem.config.cjs --env production 2>$null
  if ($LASTEXITCODE -ne 0) {
    & pm2 reload ecosystem.config.cjs --update-env
  }
  & pm2 save
} else {
  npx pm2 start ecosystem.config.cjs --env production 2>$null
  if ($LASTEXITCODE -ne 0) {
    npx pm2 reload ecosystem.config.cjs --update-env
  }
  npx pm2 save
}
# EPERM masih muncul? Daemon pm2 akun RDP masih pegang pipe — runner tidak bisa
# membunuhnya (perbedaan akun). Bersihkan sekali di RDP: `pm2 kill` (atau
# `taskkill /F /IM node.exe`), lalu deploy ulang. Detail: DEPLOYMENT.md §1.4.

Write-Host "== Selesai. Cek: pm2 status / pm2 logs eps-v2 =="
