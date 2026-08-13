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
Set-Location (Split-Path -Parent $PSScriptRoot)  # root project

Write-Host "== EPS deploy (Windows) =="

Write-Host "[1/5] git pull"
git pull origin main

Write-Host "[2/5] npm ci"
npm ci

Write-Host "[3/5] prisma generate"
npx prisma generate

Write-Host "[4/5] build"
npm run build

Write-Host "[5/5] restart PM2"
# start utk pertama kali; reload utk update
pm2 start ecosystem.config.cjs --env production 2>$null
if ($LASTEXITCODE -ne 0) {
  pm2 reload ecosystem.config.cjs --update-env
}
pm2 save

Write-Host "== Selesai. Cek: pm2 status / pm2 logs eps-v2 =="
