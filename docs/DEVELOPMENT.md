# Hướng dẫn Development - MechaMap Realtime Server

Tài liệu này cung cấp hướng dẫn chi tiết cho developers về cách setup, develop và test MechaMap Realtime Server.

## 🛠️ Setup Development Environment

### Yêu cầu hệ thống

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **MySQL**: >= 8.0 (chia sẻ với Laravel backend)
- **Redis**: >= 6.0 (tùy chọn, cho caching)
- **Git**: Để clone repository

### Cài đặt từ đầu

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

4. **Chỉnh sửa file `.env` cho development:**
```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database Configuration (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mechamap_dev
DB_USER=root
DB_PASSWORD=your_password
DB_CONNECTION_LIMIT=10
DB_TIMEOUT=30000

# Laravel Integration
LARAVEL_API_URL=http://localhost:8000
LARAVEL_API_KEY=your-dev-api-key

# JWT Configuration
JWT_SECRET=your-development-jwt-secret-key
JWT_EXPIRES_IN=1h
JWT_ALGORITHM=HS256

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:8000
CORS_CREDENTIALS=true

# SSL Configuration (Development)
SSL_ENABLED=false

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Development Settings
DEBUG_MODE=true
VERBOSE_LOGGING=true
LOG_LEVEL=debug

# Rate Limiting (Relaxed for development)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Connection Limits (Lower for development)
MAX_CONNECTIONS=100
MAX_CONNECTIONS_PER_USER=10
```

5. **Khởi động development server:**
```bash
npm run dev
```

6. **Kiểm tra server:**
```bash
curl http://localhost:3000/api/health
```

## 🏗️ Cấu trúc Code

### Kiến trúc tổng quan

```
src/
├── config/                   # Cấu hình ứng dụng
│   └── index.js             # Load và validate environment variables
├── middleware/              # Express middleware
│   ├── auth.js              # Authentication (Sanctum + JWT)
│   ├── cors.js              # CORS configuration
│   ├── monitoring.js        # Request monitoring
│   └── rateLimiter.js       # Rate limiting
├── routes/                  # API routes
│   ├── api.js               # Main API endpoints
│   ├── broadcast.js         # Broadcasting endpoints
│   └── monitoring.js        # Monitoring endpoints
├── services/                # Business logic
│   ├── authService.js       # Authentication logic
│   ├── broadcastService.js  # Message broadcasting
│   └── monitoringService.js # System monitoring
├── utils/                   # Utility functions
│   ├── logger.js            # Winston logger setup
│   └── validator.js         # Input validation
├── websocket/               # WebSocket handling
│   ├── channelManager.js    # Channel subscription management
│   └── socketHandler.js     # Socket.IO event handlers
├── app.js                   # Application entry point
└── server.js                # HTTP/HTTPS server setup
```

### Key Components

#### 1. Authentication Service (`src/services/authService.js`)
- Xử lý Laravel Sanctum tokens
- JWT token validation
- User permission checking
- Token caching

#### 2. WebSocket Handler (`src/websocket/socketHandler.js`)
- Socket.IO connection management
- Channel subscription/unsubscription
- Real-time message delivery
- Connection cleanup

#### 3. Monitoring Service (`src/services/monitoringService.js`)
- Health checks
- Performance metrics collection
- Alert threshold monitoring
- System resource tracking

#### 4. Broadcasting Service (`src/services/broadcastService.js`)
- Message routing to channels
- User targeting
- Delivery confirmation
- Message queuing

## 🔧 Development Scripts

### Available Scripts

```bash
# Development với auto-reload
npm run dev

# Production start
npm start

# Linting
npm run lint

# Format code
npm run format

# Test (nếu có)
npm test

# PM2 commands
npm run pm2:start
npm run pm2:stop
npm run pm2:restart
npm run pm2:logs
```

### Custom Scripts

Thêm vào `package.json`:

```json
{
  "scripts": {
    "dev:debug": "DEBUG=* npm run dev",
    "dev:verbose": "LOG_LEVEL=debug npm run dev",
    "test:api": "./test-system.sh",
    "logs:tail": "tail -f logs/combined.log",
    "db:test": "node scripts/test-db-connection.js"
  }
}
```

## 🧪 Testing & Debugging

### Manual Testing

1. **Health Check:**
```bash
curl http://localhost:3000/api/health
```

2. **WebSocket Connection:**
```javascript
// Trong browser console
const socket = io('http://localhost:3000', {
  query: { token: 'your-test-token' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.emit('subscribe', { channel: 'private-user.123' });
```

3. **Broadcasting Test:**
```bash
curl -X POST http://localhost:3000/api/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "channel": "private-user.123",
    "event": "test.message",
    "data": {"message": "Hello World"}
  }'
```

### System Test Script

```bash
# Chạy test tổng hợp
./test-system.sh
```

### Debug Mode

Bật debug mode trong `.env`:
```env
DEBUG_MODE=true
VERBOSE_LOGGING=true
LOG_LEVEL=debug
```

Hoặc chạy với debug flags:
```bash
DEBUG=* npm run dev
```

### Log Analysis

```bash
# Xem logs real-time
tail -f logs/combined.log

# Filter error logs
grep -i error logs/combined.log

# WebSocket connection logs
grep -i "socket\|websocket" logs/combined.log
```

## 🔌 API Development

### Thêm API Endpoint mới

1. **Tạo route trong `src/routes/`:**
```javascript
// src/routes/myNewRoute.js
const express = require('express');
const router = express.Router();

router.get('/my-endpoint', (req, res) => {
  res.json({ message: 'Hello from new endpoint' });
});

module.exports = router;
```

2. **Register route trong `src/app.js`:**
```javascript
const myNewRoute = require('./routes/myNewRoute');
app.use('/api', myNewRoute);
```

### Thêm WebSocket Event mới

1. **Trong `src/websocket/socketHandler.js`:**
```javascript
// Handle new event
socket.on('my-new-event', (data) => {
  console.log('Received my-new-event:', data);
  
  // Process data
  const result = processMyEvent(data);
  
  // Send response
  socket.emit('my-new-event-response', result);
});
```

2. **Test event:**
```javascript
// Client side
socket.emit('my-new-event', { test: 'data' });

socket.on('my-new-event-response', (data) => {
  console.log('Response:', data);
});
```

## 🔒 Security Development

### Authentication Testing

1. **Test với Sanctum token:**
```bash
# Lấy token từ Laravel
TOKEN=$(curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token')

# Test với token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/broadcast
```

2. **Test JWT token:**
```javascript
// Generate test JWT
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { user_id: 123, role: 'user' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Test WebSocket với JWT
const socket = io('http://localhost:3000', {
  query: { jwt: token }
});
```

### CORS Testing

```bash
# Test CORS preflight
curl -X OPTIONS http://localhost:3000/api/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

## 📊 Performance Development

### Monitoring trong Development

1. **Enable metrics:**
```env
METRICS_ENABLED=true
PROMETHEUS_METRICS=true
```

2. **Check performance:**
```bash
curl http://localhost:3000/api/monitoring/performance
```

### Memory Profiling

```bash
# Chạy với memory profiling
node --inspect src/app.js

# Hoặc với heap snapshot
node --heapsnapshot-signal=SIGUSR2 src/app.js
```

### Load Testing trong Development

```bash
# Cài đặt Artillery
npm install -g artillery

# Tạo test config
cat > dev-load-test.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 30
      arrivalRate: 5
scenarios:
  - name: "Dev load test"
    requests:
      - get:
          url: "/api/health"
EOF

# Chạy test
artillery run dev-load-test.yml
```

## 🔄 Hot Reload & Development Workflow

### Nodemon Configuration

File `nodemon.json`:
```json
{
  "watch": ["src/"],
  "ext": "js,json",
  "ignore": ["logs/", "node_modules/"],
  "exec": "node src/app.js",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### Development Workflow

1. **Bắt đầu development:**
```bash
npm run dev
```

2. **Thực hiện thay đổi code**

3. **Server tự động restart** (nhờ nodemon)

4. **Test thay đổi:**
```bash
curl http://localhost:3000/api/health
```

5. **Commit changes:**
```bash
git add .
git commit -m "feat: add new feature"
```

## 🐛 Common Development Issues

### 1. Port đã được sử dụng
```bash
# Tìm process sử dụng port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### 2. Database connection failed
```bash
# Test MySQL connection
mysql -h localhost -u root -p mechamap_dev

# Check environment variables
echo $DB_HOST $DB_USER $DB_NAME
```

### 3. WebSocket connection issues
```javascript
// Enable Socket.IO debug
localStorage.debug = 'socket.io-client:socket';

// Check connection in browser
const socket = io('http://localhost:3000', {
  forceNew: true,
  transports: ['websocket']
});
```

### 4. CORS errors
```env
# Thêm origin vào CORS_ORIGIN
CORS_ORIGIN=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000
```

## 📝 Code Style & Standards

### ESLint Configuration

File `.eslintrc.js`:
```javascript
module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always']
  }
};
```

### Prettier Configuration

File `.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Git Hooks

File `.husky/pre-commit`:
```bash
#!/bin/sh
npm run lint
npm run format
```

## 🚀 Deployment từ Development

### Build cho Production

```bash
# Clean install production dependencies
npm ci --production

# Copy production environment
cp .env.production .env

# Test production build
NODE_ENV=production node src/app.js
```

### Pre-deployment Checklist

- [ ] Code đã được test đầy đủ
- [ ] Linting passed
- [ ] No console.log statements
- [ ] Environment variables updated
- [ ] Database migrations completed
- [ ] Performance tested

## 📚 Resources & Documentation

### Useful Links

- [Socket.IO Documentation](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Winston Logger](https://github.com/winstonjs/winston)

### Internal Documentation

- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Monitoring Guide](MONITORING.md)

### Development Tools

- **VS Code Extensions:**
  - ESLint
  - Prettier
  - REST Client
  - GitLens

- **Browser Extensions:**
  - Socket.IO Client Tool
  - JSON Formatter
  - CORS Unblock (for development)

Happy coding! 🎉
