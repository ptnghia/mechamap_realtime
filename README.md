# MechaMap Realt## ⚡ **Core Features**

- **🔌 Real-time WebSocket**: Socket.IO với SSL/TLS support
- **🔐 Laravel Integration**: Sanctum authentication + API key security
- **📱 Multi-device Support**: Concurrent connections per user
- **🎯 Channel Broadcasting**: Private user channels + public broadcasts
- **📊 Production Monitoring**: Health checks, metrics, logging
- **⚡ High Performance**: PM2 clustering (3 workers), Redis session store
- **🚀 Scalable Architecture**: Supports 200+ concurrent users
- **🛡️ Enterprise Security**: CORS, rate limiting, SSL encryptionr

🔌 **Production-Ready WebSocket Server** cho MechaMap Community Platform

Server WebSocket thời gian thực được xây dựng bằng Node.js, tích hợp với Laravel backend để cung cấp tính năng real-time cho cộng đồng kỹ sư cơ khí Việt Nam.

## 🎯 **Production Architecture**

```
Frontend: https://mechamap.com (Hosting)
    ↓ WebSocket HTTPS:443
Realtime: https://realtime.mechamap.com (VPS)
    ↓ API Calls HTTPS
Backend: https://mechamap.com/api (Laravel)
```

## 🚀 **Core Features**

- **🔌 Real-time WebSocket**: Socket.IO với SSL/TLS support
- **🔐 Laravel Integration**: Sanctum authentication + API key security
- **📱 Multi-device Support**: Concurrent connections per user
- **🎯 Channel Broadcasting**: Private user channels + public broadcasts
- **📊 Production Monitoring**: Health checks, metrics, logging
- **⚡ High Performance**: PM2 clustering, connection pooling
- **🛡️ Enterprise Security**: CORS, rate limiting, SSL encryption

## ⚡ **Quick Start**

### **System Requirements**

- **Node.js**: >= 18.0.0
- **Database**: MySQL 8.0+ (shared with Laravel) 
- **SSL**: Let's Encrypt certificates (production)
- **Memory**: 4GB+ RAM recommended (for 200+ concurrent users)
- **CPU**: 4+ cores recommended for clustering
- **Redis**: Required for session store in cluster mode

### **Production Deployment**

```bash
# 1. Clone to VPS
git clone https://github.com/ptnghia/mechamap_realtime.git
cd mechamap_realtime

# 2. Install dependencies
npm install --production

# 3. Setup production environment
# .env.production is already configured for FastPanel + clustering

# 4. Create logs directory
mkdir -p logs

# 5. Start with PM2 clustering (3 workers)
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save

# 6. Verify cluster status
pm2 list
pm2 monit
```

### **Development Setup**

```bash
# 1. Install dependencies
npm install

# 2. Setup development config
cp .env.development .env

# 3. Start development server
npm run dev
```

## 📁 **Project Structure**

```
realtime-server/
├── src/
│   ├── app.js              # 🚀 Main entry point
│   ├── server.js           # ⚙️ Express server setup
│   ├── websocket/          # 🔌 WebSocket handlers
│   │   ├── socketHandler.js
│   │   └── events/
│   ├── services/           # 🔧 Business logic
│   │   ├── authService.js
│   │   ├── notificationService.js
│   │   └── userService.js
│   ├── middleware/         # 🛡️ Security & validation
│   │   ├── auth.js
│   │   ├── cors.js
│   │   └── rateLimit.js
│   ├── routes/             # 🌐 API endpoints
│   │   ├── health.js
│   │   └── webhook.js
│   ├── config/             # ⚙️ Configuration
│   │   ├── database.js
│   │   └── winston.js
│   └── utils/              # 🔨 Utilities
│       ├── logger.js
│       └── helpers.js
├── tests/                  # 🧪 Test suites
├── docs/                   # 📚 Documentation
├── deployment/             # 🚀 Deployment configs
├── ssl/                    # 🔒 SSL certificates
├── logs/                   # 📝 Application logs
├── .env.development       # 🔧 Development config
├── .env.production        # 🏭 Production config
├── ecosystem.config.js    # 🔄 PM2 configuration
└── package.json           # 📦 Dependencies
```

## ⚙️ **Configuration**

### **Environment Variables**

#### **Production (.env.production) - FastPanel + Clustering**
```bash
# Server Configuration - FastPanel Setup
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DOMAIN=realtime.mechamap.com

# SSL Configuration - DISABLED (FastPanel handles SSL)
SSL_ENABLED=false
TRUST_PROXY=true

# Performance - Clustering for 200+ users
CLUSTER_ENABLED=true
CLUSTER_WORKERS=3
MEMORY_LIMIT=3072

# Laravel Integration
LARAVEL_API_URL=https://mechamap.com
LARAVEL_API_KEY=mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3

# Database - Optimized for high concurrency
DB_HOST=localhost
DB_NAME=mechamap_db
DB_USER=mechamap_user
DB_CONNECTION_LIMIT=60
DB_TIMEOUT=30000

# Redis - Required for clustering
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_SESSION_STORE=true
REDIS_ADAPTER_ENABLED=true

# Rate Limiting - Optimized for multiple users
RATE_LIMIT_MAX_REQUESTS=300
RATE_LIMIT_WINDOW_MS=60000

# WebSocket - Tuned for high concurrency
WS_PING_TIMEOUT=30000
WS_PING_INTERVAL=15000
MAX_CONNECTIONS=5000
MAX_CONNECTIONS_PER_USER=5

# Security
CORS_ORIGIN=https://mechamap.com,https://www.mechamap.com,https://realtime.mechamap.com
JWT_SECRET=your_jwt_secret_synchronized_with_laravel

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
PROMETHEUS_METRICS=true
```

#### **Development (.env.development)**
```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# SSL Configuration
SSL_ENABLED=false

# Laravel Integration
LARAVEL_API_URL=https://mechamap.test
LARAVEL_API_KEY=your_development_api_key

# Database
DB_HOST=localhost
DB_NAME=mechamap_db
DB_USER=mechamap_user
DB_PASSWORD=your_password

# Security
CORS_ORIGIN=https://mechamap.test,http://mechamap.test,http://localhost:8000
JWT_SECRET=your_jwt_secret

# Monitoring
LOG_LEVEL=debug
ENABLE_METRICS=true
```

## 🚀 **Deployment**

### **Production VPS Setup**

1. **Server Requirements**
   ```bash
   # Ubuntu 20.04+ / CentOS 8+
   # 2GB+ RAM, 2+ CPU cores
   # 20GB+ storage
   ```

2. **Install Dependencies**
   ```bash
   # Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # PM2
   sudo npm install -g pm2
   
   # Nginx
   sudo apt install nginx
   
   # Certbot
   sudo apt install certbot python3-certbot-nginx
   ```

3. **SSL Certificate Setup**
   ```bash
   sudo certbot certonly --nginx -d realtime.mechamap.com
   ```

4. **Nginx Configuration**
   ```nginx
   # /etc/nginx/sites-available/realtime.mechamap.com
   server {
       listen 80;
       server_name realtime.mechamap.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name realtime.mechamap.com;
       
       ssl_certificate /etc/letsencrypt/live/realtime.mechamap.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/realtime.mechamap.com/privkey.pem;
       
       location / {
           proxy_pass https://localhost:443;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Start Production Server**
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 startup
   pm2 save
   ```

## 📊 **Monitoring & Health Checks**

### **Health Endpoints**

- **Health Check**: `GET /health`
- **Metrics**: `GET /metrics`
- **Status**: `GET /status`

### **Monitoring Commands**

```bash
# Check server status
pm2 status

# View logs
pm2 logs mechamap-realtime

# Monitor resources
pm2 monit

# Restart server
pm2 restart mechamap-realtime
```

## ⚡ **Performance & Scaling**

### **Current Production Capacity**

| **Metric** | **Value** | **Configuration** |
|------------|-----------|-------------------|
| **Concurrent Users** | 200-300 | 3 cluster workers |
| **Memory Usage** | ~300MB | 100MB per worker |
| **CPU Utilization** | 75% | 3/4 cores used |
| **DB Connections** | 60 | 20 per worker |
| **Rate Limit** | 300/min | Per user limit |
| **WebSocket Connections** | 5,000 | System-wide limit |

### **PM2 Cluster Configuration**

```javascript
// ecosystem.config.js - Production
{
  name: 'mechamap-realtime-prod',
  script: './src/app.js',
  instances: 3,              // 3 cluster workers
  exec_mode: 'cluster',      // Enable clustering
  max_memory_restart: '2048M', // Auto-restart at 2GB
  node_args: '--max-old-space-size=2048',
}
```

### **Scaling Guidelines**

**For 500+ Users:**
- Increase `CLUSTER_WORKERS` to 4-6
- Add Redis Clustering
- Implement horizontal scaling with load balancer
- Consider database read replicas

**For 1000+ Users:**
- Deploy multiple server instances
- Use Nginx load balancing
- Implement CDN for static assets
- Monitor and optimize database queries

## 🔧 **Development**

### **Available Scripts**

```bash
npm run dev               # Start development server
npm run start            # Start production server  
npm run start:production # Start with production env
npm run test             # Run test suite
npm run lint             # Run ESLint
npm run test:watch       # Run tests in watch mode
npm run pm2:start        # Start with PM2
npm run pm2:logs         # View PM2 logs
npm run health           # Check health endpoint
npm run metrics          # View metrics
```

### **Testing**

```bash
# Run all tests
npm test

# Run specific test
npm test -- --grep "WebSocket"

# Run with coverage
npm run test:coverage
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **SSL Certificate Errors**
   ```bash
   # Check certificate validity
   sudo certbot certificates
   
   # Renew certificates
   sudo certbot renew
   ```

2. **Port Already in Use**
   ```bash
   # Find process using port
   sudo lsof -i :443
   
   # Kill process
   sudo kill -9 PID
   ```

3. **Database Connection Issues**
   ```bash
   # Test database connection
   mysql -h localhost -u mechamap_user -p mechamap_production
   ```

### **Logs Location**

- **Application Logs**: `logs/app.log`
- **Error Logs**: `logs/error.log`
- **PM2 Logs**: `~/.pm2/logs/`

## 📚 **Documentation**

- **[API Documentation](docs/API.md)** - WebSocket events and HTTP endpoints
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Detailed deployment instructions
- **[Laravel Integration](docs/LARAVEL_INTEGRATION.md)** - Backend integration guide
- **[Monitoring Guide](docs/MONITORING.md)** - Production monitoring setup

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

- **Issues**: [GitHub Issues](https://github.com/your-repo/mechamap-realtime/issues)
- **Documentation**: [Wiki](https://github.com/your-repo/mechamap-realtime/wiki)
- **Email**: support@mechamap.com

---

**Made with ❤️ for MechaMap Community Platform**
