This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Backup otomatis (Monitoring & Backup)

Scheduler backup = **system cron / PM2**, bukan job in-process (Next.js standalone
tidak menjalankan cron sendiri). Satu run mencatat `BackupRun` lengkap
(RUNNING → SUCCESS/FAILED, size, path, error) — lihat `lib/backup/backupService.ts`.

Jalankan manual:

```bash
BACKUP_PG_DUMP_CMD="pg_dump --dbname=$DATABASE_URL -Fc -f /backups/eps_$(date +%F).dump" \
BACKUP_PG_DUMP_PATH="/backups/eps_$(date +%F).dump" \
npm run backup:run
# BACKUP_TYPE=incremental untuk tipe INCREMENTAL (default FULL)
```

Tanpa `BACKUP_PG_DUMP_CMD`, run tercatat FAILED dengan alasan (executor pg_dump
tidak tersedia). Cron harian 02:00:

```cron
0 2 * * * cd /path/ke/proyek && BACKUP_PG_DUMP_CMD="..." npm run backup:run >> /var/log/eps-backup.log 2>&1
```

Pemantauan: `GET /api/backups` (permission `backup.view`, pagination + filter
status/type). Riwayat dipertahankan; retensi backup lama di luar scope fase ini.

## Slow query monitoring (Monitoring & Backup)

Deteksi: hook `prisma.$on("query")` di `lib/prisma.ts` mencatat query dengan
durasi >= `SLOW_QUERY_THRESHOLD_MS` (1000 ms) ke tabel `slow_query_logs`
(query text, durationMs, metadata params/target). Self-insert di-skip; kegagalan
pencatatan di-swallow agar tidak mengganggu query utama.

Lihat & analisis: `GET /api/slow-queries` (permission `backup.view`) —
pagination `page`/`perPage`, filter `minDurationMs`/`from`/`to`, urut
`durationMs` desc. `summary` = top-10 pola query (group by text SQL, params
terpisah) dengan count/avg/max duration — prioritas optimasi.

Cara baca: query berulang dengan duration tinggi di `summary` = kandidat
optimasi. Index untuk query umum sudah ada di skema (records, audit,
notification, backup); jalankan `EXPLAIN ANALYZE` sebelum menambah index baru.
Retensi log & auto-vacuum di luar scope fase ini.


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
