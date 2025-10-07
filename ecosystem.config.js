module.exports = {
  apps: [{
    name: 'mechamap-realtime',
    script: './src/app.js',
    instances: 1,
    exec_mode: 'fork',

    // Environment files
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      CLUSTER_ENABLED: false,
      CLUSTER_WORKERS: 1
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      CLUSTER_ENABLED: false,
      CLUSTER_WORKERS: 1
    },

    // Load environment file based on NODE_ENV
    env_file: '.env.production',

    // Monitoring
    monitoring: true,
    pmx: true,

    // Auto-restart configuration - Increased memory limit for 4GB VPS
    max_memory_restart: '2048M',
    min_uptime: '30s',
    max_restarts: 10,
    autorestart: true,
    watch: false,

    // Memory monitoring - More reasonable limits
    memory_limit: '2048M',
    kill_timeout: 5000,

    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Advanced options
    kill_timeout: 10000,
    listen_timeout: 5000,

    // Environment-specific settings - Optimized for 4GB VPS, single process
    node_args: '--max-old-space-size=2048 --expose-gc',

    // Health monitoring
    health_check_grace_period: 5000,
    health_check_fatal_exceptions: true,

    // Production-specific settings
    merge_logs: true,
    time: true,

    // Error handling
    exp_backoff_restart_delay: 1000
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
};
