module.exports = {
  apps: [{
    name: 'mechamap-realtime',
    script: './src/app.js',
    instances: 2,
    exec_mode: 'cluster',

    // Environment files
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Load environment file based on NODE_ENV
    env_file: '.env.production',

    // Monitoring
    monitoring: true,
    pmx: true,

    // Auto-restart configuration
    max_memory_restart: '2G',
    min_uptime: '10s',
    max_restarts: 15,
    autorestart: true,
    watch: false,

    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Advanced options
    kill_timeout: 5000,
    listen_timeout: 3000,

    // Environment-specific settings
    node_args: '--max-old-space-size=4096',

    // Health monitoring
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true,

    // Production-specific settings
    merge_logs: true,
    time: true,

    // Error handling
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
};
