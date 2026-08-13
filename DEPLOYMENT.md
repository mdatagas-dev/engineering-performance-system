# Panduan Deployment

## EPS — Engineering Production System

- Repo: https://github.com/mdatagas-dev/engineering-performance-system
- Stack: Next.js 16 (App Router) · Prisma 7 · PostgreSQL · PM2
- Server: **Windows (RDP)** — panduan utama di bawah; VPS Linux & Docker juga tersedia.

---

## 1. Deploy di Server Windows (akses RDP, tanpa SSH)

### 1.1 Prasyarat (sekali jalan, via RDP)
```powershell
# Node.js LTS (https://nodejs.org) & Git for Windows (https://git-scm.com)
npm i -g pm2 pm2-windows-startup
pm2-windows-startup install   # auto-start PM2 saat Windows boot
```

### 1.2 Siapkan project & .env
```powershell
git clone https://github.com/mdatagas-dev/engineering-performance-system.git C:\apps\eps
cd C:\apps\eps
# Salin .env dengan nilai nyata:
#   AUTH_SECRET=<openssl rand -base64 32>
#   DATABASE_URL=postgresql://USER:PASS@HOST:5432/DB?sslmode=require
#   PORT=3050
```

### 1.3 Deploy manual (update)
```powershell
cd C:\apps\eps
powershell -ExecutionPolicy Bypass -File scripts\deploy-windows.ps1
# isi: git pull → npm ci → prisma generate → build → pm2 restart/reload
```

### 1.4 CI/CD otomatis (self-hosted runner)

**a. Daftarkan runner di server (sekali):**
```powershell
cd C:\
New-Item -ItemType Directory -Force -Path C:\actions-runner | Out-Null
cd C:\actions-runner
Invoke-WebRequest -Uri "https://github.com/actions/runner/releases/download/v2.336.0/actions-runner-win-x64-2.336.0.zip" -OutFile runner.zip
Expand-Archive -Path runner.zip -DestinationPath . -Force
# Token: Settings → Actions → Runners → New self-hosted runner → Windows x64
# (token berlaku ~1 jam, generate ulang bila kedaluwarsa)
.\config.cmd --url https://github.com/mdatagas-dev/engineering-performance-system --token <TOKEN> --name eps-windows --labels self-hosted,windows
.\svc install
.\svc start
```

**b. Aktifkan workflow Windows (sekali, via web/gh):**
- GitHub → Settings → Secrets and variables → Actions → **Variables** → buat:
  - `ENABLE_WINDOWS_DEPLOY = true`
- (Opsional) repositori variabel `SERVER_PATH` bila folder bukan `C:\apps\eps` — lihat §1.5.

**c. Hasil:** setiap push ke `main` otomatis menjalankan
`.github/workflows/deploy-windows.yml` di server:
`git pull → npm ci --include=dev → prisma generate → build → pm2 reload`. Pantau di tab **Actions** → **Deploy Windows**.

> Script deploy otomatis meng-install `pm2` global untuk akun yang menjalankan
> runner bila belum ada di PATH-nya (pm2 yang di-install via RDP di akun admin
> tidak terlihat oleh akun service runner).

**Penting — akun PM2 (gagal `connect EPERM \\.\pipe\rpc.sock`):**
Pipe IPC PM2 di Windows (`\\.\pipe\rpc.sock`) memakai **satu nama global**,
tidak unik per akun (issue Unitech/pm2#2946). Jika ada daemon PM2 lama dari
akun lain (mis. deploy manual §1.3 via RDP), daemon service runner tidak bisa
dipakai — muncul `connect EPERM \\.\pipe\rpc.sock` di step "restart PM2".

Solusi (pilih satu):
1. **Daftarkan runner dengan akun yang sama** yang memakai PM2 (rekomendasi):
   daftarkan runner via RDP dengan akun admin tsb, lalu `pm2` dipakai dari
   akun yang sama → pipe tidak bertabrakan.
2. **Bersihkan daemon lama sekali** (via RDP, akun lama):
   ```powershell
   pm2 kill   # atau bila macet: taskkill /F /IM node.exe
   ```
   lalu jalankan ulang workflow. Runner akan menciptakan daemonnya sendiri.

> Script deploy-windows.ps1 otomatis membunuh daemon/zombie PM2 milik akun
> yang berjalan sebelum start (aman dilewati bila dipakai akun lain).

### 1.5 Folder project di server
Workflow Windows menjalankan `scripts\deploy-windows.ps1` dari hasil `actions/checkout`
(di folder kerja runner). Supaya PM2 memakai project di `C:\apps\eps` (bukan salinan
runner), sesuaikan salah satu:
- Set variabel repo `SERVER_PATH = C:\apps\eps`, dan di `scripts\deploy-windows.ps1`
  ganti `Set-Location` ke `$env:SERVER_PATH`; ATAU
- Pindahkan `.env` + jalankan `pm2` dari folder checkout runner.

> Catatan: repo `C:\apps\eps` (klon manual) dan folder checkout runner adalah dua
> salinan berbeda — pilih satu sumber. Rekomendasi: gunakan **folder checkout runner**
> sebagai satu-satunya (pindahkan `.env` ke sana), jalankan `pm2 start` dari sana.
>
> PM2 daemon berjalan **per-akun** — daemon diakun RDP dan diakun service runner
> berbeda. Pantau dari akun yang sama dengan yang menjalankan deploy.

### 1.6 Operasional PM2 di Windows
```powershell
pm2 status              # daftar proses
pm2 logs eps-v2         # lihat log (.\logs\ di folder project)
pm2 restart eps-v2      # restart manual
pm2 stop eps-v2         # stop
pm2 save                # simpan daftar proses
```

### 1.7 Rollback ke checkpoint (tag rilis)
Tiap rilis ditandai tag `release-<versi>` (mis. `release-1.4.3`) sebagai
checkpoint rollback. Bila deploy gagal / versi baru bermasalah, kembalikan ke
tag terakhir yang dikenal baik:
```powershell
# ke tag release-* terbaru (default), atau tentukan:
powershell -ExecutionPolicy Bypass -File scripts\rollback-windows.ps1
powershell -ExecutionPolicy Bypass -File scripts\rollback-windows.ps1 -Tag release-1.4.3
```
Script checkout tag, `npm ci`, `prisma generate`, build, lalu restart PM2.
`.env` (secret) tidak disentuh. EPERM pipe PM2 saat restart → bersihkan daemon
akun lain di RDP (`pm2 kill` / `taskkill /F /IM node.exe`), lihat §1.4.

---

## 2. Deploy di VPS Linux (PM2 + GitHub Actions SSH)

```bash
npm i -g pm2 rsync
mkdir -p /opt/eps/app /var/log/eps
# salin .env ke /opt/eps/app/.env
cd /opt/eps/app && git pull && npm ci && npx prisma generate && npm run build
pm2 start ecosystem.config.cjs --env production
pm2 save && pm2 startup
```

Auto-deploy: set secrets repo `SSH_HOST`, `SSH_USER`, `SSH_KEY` →
workflow `deploy.yml` (rsync + `pm2 reload`) jalan tiap push ke main.

## 3. Docker

```bash
docker compose up -d --build   # port 3030 → 3050 sesuai env PORT
```

`Dockerfile` multi-stage (Next.js standalone), `.dockerignore` sudah disiapkan.

---

## 4. CI (validasi tiap push / PR)

`.github/workflows/ci.yml` — lint + typecheck + `prisma validate` (runner GitHub).
Wajib hijau sebelum merge.
