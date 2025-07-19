# Production Deployment Guide - MechaMap Realtime Server

🚀 **Complete guide for deploying MechaMap Realtime Server to production**

## 🎯 **Production Architecture**

```
Frontend: https://mechamap.com (Shared Hosting)
    ↓ WebSocket HTTPS:443
Realtime: https://realtime.mechamap.com (VPS)
    ↓ API Calls HTTPS
Backend: https://mechamap.com/api (Laravel)
```

## 📋 **Pre-deployment Checklist**

### **VPS Requirements**
- **OS**: Ubuntu 20.04+ / CentOS 8+
- **RAM**: 2GB minimum, 4GB recommended
- **CPU**: 2 cores minimum
- **Storage**: 20GB minimum
- **Network**: Public IP with domain pointing

### **Domain Setup**
- **Main Domain**: `mechamap.com` → Hosting IP
- **Realtime Domain**: `realtime.mechamap.com` → VPS IP
- **SSL Certificates**: Let's Encrypt for both domains

## 🔧 **VPS Setup**

### **Step 1: Server Preparation**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git nginx ufw

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### **Step 2: Install Node.js**

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x

# Install PM2 globally
sudo npm install -g pm2
```

### **Step 3: Install MySQL**

```bash
# Install MySQL
sudo apt install -y mysql-server

# Secure installation
sudo mysql_secure_installation

# Create production database
sudo mysql -u root -p
```

```sql
-- Create database and user
CREATE DATABASE mechamap_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mechamap_user'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON mechamap_production.* TO 'mechamap_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### **Step 4: SSL Certificate Setup**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --nginx -d realtime.mechamap.com

# Verify certificate
sudo certbot certificates
```

## 🚀 **Application Deployment**

### **Step 1: Deploy Application**

```bash
# Create application directory
sudo mkdir -p /var/www/mechamap-realtime
sudo chown $USER:$USER /var/www/mechamap-realtime

# Clone repository
cd /var/www/mechamap-realtime
git clone https://github.com/your-repo/mechamap-realtime.git .

# Install dependencies
npm install --omit=dev
```

### **Step 2: Configure Environment**

```bash
# Copy production config
cp .env.production .env

# Update configuration
nano .env
```

**Update these values in .env:**
```bash
# Server Configuration
NODE_ENV=production
PORT=443
HOST=0.0.0.0

# SSL Configuration
SSL_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/realtime.mechamap.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/realtime.mechamap.com/privkey.pem

# Laravel Integration
LARAVEL_API_URL=https://mechamap.com
LARAVEL_API_KEY=YOUR_PRODUCTION_API_KEY

# Database
DB_HOST=localhost
DB_NAME=mechamap_production
DB_USER=mechamap_user
DB_PASSWORD=YOUR_SECURE_PASSWORD

# Security
CORS_ORIGIN=https://mechamap.com,https://www.mechamap.com
JWT_SECRET=YOUR_JWT_SECRET_SYNCHRONIZED_WITH_LARAVEL
```

### **Step 3: Configure PM2**

```bash
# Start application with PM2
pm2 start ecosystem.config.js --env production

# Setup auto-start on boot
pm2 startup
pm2 save

# Verify status
pm2 status
pm2 logs mechamap-realtime
```

### **Step 4: Configure Nginx**

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/realtime.mechamap.com
```

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name realtime.mechamap.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name realtime.mechamap.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/realtime.mechamap.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/realtime.mechamap.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # WebSocket Proxy
    location / {
        proxy_pass https://localhost:443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/realtime.mechamap.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🏠 **Hosting Configuration**

### **Laravel Backend Setup**

Update Laravel `.env` on hosting:

```bash
# WebSocket Configuration
WEBSOCKET_SERVER_URL=https://realtime.mechamap.com
WEBSOCKET_SERVER_HOST=realtime.mechamap.com
WEBSOCKET_SERVER_PORT=443
WEBSOCKET_SERVER_SECURE=true

# Broadcasting
BROADCAST_CONNECTION=nodejs
NODEJS_BROADCAST_URL=https://realtime.mechamap.com

# API Key (synchronized with realtime server)
WEBSOCKET_API_KEY_HASH=YOUR_API_KEY_HASH
```

## 🧪 **Testing Deployment**

### **Health Checks**

```bash
# Test realtime server health
curl -I https://realtime.mechamap.com/health

# Test WebSocket endpoint
curl -I https://realtime.mechamap.com/socket.io/

# Test CORS headers
curl -H "Origin: https://mechamap.com" -I https://realtime.mechamap.com
```

### **Frontend Testing**

1. **Open**: `https://mechamap.com`
2. **Login**: Any user account
3. **Open DevTools**: F12 → Console
4. **Check logs**: Look for WebSocket connection messages

**Expected logs:**
```javascript
MechaMap WebSocket: Connecting to https://realtime.mechamap.com
WebSocket connected successfully
User authenticated: {userId: 1, socketId: "abc123"}
```

## 📊 **Monitoring & Maintenance**

### **PM2 Monitoring**

```bash
# Check status
pm2 status

# View logs
pm2 logs mechamap-realtime

# Monitor resources
pm2 monit

# Restart application
pm2 restart mechamap-realtime
```

### **SSL Certificate Renewal**

```bash
# Auto-renewal (setup cron job)
sudo crontab -e

# Add this line for automatic renewal
0 12 * * * /usr/bin/certbot renew --quiet
```

### **Log Management**

```bash
# Application logs
tail -f /var/www/mechamap-realtime/logs/app.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PM2 logs
pm2 logs mechamap-realtime --lines 100
```

## 🔄 **Updates & Rollbacks**

### **Application Updates**

```bash
# Pull latest changes
cd /var/www/mechamap-realtime
git pull origin main

# Install new dependencies
npm install --omit=dev

# Restart application
pm2 restart mechamap-realtime
```

### **Rollback Procedure**

```bash
# Rollback to previous version
git log --oneline -10  # Find commit hash
git checkout COMMIT_HASH

# Restart application
pm2 restart mechamap-realtime
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **SSL Certificate Errors**
   ```bash
   sudo certbot renew --dry-run
   sudo systemctl reload nginx
   ```

2. **Port 443 Already in Use**
   ```bash
   sudo lsof -i :443
   sudo kill -9 PID
   ```

3. **Database Connection Failed**
   ```bash
   mysql -h localhost -u mechamap_user -p mechamap_production
   ```

4. **CORS Errors**
   - Check `CORS_ORIGIN` in `.env`
   - Verify domain spelling
   - Check Nginx proxy headers

### **Emergency Procedures**

```bash
# Stop all services
pm2 stop all
sudo systemctl stop nginx

# Start services
sudo systemctl start nginx
pm2 start all

# Check system resources
free -h
df -h
top
```

## ✅ **Deployment Checklist**

- [ ] VPS setup completed
- [ ] Node.js and PM2 installed
- [ ] MySQL database created
- [ ] SSL certificates configured
- [ ] Application deployed and configured
- [ ] PM2 auto-start enabled
- [ ] Nginx configured and running
- [ ] Health checks passing
- [ ] WebSocket connection tested
- [ ] Laravel backend configured
- [ ] Monitoring setup completed

## 📞 **Support**

If deployment fails:
1. Check application logs: `pm2 logs mechamap-realtime`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify SSL certificates: `sudo certbot certificates`
4. Test database connection: `mysql -h localhost -u mechamap_user -p`
5. Check firewall: `sudo ufw status`

**Production deployment completed successfully!** 🎉
