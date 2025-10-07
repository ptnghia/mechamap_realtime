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
      PORT: 3000,
      CLUSTER_ENABLED: false,
      CLUSTER_WORKERS: 1
    },

    // Development settings
    max_memory_restart: '1G',
    min_uptime: '5s',
    max_restarts: 10,
    autorestart: true,
    watch: false,
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
    // Production Configuration - Optimized for VPS deployment
    name: 'mechamap-realtime-prod',
    script: './src/app.js',
    instances: 1,
    exec_mode: 'fork',

    // Environment
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      CLUSTER_ENABLED: false,
      CLUSTER_WORKERS: 1
    },

    // Auto-restart configuration - Optimized for 4GB VPS
    max_memory_restart: '2048M',
    min_uptime: '30s',
    max_restarts: 10,
    autorestart: true,
    watch: false,

    // Memory monitoring - More reasonable limits
    memory_limit: '2048M',
    kill_timeout: 10000,

    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Advanced options
    listen_timeout: 5000,

    // Environment-specific settings - Optimized for 4GB VPS, single process
    node_args: '--max-old-space-size=2048 --expose-gc',

    // Health monitoring
    health_check_grace_period: 5000,
    health_check_fatal_exceptions: true,
    merge_logs: true,
    time: true,

    // Error handling
    exp_backoff_restart_delay: 1000,

    // Production optimizations
    monitoring: true,
    pmx: true
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
