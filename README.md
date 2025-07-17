# MechaMap Realtime Server

Node.js WebSocket server cho hệ thống real-time notification của MechaMap.

## 🚀 Tính năng

- **WebSocket Server**: Socket.IO với SSL/TLS support
- **JWT Authentication**: Tích hợp với Laravel Sanctum backend
- **Channel Management**: Private user channels với authorization
- **Real-time Broadcasting**: Instant notification delivery
- **Laravel Integration**: REST API cho notification broadcasting
- **Advanced Monitoring**: Real-time metrics, health checks, alerting system
- **Prometheus Integration**: Metrics export cho external monitoring tools
- **Comprehensive Testing**: Unit tests, integration tests, load testing
- **Production Ready**: PM2 clustering, monitoring, health checks

## 📋 Yêu cầu hệ thống

- Node.js >= 18.0.0
- npm >= 8.0.0
- MySQL database (shared với Laravel)
- Redis server (optional, cho caching)
- SSL certificates (Let's Encrypt cho production)

## 🛠️ Cài đặt

### 1. Clone và setup
```bash
cd mechamap_backend/realtime-server
npm install
```

### 2. Cấu hình environment
```bash
cp .env.example .env
# Chỉnh sửa .env với thông tin database và JWT secret
```

### 3. Tạo SSL certificates cho development
```bash
npm run ssl:generate
```

### 4. Khởi chạy server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `SSL_ENABLED` | Enable HTTPS/WSS | `true` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_NAME` | Database name | `mechamap_backend` |
| `JWT_SECRET` | JWT secret key | Required |
| `LARAVEL_API_URL` | Laravel backend URL | Required |
| `ADMIN_KEY` | Admin key cho monitoring endpoints | Optional |
| `REDIS_HOST` | Redis host cho caching | Optional |
| `REDIS_PORT` | Redis port | `6379` |

### SSL Configuration

**Development:**
- Self-signed certificates trong `deployment/ssl/`
- Tự động generate với `npm run ssl:generate`

**Production:**
- Let's Encrypt certificates
- Path: `/etc/letsencrypt/live/realtime.mechamap.com/`

## 🧪 Testing

```bash
# Chạy tất cả tests
npm test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Load testing
npm run test:load

# Test coverage
npm run test:coverage
```

## 📊 Monitoring & Metrics

### Health Check Endpoints
```bash
# Basic health check
curl http://localhost:3000/api/health

# Comprehensive health check với monitoring data
curl http://localhost:3000/api/monitoring/health
```

### Metrics Endpoints
```bash
# Basic metrics
curl http://localhost:3000/api/metrics

# Detailed monitoring metrics
curl http://localhost:3000/api/monitoring/metrics

# Performance summary
curl http://localhost:3000/api/monitoring/performance

# Connection statistics
curl http://localhost:3000/api/monitoring/connections

# Active alerts
curl http://localhost:3000/api/monitoring/alerts

# Prometheus-compatible metrics
curl http://localhost:3000/api/monitoring/prometheus
```

### Admin Endpoints (Require ADMIN_KEY)
```bash
# Reset metrics
curl -X POST http://localhost:3000/api/monitoring/reset \
  -H "X-Admin-Key: your-admin-key"

# Update alert thresholds
curl -X PUT http://localhost:3000/api/monitoring/thresholds \
  -H "X-Admin-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"connections": {"max": 1000}, "responseTime": {"max": 500}}'
```

### Real-time Monitoring Features
- **Connection Tracking**: Total, active, peak connections by user role
- **Authentication Metrics**: Success/failure rates by method (Sanctum, JWT)
- **Performance Monitoring**: Response times, request counts, error rates
- **Channel Monitoring**: Subscriptions, message delivery rates
- **Alert System**: Configurable thresholds với real-time notifications
- **Health Checks**: Automated system health monitoring

### PM2 Monitoring
```bash
npm run pm2:logs
pm2 monit
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production với PM2
```bash
npm run pm2:start
```

### Docker
```bash
docker build -t mechamap-realtime .
docker run -p 3000:3000 mechamap-realtime
```

## 📡 API Endpoints

### WebSocket Events

**Client → Server:**
- `subscribe`: Subscribe to channel
- `unsubscribe`: Unsubscribe from channel
- `notification_read`: Mark notification as read
- `ping`: Heartbeat

**Server → Client:**
- `subscribed`: Subscription confirmation
- `notification.sent`: New notification
- `notification.read`: Notification read by other device
- `pong`: Heartbeat response

### REST API

**POST /api/broadcast**
```json
{
  "channel": "private-user.123",
  "event": "notification.sent",
  "data": {
    "title": "New Notification",
    "message": "You have a new message"
  },
  "auth_token": "laravel-sanctum-token"
}
```

**GET /api/health** - Basic health check
**GET /api/status** - Server status information
**GET /api/metrics** - Basic server metrics

### Monitoring API

**GET /api/monitoring/health** - Comprehensive health check
**GET /api/monitoring/metrics** - Detailed monitoring metrics
**GET /api/monitoring/performance** - Performance summary
**GET /api/monitoring/connections** - Connection statistics
**GET /api/monitoring/alerts** - Active alerts
**GET /api/monitoring/prometheus** - Prometheus metrics format
**GET /api/monitoring/info** - Server information

**POST /api/monitoring/reset** - Reset metrics (Admin only)
**PUT /api/monitoring/thresholds** - Update alert thresholds (Admin only)

## 🔐 Security

- **Laravel Sanctum Integration**: Seamless authentication với Laravel backend
- **JWT Token Support**: Fallback authentication method
- **CORS Protection**: Configurable cross-origin resource sharing
- **Rate Limiting**: Request throttling để prevent abuse
- **Helmet Security Headers**: Comprehensive HTTP security headers
- **SSL/TLS Encryption**: HTTPS/WSS support với Let's Encrypt
- **Input Validation**: Express-validator cho API endpoints
- **Admin Authentication**: Secure admin endpoints với API keys

## 📁 Cấu trúc thư mục

```
realtime-server/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware & monitoring
│   │   ├── auth.js      # Authentication middleware
│   │   ├── monitoring.js # Real-time monitoring system
│   │   └── index.js     # Middleware setup
│   ├── websocket/       # WebSocket handlers
│   ├── services/        # Business logic services
│   ├── integrations/    # External integrations (Laravel)
│   ├── utils/           # Utility functions & logger
│   ├── routes/          # REST API routes
│   │   ├── index.js     # Main routes
│   │   ├── broadcast.js # Broadcasting endpoints
│   │   └── monitoring.js # Monitoring API endpoints
│   ├── app.js           # Application entry point
│   └── server.js        # Server setup & configuration
├── tests/               # Test suites
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── load/            # Load testing
├── deployment/          # Deployment configs
│   ├── pm2/             # PM2 configurations
│   ├── nginx/           # Nginx configurations
│   └── ssl/             # SSL certificates
├── docs/                # Documentation
└── logs/                # Application logs
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Write tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- Documentation: `./docs/`
- Issues: GitHub Issues
- Email: dev@mechamap.com
