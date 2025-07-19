module.exports = {
  apps: [{
    // Development Configuration
    name: 'mechamap-realtime-dev',
    script: './src/app.js',
    instances: 1,
    exec_mode: 'fork',

    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },

    // Development settings
    max_memory_restart: '1G',
    min_uptime: '5s',
    max_restarts: 10,
    autorestart: true,
    watch: true,
    memory_limit: '1G',

    // Development node args
    node_args: '--max-old-space-size=1024 --expose-gc --trace-warnings',

    // Logging
    log_file: './logs/dev-combined.log',
    out_file: './logs/dev-out.log',
    error_file: './logs/dev-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Monitoring
    monitoring: true,
    pmx: true,
    kill_timeout: 5000,
    listen_timeout: 3000,
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true,
    merge_logs: true,
    time: true,
    exp_backoff_restart_delay: 100
  }, {
    // Production Configuration
    name: 'mechamap-realtime-prod',
    script: './src/app.js',
    instances: 2,
    exec_mode: 'cluster',

    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Production memory settings
    max_memory_restart: '512M',
    min_uptime: '10s',
    max_restarts: 15,
    autorestart: true,
    watch: false,
    memory_limit: '512M',

    // Production node args
    node_args: '--max-old-space-size=512 --optimize-for-size --expose-gc',

    // Logging
    log_file: './logs/prod-combined.log',
    out_file: './logs/prod-out.log',
    error_file: './logs/prod-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Production optimizations
    monitoring: true,
    pmx: true,
    kill_timeout: 5000,
    listen_timeout: 3000,
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true,
    merge_logs: true,
    time: true,
    exp_backoff_restart_delay: 100
  }],

  deploy: {
    production: {
      user: 'mechamap',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/ptnghia/mechamap_realtime.git',
      path: '/home/mechamap/mechamap_realtime',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}
