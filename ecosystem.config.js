// PM2 process configuration for MioOS
// Usage (production):
//   export $(grep -v '^#' .env | xargs)
//   pm2 start ecosystem.config.js --env production
//   pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name: "mioos-web",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      max_memory_restart: "512M",
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "5s",
      out_file: "/var/log/mioos/web-out.log",
      error_file: "/var/log/mioos/web-err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "mioos-runtime",
      script: "node_modules/.bin/tsx",
      args: "runtime/runtime-worker.ts",
      instances: 1,        // MUST be 1 — SQLite does not support concurrent writers
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
      },
      max_memory_restart: "256M",
      restart_delay: 5000,
      max_restarts: 20,
      min_uptime: "10s",
      out_file: "/var/log/mioos/runtime-out.log",
      error_file: "/var/log/mioos/runtime-err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
