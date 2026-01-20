module.exports = {
  apps: [
    {
      name: 'nutrivault-backend',
      cwd: './backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'data'],
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ],

  deploy: {
    production: {
      user: 'nutrivault',
      host: 'YOUR_SERVER_IP',
      ref: 'origin/main',
      repo: 'git@github.com:YOUR_USERNAME/nutrivault.git',
      path: '/home/nutrivault/nutrivault',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run db:migrate && cd frontend && npm install && npm run build && cd .. && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
