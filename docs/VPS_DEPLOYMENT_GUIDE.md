# MechaMap Realtime Server - VPS Deployment Guide

## Table of Contents
1. [Server Requirements](#server-requirements)
2. [Initial VPS Setup](#initial-vps-setup)
3. [FastPanel Installation](#fastpanel-installation)
4. [Node.js and Dependencies](#nodejs-and-dependencies)
5. [Project Deployment](#project-deployment)
6. [Database Configuration](#database-configuration)
7. [FastPanel Proxy Configuration](#fastpanel-proxy-configuration)
8. [SSL Certificate Setup](#ssl-certificate-setup)
9. [Environment Configuration](#environment-configuration)
10. [Application Startup](#application-startup)
11. [Monitoring and Maintenance](#monitoring-and-maintenance)
12. [Troubleshooting](#troubleshooting)

## Server Requirements

### Minimum Hardware Requirements
- **RAM**: 4GB (recommended 8GB+)
- **CPU**: 2 cores (recommended 4+ cores)
- **Storage**: 20GB SSD (recommended 50GB+)
- **Network**: 100Mbps connection

### Software Requirements
- **OS**: Ubuntu 20.04 LTS or Ubuntu 22.04 LTS
- **Node.js**: v16.x or v18.x LTS
- **MySQL**: 8.0+ or MariaDB 10.6+
- **Redis**: 6.x+ (optional but recommended)
- **FastPanel**: Latest version

## Initial VPS Setup

### 1. Connect to your VPS
```bash
ssh root@your-server-ip
```

### 2. Update system packages
```bash
apt update && apt upgrade -y
```

### 3. Install essential packages
```bash
apt install -y curl wget git unzip software-properties-common
```

### 4. Create application user (recommended)
```bash
adduser mechamap
usermod -aG sudo mechamap
```

### 5. Configure firewall
```bash
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable
```

## FastPanel Installation

### 1. Download and install FastPanel
```bash
curl -sSL https://fastpanel.direct/install.sh | bash
```

### 2. Access FastPanel
- Open your browser and go to `https://your-server-ip:8888`
- Complete the initial setup wizard
- Create admin account

### 3. Configure basic settings
- Set timezone
- Configure backup settings
- Enable automatic updates

## Node.js and Dependencies

### 1. Install Node.js via NodeSource
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
```

### 2. Verify installation
```bash
node --version  # Should be v18.x
npm --version   # Should be 9.x+
```

### 3. Install PM2 globally
```bash
npm install -g pm2
```

### 4. Install Redis (optional but recommended)
```bash
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
```

## Project Deployment

### 1. Clone the repository
```bash
# Switch to application user
su - mechamap

# Create application directory
mkdir -p /home/mechamap/apps
cd /home/mechamap/apps

# Clone the repository
git clone https://github.com/ptnghia/mechamap_realtime.git
cd mechamap_realtime

# Switch to production branch
git checkout production
```

### 2. Install dependencies
```bash
npm install --production
```

### 3. Create logs directory
```bash
mkdir -p logs
chmod 755 logs
```

### 4. Make scripts executable
```bash
chmod +x scripts/*.sh
```

## Database Configuration

### 1. Create MySQL/MariaDB database
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database and user
CREATE DATABASE mechamap_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mechamap_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON mechamap_db.* TO 'mechamap_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Test database connection
```bash
mysql -u mechamap_user -p mechamap_db
```

## FastPanel Proxy Configuration

### 1. Create a new site in FastPanel
- Go to **Websites** → **Add Website**
- Domain: `realtime.yourdomain.com`
- Document Root: `/home/mechamap/apps/mechamap_realtime/public` (create if needed)

### 2. Configure reverse proxy
- Go to **Websites** → Select your site → **Proxy**
- Enable proxy mode
- Target: `http://127.0.0.1:3000`
- Enable WebSocket support
- Set proxy timeout: 300 seconds

### 3. Proxy configuration details
```nginx
# FastPanel will generate something like this:
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

## SSL Certificate Setup

### 1. Install SSL certificate via FastPanel
- Go to **Websites** → Select your site → **SSL**
- Choose **Let's Encrypt**
- Enable automatic renewal
- Force HTTPS redirect

### 2. Verify SSL configuration
```bash
# Test SSL certificate
curl -I https://realtime.yourdomain.com
```

## Environment Configuration

### 1. Create production environment file
```bash
cd /home/mechamap/apps/mechamap_realtime
cp .env.production .env
```

### 2. Update environment variables
```bash
nano .env
```

**Update these key settings:**
```env
# Update domain
DOMAIN=realtime.yourdomain.com
PUBLIC_URL=https://realtime.yourdomain.com

# Update database credentials
DB_HOST=localhost
DB_NAME=mechamap_db
DB_USER=mechamap_user
DB_PASSWORD=your_secure_password

# Update Laravel integration
LARAVEL_API_URL=https://yourdomain.com
LARAVEL_API_KEY=your_laravel_api_key

# Update CORS origins
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com,https://realtime.yourdomain.com

# Generate new secrets
JWT_SECRET=your_new_jwt_secret_64_chars_minimum
ADMIN_KEY=your_new_admin_key_64_chars_minimum
```

### 3. Generate secure secrets
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate admin key
node -e "console.log('admin_' + require('crypto').randomBytes(32).toString('hex'))"
```

## Application Startup

### 1. Test the application
```bash
# Test basic startup
npm start

# Test with specific environment
NODE_ENV=production npm start
```

### 2. Configure PM2 ecosystem
```bash
# The ecosystem.config.js should already be configured
# Review and update if needed
nano ecosystem.config.js
```

### 3. Start with PM2
```bash
# Start the application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions shown
```

### 4. Verify startup
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs mechamap-realtime

# Monitor resources
pm2 monit
```

## Monitoring and Maintenance

### 1. Setup monitoring scripts
```bash
# Make monitoring scripts executable
chmod +x scripts/monitor-realtime.sh
chmod +x scripts/pm2-health-check.sh

# Setup cron jobs
crontab -e
```

**Add these cron jobs:**
```cron
# Health check every 5 minutes
*/5 * * * * /home/mechamap/apps/mechamap_realtime/scripts/pm2-health-check.sh

# Memory monitoring every hour
0 * * * * /home/mechamap/apps/mechamap_realtime/scripts/memory-monitor.sh

# Log rotation daily at 2 AM
0 2 * * * /home/mechamap/apps/mechamap_realtime/scripts/setup-memory-cron.sh
```

### 2. Setup log rotation
```bash
# Run the memory cron setup
./scripts/setup-memory-cron.sh
```

### 3. Configure backup
```bash
# Create backup script
cat > /home/mechamap/backup-realtime.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/mechamap/backups"
APP_DIR="/home/mechamap/apps/mechamap_realtime"

mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/realtime_app_$DATE.tar.gz -C $APP_DIR .

# Backup database
mysqldump -u mechamap_user -p mechamap_db > $BACKUP_DIR/mechamap_db_$DATE.sql

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
EOF

chmod +x /home/mechamap/backup-realtime.sh

# Add to cron (daily at 3 AM)
echo "0 3 * * * /home/mechamap/backup-realtime.sh" | crontab -
```

## DNS Configuration

### 1. Point domain to your VPS
Create an A record in your domain registrar:
```
Type: A
Name: realtime
Value: your-server-ip
TTL: 300 (or your preferred value)
```

### 2. Verify DNS propagation
```bash
# Check DNS resolution
nslookup realtime.yourdomain.com
dig realtime.yourdomain.com
```

## Testing the Deployment

### 1. Test HTTP access
```bash
curl -I https://realtime.yourdomain.com
```

### 2. Test WebSocket connection
```bash
# Install wscat for testing
npm install -g wscat

# Test WebSocket
wscat -c wss://realtime.yourdomain.com
```

### 3. Test API endpoints
```bash
# Health check
curl https://realtime.yourdomain.com/health

# API status
curl https://realtime.yourdomain.com/api/status
```

## Troubleshooting

### Common Issues

**1. Application won't start**
```bash
# Check Node.js version
node --version

# Check logs
pm2 logs mechamap-realtime --lines 50

# Check environment
cat .env | grep -v "PASSWORD\|SECRET\|KEY"
```

**2. WebSocket connection fails**
```bash
# Check FastPanel proxy configuration
# Verify WebSocket support is enabled
# Check firewall settings
ufw status
```

**3. Database connection issues**
```bash
# Test database connection
mysql -u mechamap_user -p mechamap_db -e "SELECT 1"

# Check database configuration in .env
grep "DB_" .env
```

**4. SSL certificate issues**
```bash
# Check certificate validity
openssl s_client -connect realtime.yourdomain.com:443 -servername realtime.yourdomain.com

# Renew Let's Encrypt certificate via FastPanel
# Or use certbot directly if needed
```

**5. High memory usage**
```bash
# Check memory usage
pm2 monit

# Restart application
pm2 restart mechamap-realtime

# Check for memory leaks
node --max-old-space-size=4096 src/server.js
```

### Log Locations
- **Application logs**: `/home/mechamap/apps/mechamap_realtime/logs/`
- **PM2 logs**: `~/.pm2/logs/`
- **FastPanel logs**: `/var/log/fastpanel/`
- **Nginx logs**: `/var/log/nginx/`
- **System logs**: `/var/log/syslog`

### Useful Commands
```bash
# Restart services
pm2 restart mechamap-realtime
systemctl restart nginx

# Check service status  
pm2 status
systemctl status nginx
systemctl status mysql

# View real-time logs
pm2 logs mechamap-realtime --follow
tail -f logs/app.log

# Check connections
netstat -tulpn | grep :3000
ss -tulpn | grep :3000
```

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed and auto-renewing
- [ ] Strong passwords for database and admin
- [ ] Regular security updates enabled
- [ ] Non-root user for application
- [ ] PM2 process limits configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Backup system in place
- [ ] Monitoring and alerting set up

## Maintenance Schedule

**Daily:**
- Check application status
- Review error logs
- Verify backup completion

**Weekly:**
- Update system packages
- Review performance metrics
- Check disk space usage

**Monthly:**
- Update Node.js dependencies
- Review security logs
- Test backup restoration
- SSL certificate renewal check

---

## Support and Documentation

For additional help:
- Review the main documentation in `/docs/`
- Check Laravel integration guide: `/docs/LARAVEL_INTEGRATION.md`
- Monitor logs: `/logs/`
- Use testing scripts: `/tests/`

**Created**: October 8, 2025  
**Version**: 1.0  
**Maintainer**: MechaMap Development Team