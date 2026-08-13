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
`git pull → npm ci → prisma generate → build → pm2 reload`. Pantau di tab **Actions** → **Deploy Windows**.

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

### 1.6 Operasional PM2 di Windows
```powershell
pm2 status              # daftar proses
pm2 logs eps-v2         # lihat log (.\logs\ di folder project)
pm2 restart eps-v2      # restart manual
pm2 stop eps-v2         # stop
pm2 save                # simpan daftar proses
```

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
