# MechaMap Realtime - Production Deployment Summary

**Deployment Date**: November 10, 2025  
**Environment**: FastPanel VPS (36.50.27.10)  
**Status**: ✅ **LIVE & OPTIMIZED**

---

## 🎯 **Production Configuration**

### **Infrastructure**
- **VPS IP**: 36.50.27.10
- **Domain**: https://realtime.mechamap.com
- **SSL**: Let's Encrypt (expires Feb 8, 2026)
- **Reverse Proxy**: Nginx 1.28.0 with FastPanel
- **Process Manager**: PM2 v6.0.13 (cluster mode)

### **Project Identification**
- **Project ID**: 70 (per VPS port allocation strategy)
- **Internal Port**: 7000
- **Port Range**: 70-79 (reserved for internal tools)

### **Server Specifications**
- **Node.js**: v20.19.5
- **Workers**: 3 cluster workers (PIDs: 1111648, 1111649, 1111663)
- **Memory per Worker**: 256MB max heap (--max-old-space-size=256)
- **GC Interval**: 100000ms (100s)
- **Total Memory Usage**: ~278MB (75-103MB per worker)

### **System Resources**
- **RAM**: 8GB total, 4.2GB available
- **Swap**: 2GB (swappiness=10, emergency only)
- **CPU**: 4 cores, load average 0.10-0.14
- **Disk**: 82GB total, 53GB free

---

## 🔧 **Key Optimizations Applied**

### **1. Port Configuration**
- Changed from port 3000 → 7000
- Aligned with project-manager port allocation rules
- Updated ecosystem.config.js and .env.production

### **2. Memory Optimization**
```
Before: 2048MB → Heap usage 91-95%, HIGH_MEMORY alerts
After:  256MB  → Heap usage ~47%, 0 alerts
```

**Changes:**
- `max-old-space-size`: 2048MB → 256MB
- `GC_INTERVAL`: 600000ms → 100000ms
- Added `--gc-interval=100` flag

### **3. WebSocket Proxy**
- Created `/etc/nginx/fastpanel2-sites/realtime_mec_usr/realtime.mechamap.com.includes`
- Added WebSocket headers: `Upgrade`, `Connection "upgrade"`
- Set `proxy_http_version 1.1`
- Fixed TRANSPORT_HANDSHAKE_ERROR issues

### **4. Production Mode**
- `MOCK_LARAVEL_API`: true → false
- Connected to real Laravel API: https://mechamap.com
- Sanctum authentication enabled
- Successful user connections observed

### **5. Swap File**
- Created 2GB swap file at `/swapfile`
- Swappiness: 10 (only use when RAM > 90%)
- Auto-mount configured in `/etc/fstab`
- Provides OOM protection for traffic spikes

---

## 📊 **Current Status**

### **PM2 Process**
```bash
pm2 list
# mechamap-realtime-prod | 3 workers | online | 0 restarts
```

### **Health Check**
```bash
curl https://realtime.mechamap.com/health
# {"status":"healthy","environment":"production","uptime":"XXs"}
```

### **WebSocket Connection**
```javascript
// Successful connection
Socket ID: eYSpfd6U7z4_sAeRAAAB
User: { id: 1, role: 'senior' }
Authentication: Sanctum token verified
```

### **Memory Usage**
```
Worker 1 (PID 1111648): 103MB RSS
Worker 2 (PID 1111649): 100MB RSS  
Worker 3 (PID 1111663): 75MB RSS
Total: ~278MB (stable, no HIGH_MEMORY alerts)
```

---

## 🔐 **Security Configuration**

### **Database**
- **Host**: localhost
- **Database**: mechamap_db
- **User**: mechamap_user
- **Connection Pool**: 20 connections
- **Timeout**: 60000ms

### **Authentication**
- **Laravel API**: https://mechamap.com
- **API Key**: mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3
- **JWT Secret**: (configured in .env.production)
- **JWT Expires**: 1h

### **CORS**
```
Allowed Origins:
- https://mechamap.com
- https://www.mechamap.com
- https://realtime.mechamap.com
- http://mechamap.test
- https://mechamap.test
```

### **Rate Limiting**
- Window: 60000ms (1 minute)
- Max Requests: 100 per window
- Skip Successful Requests: false

---

## 🚀 **Deployment Commands**

### **Start/Restart**
```bash
cd /home/lifetechadmin/opt/mechamap_realtime
pm2 restart ecosystem.config.js --env production --update-env
```

### **Monitor**
```bash
pm2 monit
pm2 logs mechamap-realtime-prod
pm2 status
```

### **Stop**
```bash
pm2 stop mechamap-realtime-prod
```

### **View Logs**
```bash
# Real-time logs
pm2 logs mechamap-realtime-prod --lines 100

# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log
```

---

## 📁 **Modified Files**

### **1. ecosystem.config.js**
```javascript
env_production: {
  NODE_ENV: 'production',
  PORT: 7000,  // Changed from 3000
  // Memory optimizations
  max_memory_restart: '256M',  // Changed from 2048M
  memory_limit: '256M',
  node_args: '--max-old-space-size=256 --gc-interval=100'
}
```

### **2. .env.production**
```bash
PORT=7000                # Changed from 3000
MOCK_LARAVEL_API=false   # Changed from true
MEMORY_LIMIT=256         # Changed from 3072 → 512 → 256
GC_INTERVAL=100000       # Changed from 600000
```

### **3. project-info.json** (NEW)
```json
{
  "name": "mechamap_realtime",
  "type": "internal-tools",
  "projectId": 70,
  "port": 7000,
  "portRange": "70-79",
  "description": "MechaMap Real-time WebSocket Server"
}
```

### **4. Nginx Configuration** (outside repo)
```nginx
# /etc/nginx/fastpanel2-sites/realtime_mec_usr/realtime.mechamap.com.includes
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400;
proxy_send_timeout 86400;
```

---

## 🔍 **Monitoring & Alerts**

### **Key Metrics to Monitor**
1. **Memory**: Should stay < 500MB total (278MB current)
2. **CPU**: Load average < 2.0 (0.10-0.14 current)
3. **WebSocket Connections**: Track concurrent users
4. **Error Rate**: Should be < 1%
5. **Swap Usage**: Should stay at 0B (only for emergencies)

### **Alert Thresholds**
```
CRITICAL:
- Memory > 600MB per worker → Possible memory leak
- Swap usage > 500MB → System under pressure
- Error rate > 5% → Application issues

WARNING:
- Memory > 400MB per worker
- CPU load > 1.5
- WebSocket errors > 10/minute
```

### **Health Check Endpoints**
```bash
# Server health
curl https://realtime.mechamap.com/health

# Metrics (if enabled)
curl https://realtime.mechamap.com/metrics
```

---

## 📝 **Production Checklist**

### **Deployment Completed**
- ✅ Git repository cloned from main branch
- ✅ Project ID assigned (70) with port 7000
- ✅ Dependencies installed (1589 packages)
- ✅ PM2 cluster started (3 workers)
- ✅ Nginx WebSocket proxy configured
- ✅ SSL certificate verified (Let's Encrypt)
- ✅ Production mode enabled (real Laravel API)
- ✅ Memory optimized (heap 91% → 47%)
- ✅ Swap file created (2GB with swappiness=10)
- ✅ PM2 configuration saved

### **Verified Working**
- ✅ Domain resolves: realtime.mechamap.com → 36.50.27.10
- ✅ SSL works: HTTPS on port 443
- ✅ WebSocket connections successful
- ✅ Sanctum authentication working
- ✅ Health check endpoint responding
- ✅ All 3 workers stable
- ✅ No memory warnings
- ✅ Logs writing correctly

---

## 🎓 **Lessons Learned**

### **1. Branch Selection**
- **main** branch has clustering optimizations
- **production** branch lacks PM2 cluster features
- **Decision**: Deployed from main branch

### **2. Memory Management**
- Initial 2048MB heap size was excessive
- Optimized to 256MB with aggressive GC
- Result: 91% heap → 47% heap, 0 alerts

### **3. FastPanel WebSocket**
- Requires explicit Nginx includes file
- Must set `proxy_http_version 1.1`
- Must include `Upgrade` and `Connection` headers

### **4. Port Strategy**
- VPS uses project-manager port allocation
- Project ID 70 → port 7000
- Comment in .env about port 3000 was misleading

---

## 🔄 **Maintenance Tasks**

### **Daily**
- Check PM2 status: `pm2 status`
- Review error logs: `pm2 logs --err --lines 50`

### **Weekly**
- Monitor memory usage: `free -h`
- Check disk space: `df -h`
- Review application logs: `tail -n 100 logs/app.log`

### **Monthly**
- Update dependencies: `npm outdated && npm update`
- Review security: `npm audit`
- Rotate logs: `pm2 flush`

### **As Needed**
- SSL renewal: Auto-renewed by Let's Encrypt
- Git pull: `git pull origin main && pm2 restart ecosystem.config.js`
- Database migrations: Coordinate with Laravel backend

---

## 🆘 **Troubleshooting**

### **WebSocket Connection Fails**
```bash
# Check Nginx config
sudo nginx -t
sudo systemctl reload nginx

# Check WebSocket headers
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  https://realtime.mechamap.com/socket.io/
```

### **High Memory Usage**
```bash
# Check worker memory
pm2 monit

# Restart if needed
pm2 restart mechamap-realtime-prod
```

### **Application Errors**
```bash
# View detailed logs
pm2 logs mechamap-realtime-prod --lines 200

# Check error log
tail -f logs/error.log
```

### **Database Connection Issues**
```bash
# Test MySQL connection
mysql -h localhost -u mechamap_user -p mechamap_db

# Check connection pool
pm2 logs mechamap-realtime-prod | grep -i "database\|mysql"
```

---

## 📞 **Support Information**

- **Repository**: https://github.com/ptnghia/mechamap_realtime
- **Laravel API**: https://mechamap.com
- **Domain**: https://realtime.mechamap.com
- **VPS IP**: 36.50.27.10

---

**Last Updated**: November 10, 2025  
**Deployment Status**: ✅ Production Ready & Optimized
