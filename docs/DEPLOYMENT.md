# MechaMap Realtime Server - Deployment Guide

Hướng dẫn deploy MechaMap Realtime Server lên production environment với monitoring system.

## 🎯 Tổng quan

Deployment guide này bao gồm:
- **Production Setup**: Environment configuration và optimization
- **PM2 Clustering**: Process management với load balancing
- **Nginx Configuration**: Reverse proxy và SSL termination
- **SSL/TLS Setup**: HTTPS/WSS với Let's Encrypt
- **Monitoring Integration**: Production monitoring setup
- **Health Checks**: Automated health monitoring
- **Backup & Recovery**: Data backup strategies

## 🚀 Production Environment Setup

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2
- **Node.js**: v18.0.0+ (recommended: v22.16.0)
- **Memory**: Minimum 2GB RAM (recommended: 4GB+)
- **CPU**: Minimum 2 cores (recommended: 4+ cores)
- **Storage**: Minimum 20GB SSD
- **Network**: Stable internet connection với public IP

### Pre-deployment Checklist
- [ ] Server provisioned với adequate resources
- [ ] Domain name configured (e.g., realtime.mechapap.com)
- [ ] SSL certificate ready (Let's Encrypt recommended)
- [ ] Firewall configured (ports 80, 443, 3000)
- [ ] Database access configured
- [ ] Laravel backend deployed và accessible

## 📦 Installation Steps

### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# Create application user
sudo useradd -m -s /bin/bash mechamap
sudo usermod -aG sudo mechamap
```

### 2. Application Deployment
```bash
# Switch to application user
sudo su - mechamap

# Clone repository
git clone https://github.com/your-org/mechamap-backend.git
cd mechamap-backend/realtime-server

# Install dependencies
npm ci --production

# Create production environment file
cp .env.example .env.production
```

### 3. Environment Configuration
```bash
# Edit production environment
nano .env.production
```

**Production Environment Variables:**
```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# SSL Configuration
SSL_ENABLED=false  # Nginx handles SSL termination
SSL_CERT_PATH=/etc/ssl/certs/mechamap.crt
SSL_KEY_PATH=/etc/ssl/private/mechamap.key

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key-here
LARAVEL_API_URL=https://api.mechapap.com

# Database (if using Redis for sessions)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Monitoring
ADMIN_KEY=your-super-secure-admin-key-here
MONITORING_ENABLED=true
METRICS_RETENTION_HOURS=168  # 7 days

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=200  # Higher for production

# CORS
CORS_ORIGIN=https://mechapap.com,https://www.mechapap.com
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/mechamap/realtime.log

# Performance
MAX_CONNECTIONS=10000
HEARTBEAT_TIMEOUT=60000
HEARTBEAT_INTERVAL=25000

# Security
HELMET_ENABLED=true
TRUST_PROXY=true

# Alerts
ALERT_WEBHOOK_URL=https://your-monitoring-webhook.com/alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/slack/webhook
```

### 4. PM2 Configuration
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

**PM2 Configuration:**
```javascript
module.exports = {
  apps: [{
    name: 'mechamap-realtime',
    script: './src/app.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Monitoring
    monitoring: true,
    pmx: true,
    
    // Auto-restart configuration
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    
    // Logging
    log_file: '/var/log/mechamap/combined.log',
    out_file: '/var/log/mechamap/out.log',
    error_file: '/var/log/mechamap/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Advanced options
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Environment-specific settings
    node_args: '--max-old-space-size=2048',
    
    // Health monitoring
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true
  }],

  deploy: {
    production: {
      user: 'mechamap',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/your-org/mechamap-backend.git',
      path: '/home/mechamap/mechamap-backend',
      'pre-deploy-local': '',
      'post-deploy': 'cd realtime-server && npm ci --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
```

### 5. Nginx Configuration
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/mechamap-realtime
```

**Nginx Configuration:**
```nginx
# Upstream configuration for load balancing
upstream mechamap_realtime {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    # Add more servers for horizontal scaling
    # server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    # server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=monitoring:10m rate=5r/s;

server {
    listen 80;
    server_name realtime.mechapap.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name realtime.mechapap.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/realtime.mechapap.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/realtime.mechapap.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # WebSocket upgrade configuration
    location / {
        proxy_pass http://mechamap_realtime;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket specific
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # API endpoints với separate rate limiting
    location /api/ {
        proxy_pass http://mechamap_realtime;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting for API
        limit_req zone=api burst=50 nodelay;
    }

    # Monitoring endpoints với stricter rate limiting
    location /api/monitoring/ {
        proxy_pass http://mechamap_realtime;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Stricter rate limiting for monitoring
        limit_req zone=monitoring burst=10 nodelay;
        
        # Optional: Restrict access to monitoring endpoints
        # allow 10.0.0.0/8;
        # allow 192.168.0.0/16;
        # deny all;
    }

    # Health check endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://mechamap_realtime;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # No rate limiting for health checks
        access_log off;
    }

    # Static files (if any)
    location /static/ {
        alias /home/mechamap/mechamap-backend/realtime-server/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

### 6. SSL Certificate Setup
```bash
# Obtain SSL certificate
sudo certbot --nginx -d realtime.mechapap.com

# Test certificate renewal
sudo certbot renew --dry-run

# Setup auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 7. Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000  # For direct access if needed
sudo ufw enable

# Check firewall status
sudo ufw status
```

### 8. Log Directory Setup
```bash
# Create log directories
sudo mkdir -p /var/log/mechamap
sudo chown mechamap:mechamap /var/log/mechamap

# Setup log rotation
sudo nano /etc/logrotate.d/mechamap
```

**Log Rotation Configuration:**
```
/var/log/mechamap/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 mechamap mechamap
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 🚀 Deployment Process

### Initial Deployment
```bash
# Switch to application user
sudo su - mechamap

# Navigate to application directory
cd mechamap-backend/realtime-server

# Install dependencies
npm ci --production

# Run tests (optional but recommended)
npm test

# Start application với PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by PM2

# Enable Nginx site
sudo ln -s /etc/nginx/sites-available/mechamap-realtime /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Deployment Verification
```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs mechamap-realtime

# Test health endpoint
curl https://realtime.mechapap.com/api/health

# Test monitoring endpoint
curl https://realtime.mechapap.com/api/monitoring/health

# Test WebSocket connection
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
     -H "Sec-WebSocket-Version: 13" \
     https://realtime.mechapap.com/socket.io/
```

## 📊 Production Monitoring

### PM2 Monitoring
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs mechamap-realtime --lines 100

# Restart application
pm2 restart mechamap-realtime

# Reload application (zero-downtime)
pm2 reload mechamap-realtime

# View process information
pm2 show mechamap-realtime
```

### System Monitoring
```bash
# Check system resources
htop
free -h
df -h

# Check network connections
netstat -tulpn | grep :3000

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Application Monitoring
```bash
# Health check
curl https://realtime.mechapap.com/api/health

# Detailed metrics
curl https://realtime.mechapap.com/api/monitoring/metrics

# Performance metrics
curl https://realtime.mechapap.com/api/monitoring/performance

# Active alerts
curl https://realtime.mechapap.com/api/monitoring/alerts
```

## 🔄 Updates & Maintenance

### Application Updates
```bash
# Create deployment script
nano deploy.sh
```

**Deployment Script:**
```bash
#!/bin/bash

# MechaMap Realtime Server Deployment Script

set -e

echo "Starting deployment..."

# Pull latest changes
git pull origin main

# Install/update dependencies
npm ci --production

# Run tests
npm test

# Reload PM2 processes (zero-downtime deployment)
pm2 reload ecosystem.config.js --env production

# Wait for processes to stabilize
sleep 10

# Health check
if curl -f https://realtime.mechapap.com/api/health > /dev/null 2>&1; then
    echo "✅ Deployment successful! Health check passed."
else
    echo "❌ Deployment failed! Health check failed."
    exit 1
fi

echo "Deployment completed successfully!"
```

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Database Maintenance
```bash
# If using Redis for sessions/caching
redis-cli FLUSHDB  # Clear cache if needed

# Backup Redis data
redis-cli BGSAVE
```

### Log Maintenance
```bash
# Rotate logs manually
sudo logrotate -f /etc/logrotate.d/mechamap

# Clear old PM2 logs
pm2 flush

# Archive old logs
sudo tar -czf /backup/logs-$(date +%Y%m%d).tar.gz /var/log/mechamap/
```

## 🔒 Security Hardening

### System Security
```bash
# Update system packages regularly
sudo apt update && sudo apt upgrade -y

# Configure fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh
```

### Application Security
```bash
# Set proper file permissions
chmod 600 .env.production
chmod 755 src/
chmod 644 src/*.js

# Secure log files
sudo chmod 640 /var/log/mechamap/*.log
sudo chown mechamap:adm /var/log/mechamap/*.log
```

### Nginx Security
```bash
# Hide Nginx version
sudo nano /etc/nginx/nginx.conf
# Add: server_tokens off;

# Configure additional security headers
# (Already included in the Nginx configuration above)

# Test Nginx configuration
sudo nginx -t
sudo systemctl reload nginx
```

## 📋 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check PM2 logs
pm2 logs mechamap-realtime

# Check environment variables
pm2 env 0

# Restart application
pm2 restart mechamap-realtime
```

#### High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart if memory leak detected
pm2 restart mechamap-realtime

# Check for memory leaks in logs
grep -i "memory" /var/log/mechamap/*.log
```

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL configuration
openssl s_client -connect realtime.mechapap.com:443
```

#### WebSocket Connection Issues
```bash
# Check Nginx WebSocket configuration
sudo nginx -t

# Test WebSocket upgrade
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     https://realtime.mechapap.com/socket.io/

# Check firewall
sudo ufw status
```

## 📈 Performance Optimization

### PM2 Optimization
```javascript
// ecosystem.config.js optimizations
module.exports = {
  apps: [{
    name: 'mechamap-realtime',
    script: './src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    
    // Performance tuning
    node_args: [
      '--max-old-space-size=2048',
      '--optimize-for-size'
    ],
    
    // Advanced PM2 options
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    autorestart: true,
    watch: false,
    
    // Cluster settings
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      UV_THREADPOOL_SIZE: 128
    }
  }]
};
```

### Nginx Optimization
```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 4096;

# Enable HTTP/2
listen 443 ssl http2;

# Optimize SSL
ssl_session_cache shared:SSL:50m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# Enable compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
```

### System Optimization
```bash
# Increase file descriptor limits
echo "mechamap soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "mechamap hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize kernel parameters
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 🔄 Backup & Recovery

### Application Backup
```bash
# Create backup script
nano backup.sh
```

**Backup Script:**
```bash
#!/bin/bash

BACKUP_DIR="/backup/mechamap-realtime"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app-$DATE.tar.gz \
    /home/mechamap/mechamap-backend/realtime-server \
    --exclude=node_modules \
    --exclude=logs

# Backup configuration
cp /etc/nginx/sites-available/mechamap-realtime $BACKUP_DIR/nginx-$DATE.conf
cp /home/mechamap/mechamap-backend/realtime-server/ecosystem.config.js $BACKUP_DIR/pm2-$DATE.js

# Backup logs
tar -czf $BACKUP_DIR/logs-$DATE.tar.gz /var/log/mechamap/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
```

### Recovery Process
```bash
# Stop application
pm2 stop mechamap-realtime

# Restore application files
tar -xzf /backup/mechamap-realtime/app-YYYYMMDD_HHMMSS.tar.gz -C /

# Restore configuration
sudo cp /backup/mechamap-realtime/nginx-YYYYMMDD_HHMMSS.conf /etc/nginx/sites-available/mechamap-realtime
sudo nginx -t && sudo systemctl reload nginx

# Install dependencies
cd /home/mechamap/mechamap-backend/realtime-server
npm ci --production

# Start application
pm2 start ecosystem.config.js --env production
```

## 📚 Related Documentation

- [API Documentation](./API.md)
- [Monitoring System](./MONITORING.md)
- [Security Guide](./SECURITY.md)
- [Performance Tuning](./PERFORMANCE.md)
