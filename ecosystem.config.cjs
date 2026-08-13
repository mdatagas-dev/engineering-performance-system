// PM2 ecosystem — produksi (VPS Linux ATAU Windows/RDP).
//
// Prasyarat:
//   Linux: npm i -g pm2 rsync; mkdir -p /opt/eps/app /var/log/eps
//   Windows (RDP): install Node LTS + Git for Windows + `npm i -g pm2`;
//                  deploy via scripts/deploy-windows.ps1 (git pull, npm ci,
//                  build, pm2 restart) — TIDAK butuh SSH/rsync.
//
// .env berisi secret (AUTH_SECRET, DATABASE_URL) — TIDAK di-hardcode di sini.
//
// Cara pakai:
//   pm2 start ecosystem.config.cjs --env production
//   pm2 save
//   pm2 logs eps-v2        # lihat log
//   Linux:  pm2 startup    # systemd auto-start
//   Windows: pm2-windows-startup install   # auto-start via Task Scheduler
//   Deploy ulang: pm2 reload ecosystem.config.cjs --update-env

// Log: path Windows (folder .\logs di project) vs Linux (/var/log/eps).
const IS_WIN = process.platform === "win32";
const LOG_DIR = IS_WIN ? ".\\logs" : "/var/log/eps";

module.exports = {
  apps: [
    {
      name: "eps-v2",
      // Path binary Next 16 (package.json bin: next -> dist/bin/next).
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3050",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "600M",
      kill_timeout: 5000,
      restart_delay: 3000,
      merge_logs: true,
      time: true,
      out_file: `${LOG_DIR}/eps-v2-out.log`,
      error_file: `${LOG_DIR}/eps-v2-error.log`,
      env: {
        NODE_ENV: "production",
        PORT: "3050",
      },
      // Sama dgn env — dipakai saat `pm2 start ... --env production`.
      env_production: {
        NODE_ENV: "production",
        PORT: "3050",
      },
    },
  ],
};
