# MechaMap Realtime Server

Node.js WebSocket server cho hệ thống real-time notification của MechaMap.

## 🚀 Tính năng

- **WebSocket Server**: Socket.IO với SSL/TLS support
- **JWT Authentication**: Tích hợp với Laravel backend
- **Channel Management**: Private user channels với authorization
- **Real-time Broadcasting**: Instant notification delivery
- **Laravel Integration**: REST API cho notification broadcasting
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

## 📊 Monitoring

### Health Check
```bash
curl https://localhost:3000/health
```

### Metrics
```bash
curl https://localhost:3000/metrics
```

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
  }
}
```

## 🔐 Security

- JWT token authentication
- CORS protection
- Rate limiting
- Helmet security headers
- SSL/TLS encryption
- Input validation

## 📁 Cấu trúc thư mục

```
realtime-server/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── websocket/       # WebSocket handlers
│   ├── services/        # Business logic
│   ├── integrations/    # External integrations
│   ├── utils/           # Utility functions
│   └── routes/          # REST API routes
├── tests/               # Test suites
├── deployment/          # Deployment configs
└── docs/                # Documentation
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
