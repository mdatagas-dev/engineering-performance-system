# EPS — Engineering Production System

Digitalisasi Excel Engineering menjadi aplikasi dashboard: input manual produksi, kalkulasi otomatis (GAP & UPPH 1:1 Excel), analisis tren, ekspor/impor data, dan keamanan berlapis.

## Fitur
- **Autentikasi & RBAC**: login Argon2id, sesi JWT + cookie HttpOnly, lockout & rate limit, proteksi CSRF, security headers
- **Data Produksi**: input manual & input cepat multi-baris, kalkulasi GAP UPH/HC/OP + UPPH (formula Excel), persetujuan & lock record, KPI
- **Dashboard**: 5 tabel ringkas (Daily Production, Plan vs Output, UPH, HC, Setup & UPPH), filter tanggal/model/area
- **Analisis Tren**: grafik tren + perbandingan periode
- **Ekspor/Impor**: CSV (anti CSV-injection), template, riwayat & rollback
- **Audit Trail**: append-only (trigger DB), peta aksi per route
- **Pengaturan**: keamanan, 5 bahasa (EN/ID/ZH/KO/JA), info aplikasi & changelog
- **UI**: sidebar hide, fit-to-screen, responsif HP/tablet/PC, transisi halus

## Teknologi
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 (+ PostgreSQL) · PM2 · Docker · GitHub Actions

## Menjalankan lokal
```bash
npm ci
cp .env.example .env   # isi DATABASE_URL & AUTH_SECRET
npm run dev            # http://localhost:3030
```

Tanpa DB nyata, aplikasi berjalan frontend-first (data mock di localStorage) — akun demo: `staff@eps.local / Staff123!`, `admin@eps.local / Admin123!`.

## Uji
```bash
npx tsc --noEmit && npm run lint
npx tsx --test "lib/**/*.test.ts"   # 800+ test
npx prisma validate
npm run build
```

## Deployment
- **PM2 (VPS)**: `pm2 start ecosystem.config.cjs --env production`
- **Docker**: `docker compose up -d --build`
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`, `deploy.yml` — deploy ke VPS via SSH/rsync, butuh secrets `SSH_HOST`, `SSH_USER`, `SSH_KEY`)
- Prasyarat server: `npm i -g pm2 rsync`, `mkdir -p /opt/eps/app /var/log/eps`, salin `.env`, lalu `npm ci && npx prisma generate && npx prisma migrate deploy`

## Backup otomatis (Monitoring & Backup)

Scheduler backup = **system cron / PM2**, bukan job in-process (Next.js standalone
tidak menjalankan cron sendiri). Satu run mencatat `BackupRun` lengkap
(RUNNING → SUCCESS/FAILED, size, path, error) — lihat `lib/backup/backupService.ts`.

Jalankan manual:

```bash
npm run backup:run
```

Lihat detail selengkapnya di source `lib/backup/*` & endpoint `/api/backups`.
