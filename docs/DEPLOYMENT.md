# Hướng dẫn Deployment - MechaMap Realtime Server

Tài liệu này cung cấp hướng dẫn chi tiết về cách deploy MechaMap Realtime Server từ development đến production.

## 🚀 Tổng quan Deployment

MechaMap Realtime Server hỗ trợ nhiều môi trường deployment:
- **Development**: Local development với hot-reload
- **Production**: Production server với PM2 clustering
- **Docker**: Container deployment (tùy chọn)

## 🛠️ Development Setup

### Yêu cầu hệ thống
- Node.js >= 18.0.0
- npm >= 8.0.0
- MySQL database
- Redis (tùy chọn)

### Cài đặt Development

1. **Clone repository:**
```bash
git clone https://github.com/ptnghia/mechamap_realtime.git
cd mechamap_realtime
```

2. **Cài đặt dependencies:**
```bash
npm install
```

3. **Cấu hình environment:**
```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:
```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mechamap_dev
DB_USER=root
DB_PASSWORD=your_password

# Laravel Integration
LARAVEL_API_URL=http://localhost:8000
LARAVEL_API_KEY=your-dev-api-key

# JWT Configuration
JWT_SECRET=your-development-jwt-secret
JWT_EXPIRES_IN=1h

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# SSL Configuration (Development)
SSL_ENABLED=false

# Debug Mode
DEBUG_MODE=true
VERBOSE_LOGGING=true
```

4. **Khởi động development server:**
```bash
# Với nodemon (auto-reload)
npm run dev

# Hoặc chạy trực tiếp
node src/app.js
```

5. **Kiểm tra server:**
```bash
curl http://localhost:3000/api/health
```

### Development Scripts

```bash
# Khởi động với auto-reload
npm run dev

# Chạy tests
npm test

# Kiểm tra code style
npm run lint

# Format code
npm run format
```

## 🚀 Production Deployment

### Yêu cầu Production
- VPS/Server với Node.js >= 18.0.0
- PM2 process manager
- Nginx reverse proxy (khuyến nghị)
- SSL certificate (Let's Encrypt)
- MySQL database
- Redis (khuyến nghị)

### Bước 1: Chuẩn bị Server

1. **Cập nhật hệ thống:**
```bash
sudo apt update && sudo apt upgrade -y
```

2. **Cài đặt Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Cài đặt PM2:**
```bash
sudo npm install -g pm2
```

4. **Cài đặt Nginx (tùy chọn):**
```bash
sudo apt install nginx -y
```

### Bước 2: Deploy Code

1. **Clone repository trên server:**
```bash
cd /var/www/
git clone https://github.com/ptnghia/mechamap_realtime.git
cd mechamap_realtime
```

2. **Cài đặt dependencies:**
```bash
npm ci --production
```

3. **Cấu hình production environment:**
```bash
cp .env.example .env.production
```

Chỉnh sửa `.env.production`:
```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# SSL Configuration (handled by reverse proxy)
SSL_ENABLED=false

# Database Configuration (Production)
DB_HOST=your-db-host
DB_PORT=3306
DB_NAME=your-production-db
DB_USER=your-db-user
DB_PASSWORD=your-secure-password

# Laravel Integration (Production)
LARAVEL_API_URL=https://mechamap.com
LARAVEL_API_KEY=your-production-api-key

# JWT Configuration (Secure)
JWT_SECRET=your-very-secure-jwt-secret-256-bits
JWT_EXPIRES_IN=1h

# CORS Configuration (Production)
CORS_ORIGIN=https://mechamap.com,https://www.mechamap.com
CORS_CREDENTIALS=true

# Security Settings
ADMIN_KEY=your-secure-admin-key
RATE_LIMIT_MAX_REQUESTS=100
MAX_CONNECTIONS=5000

# Performance Settings
CLUSTER_ENABLED=true
CLUSTER_WORKERS=2

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000

# Production Settings
DEBUG_MODE=false
VERBOSE_LOGGING=false
```

### Bước 3: Cấu hình PM2

File `ecosystem.config.js` đã được cấu hình sẵn:

```javascript
module.exports = {
  apps: [{
    name: 'mechamap-realtime',
    script: './src/app.js',
    instances: 2,
    exec_mode: 'cluster',
    
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    env_file: '.env.production',
    
    max_memory_restart: '2G',
    min_uptime: '10s',
    max_restarts: 15,
    autorestart: true,
    
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    
    node_args: '--max-old-space-size=4096'
  }]
};
```

### Bước 4: Khởi động Production

1. **Tạo thư mục logs:**
```bash
mkdir -p logs
chmod 755 logs
```

2. **Khởi động với PM2:**
```bash
pm2 start ecosystem.config.js --env production
```

3. **Lưu cấu hình PM2:**
```bash
pm2 save
pm2 startup
```

4. **Kiểm tra trạng thái:**
```bash
pm2 status
pm2 logs mechamap-realtime
```

### Bước 5: Cấu hình Reverse Proxy (Nginx)

Tạo file `/etc/nginx/sites-available/realtime.mechamap.com`:

```nginx
server {
    listen 80;
    server_name realtime.mechamap.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name realtime.mechamap.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/realtime.mechamap.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/realtime.mechamap.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Proxy to Node.js server
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

Kích hoạt site:
```bash
sudo ln -s /etc/nginx/sites-available/realtime.mechamap.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Bước 6: SSL Certificate

Sử dụng Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d realtime.mechamap.com
```

## 🔧 Production Scripts

### Script khởi động production

File `scripts/start-production.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Starting MechaMap Realtime Server in Production Mode"

# Change to app directory
cd /var/www/mechamap_realtime

# Create logs directory
mkdir -p logs

# Stop existing processes
pm2 stop mechamap-realtime 2>/dev/null || true
pm2 delete mechamap-realtime 2>/dev/null || true

# Start with PM2
NODE_ENV=production pm2 start ecosystem.config.js --env production

# Show status
pm2 status
pm2 logs mechamap-realtime --lines 10

echo "✅ MechaMap Realtime Server started successfully!"
```

Chạy script:
```bash
chmod +x scripts/start-production.sh
./scripts/start-production.sh
```

## 📊 Monitoring & Maintenance

### PM2 Commands

```bash
# Xem trạng thái
pm2 status

# Xem logs
pm2 logs mechamap-realtime

# Monitor real-time
pm2 monit

# Restart
pm2 restart mechamap-realtime

# Reload (zero-downtime)
pm2 reload mechamap-realtime

# Stop
pm2 stop mechamap-realtime

# Delete
pm2 delete mechamap-realtime
```

### Health Checks

```bash
# Basic health check
curl -s https://realtime.mechamap.com/api/health

# Detailed monitoring
curl -s https://realtime.mechamap.com/api/monitoring/health

# Performance metrics
curl -s https://realtime.mechamap.com/api/monitoring/performance
```

### Log Management

Logs được lưu trong thư mục `logs/`:
- `combined.log` - Tất cả logs
- `out.log` - Standard output
- `error.log` - Error logs

Rotate logs:
```bash
# Cấu hình logrotate
sudo nano /etc/logrotate.d/mechamap-realtime
```

```
/var/www/mechamap_realtime/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload mechamap-realtime
    endscript
}
```

## 🧪 Testing Production

### System Test Script

Chạy test tổng hợp:
```bash
./test-system.sh
```

### Manual Testing

```bash
# Test main endpoint
curl -s https://realtime.mechamap.com/

# Test health
curl -s https://realtime.mechamap.com/api/health

# Test WebSocket (với wscat)
npm install -g wscat
wscat -c wss://realtime.mechamap.com/socket.io/?EIO=4&transport=websocket
```

## 🔄 Updates & Rollbacks

### Update Process

1. **Backup hiện tại:**
```bash
cp -r /var/www/mechamap_realtime /var/www/mechamap_realtime_backup
```

2. **Pull changes:**
```bash
cd /var/www/mechamap_realtime
git pull origin main
```

3. **Update dependencies:**
```bash
npm ci --production
```

4. **Reload PM2:**
```bash
pm2 reload mechamap-realtime
```

### Rollback Process

```bash
# Stop current version
pm2 stop mechamap-realtime

# Restore backup
rm -rf /var/www/mechamap_realtime
mv /var/www/mechamap_realtime_backup /var/www/mechamap_realtime

# Restart
cd /var/www/mechamap_realtime
pm2 start ecosystem.config.js --env production
```

## 🐳 Docker Deployment (Tùy chọn)

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "src/app.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  mechamap-realtime:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
```

### Deploy với Docker

```bash
# Build image
docker build -t mechamap-realtime .

# Run container
docker run -d \
  --name mechamap-realtime \
  -p 3000:3000 \
  -v $(pwd)/logs:/app/logs \
  --env-file .env.production \
  mechamap-realtime

# Hoặc với docker-compose
docker-compose up -d
```

## 🚨 Troubleshooting

### Common Issues

1. **Port đã được sử dụng:**
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

2. **Permission issues:**
```bash
sudo chown -R $USER:$USER /var/www/mechamap_realtime
chmod +x scripts/*.sh
```

3. **Database connection:**
```bash
# Test database connection
mysql -h <host> -u <user> -p <database>
```

4. **Memory issues:**
```bash
# Increase PM2 memory limit
pm2 start ecosystem.config.js --env production --max-memory-restart 4G
```

### Logs Analysis

```bash
# Xem error logs
tail -f logs/error.log

# Xem PM2 logs
pm2 logs mechamap-realtime --lines 100

# Xem system logs
sudo journalctl -u nginx -f
```

## 📋 Checklist Deployment

### Pre-deployment
- [ ] Code đã được test đầy đủ
- [ ] Environment variables đã được cấu hình
- [ ] Database connection đã được test
- [ ] SSL certificates đã sẵn sàng
- [ ] Backup dữ liệu hiện tại

### Deployment
- [ ] Code đã được deploy
- [ ] Dependencies đã được cài đặt
- [ ] PM2 đã được cấu hình và khởi động
- [ ] Nginx reverse proxy đã được cấu hình
- [ ] SSL đã được cấu hình

### Post-deployment
- [ ] Health checks pass
- [ ] WebSocket connections hoạt động
- [ ] Monitoring endpoints accessible
- [ ] Logs được ghi đúng cách
- [ ] Performance metrics bình thường

## 🆘 Support

Nếu gặp vấn đề trong quá trình deployment:
1. Kiểm tra logs: `pm2 logs mechamap-realtime`
2. Chạy health check: `curl https://realtime.mechamap.com/api/health`
3. Kiểm tra system test: `./test-system.sh`
4. Liên hệ team development để được hỗ trợ
