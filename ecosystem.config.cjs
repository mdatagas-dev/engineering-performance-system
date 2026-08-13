// PM2 ecosystem — produksi (native di VPS).
// Prasyarat server:
//   1) npm i -g pm2 rsync
//   2) mkdir -p /opt/eps/app /var/log/eps
//   3) cp .env ke /opt/eps/app/.env (secret dibaca Next built-in dotenv,
//      TIDAK di-hardcode di sini)
//   4) npm ci && npx prisma generate && npx prisma migrate deploy
// Cara pakai:
//   pm2 start ecosystem.config.cjs --env production
//   pm2 save            # simpan daftar proses utk startup systemd
//   pm2 startup         # daftarkan PM2 sbg systemd service (ikuti output)
//   pm2 reload ecosystem.config.cjs --update-env   # deploy: reload dgn env baru
//   pm2 logs eps-v2     # lihat log

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
      out_file: "/var/log/eps/eps-v2-out.log",
      error_file: "/var/log/eps/eps-v2-error.log",
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
