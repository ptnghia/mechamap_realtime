# MechaMap Realtime Server

Server WebSocket thời gian thực được xây dựng bằng Node.js cho ứng dụng MechaMap. Server này xử lý thông báo thời gian thực, trạng thái người dùng và cập nhật trực tiếp sử dụng Socket.IO.

## 🚀 Tính năng chính

- **Giao tiếp WebSocket thời gian thực**: Xây dựng với Socket.IO cho việc nhắn tin thời gian thực đáng tin cậy
- **Tích hợp Laravel**: Tích hợp liền mạch với Laravel backend sử dụng Sanctum authentication
- **Hỗ trợ đa thiết bị**: Người dùng có thể kết nối từ nhiều thiết bị cùng lúc
- **Nhắn tin theo kênh**: Kênh người dùng riêng tư và khả năng broadcast
- **Giám sát toàn diện**: Health checks tích hợp, metrics và giám sát hiệu suất
- **Sẵn sàng Production**: PM2 clustering, hỗ trợ SSL và xử lý lỗi mạnh mẽ
- **Bảo mật**: Bảo vệ CORS, rate limiting và authentication middleware

## ⚡ Bắt đầu nhanh

### Yêu cầu hệ thống

- Node.js >= 18.0.0
- npm hoặc yarn
- MySQL database (chia sẻ với Laravel backend)
- Redis (tùy chọn, cho caching)

### Cài đặt từ GitHub

1. Clone repository:
```bash
git clone https://github.com/ptnghia/mechamap_realtime.git
cd mechamap_realtime
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Cấu hình môi trường:
```bash
cp .env.example .env
# Chỉnh sửa file .env theo cấu hình của bạn
```

4. Khởi động server:
```bash
# Development mode
npm run dev

# Production mode
npm run start
```

## 📁 Cấu trúc dự án

```
mechamap_realtime/
├── src/                          # Mã nguồn chính
│   ├── config/                   # File cấu hình
│   │   └── index.js             # Cấu hình chính
│   ├── middleware/              # Express middleware
│   │   ├── auth.js              # Authentication middleware
│   │   ├── cors.js              # CORS configuration
│   │   ├── monitoring.js        # Monitoring middleware
│   │   └── rateLimiter.js       # Rate limiting
│   ├── routes/                  # API routes
│   │   ├── api.js               # API endpoints chính
│   │   ├── broadcast.js         # Broadcasting endpoints
│   │   └── monitoring.js        # Monitoring endpoints
│   ├── services/                # Business logic
│   │   ├── authService.js       # Authentication service
│   │   ├── broadcastService.js  # Broadcasting service
│   │   └── monitoringService.js # Monitoring service
│   ├── utils/                   # Utility functions
│   │   ├── logger.js            # Logging utility
│   │   └── validator.js         # Validation helpers
│   ├── websocket/               # WebSocket handlers
│   │   ├── channelManager.js    # Channel management
│   │   └── socketHandler.js     # Socket event handlers
│   ├── app.js                   # Application entry point
│   └── server.js                # Server setup
├── scripts/                     # Deployment scripts
│   └── start-production.sh      # Production startup script
├── docs/                        # Tài liệu
│   ├── API.md                   # API documentation
│   ├── DEPLOYMENT.md            # Hướng dẫn deployment
│   └── MONITORING.md            # Hướng dẫn monitoring
├── logs/                        # Log files
├── .env.example                 # Environment template
├── .env.production              # Production environment
├── ecosystem.config.js          # PM2 configuration
├── package.json                 # Dependencies và scripts
├── test-system.sh              # System testing script
└── README.md                   # File này
```

## ⚙️ Cấu hình

### Biến môi trường quan trọng

File `.env` cho development:

```env
# Cấu hình Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Cấu hình Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mechamap
DB_USER=root
DB_PASSWORD=your_password

# Tích hợp Laravel
LARAVEL_API_URL=https://mechamap.com
LARAVEL_API_KEY=your-api-key

# Cấu hình JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=1h

# Cấu hình CORS
CORS_ORIGIN=https://mechamap.com
CORS_CREDENTIALS=true
```

File `.env.production` cho production:
- `NODE_ENV=production`
- `SSL_ENABLED=false` (SSL được xử lý bởi reverse proxy)
- Cấu hình database production
- CORS cho domain production

## 🔌 API Endpoints

### Health & Status
- `GET /` - Thông tin server cơ bản
- `GET /api/health` - Health check endpoint
- `GET /api/status` - Thông tin trạng thái server
- `GET /api/metrics` - Metrics cơ bản

### Monitoring
- `GET /api/monitoring/health` - Thông tin health chi tiết
- `GET /api/monitoring/metrics` - Performance metrics
- `GET /api/monitoring/performance` - Thống kê hiệu suất
- `GET /api/monitoring/connections` - Thông tin kết nối
- `GET /api/monitoring/info` - Thông tin hệ thống

### Broadcasting
- `POST /api/broadcast` - Gửi tin nhắn đến channels (yêu cầu authentication)

## 🌐 WebSocket Events

### Client Events (từ client gửi lên server)
- `connection` - Client kết nối đến server
- `disconnect` - Client ngắt kết nối
- `join-channel` - Tham gia kênh riêng tư
- `leave-channel` - Rời khỏi kênh

### Server Events (từ server gửi xuống client)
- `notification` - Nhận thông báo
- `user-status` - Cập nhật trạng thái người dùng
- `channel-message` - Tin nhắn theo kênh cụ thể

## 🛠️ Development

### Chạy ở chế độ Development

```bash
# Sử dụng nodemon cho auto-reload
npm run dev

# Hoặc chạy trực tiếp
node src/app.js
```

### Testing hệ thống

```bash
# Chạy test script tổng hợp
./test-system.sh

# Test bằng cURL
curl -s https://realtime.mechamap.com/api/health
```

## 🚀 Production Deployment

### Sử dụng PM2 (Khuyến nghị)

1. Cài đặt PM2 globally:
```bash
npm install -g pm2
```

2. Khởi động với PM2:
```bash
pm2 start ecosystem.config.js --env production
```

3. Giám sát:
```bash
pm2 status          # Xem trạng thái
pm2 logs            # Xem logs
pm2 monit           # Monitor real-time
pm2 restart all     # Restart tất cả processes
```

### Cấu hình SSL

Đối với hỗ trợ HTTPS/WSS, cấu hình SSL trong environment:

```env
SSL_ENABLED=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

**Lưu ý**: Trong production hiện tại, SSL được xử lý bởi reverse proxy, nên `SSL_ENABLED=false`.

## 📊 Giám sát (Monitoring)

Server bao gồm khả năng giám sát toàn diện:

- **Health Checks**: Giám sát health tự động với ngưỡng có thể cấu hình
- **Metrics Collection**: Performance metrics thời gian thực
- **Connection Tracking**: Theo dõi số lượng kết nối WebSocket
- **Error Monitoring**: Theo dõi và báo cáo lỗi

Truy cập monitoring endpoints:
- Health: `https://realtime.mechamap.com/api/monitoring/health`
- Metrics: `https://realtime.mechamap.com/api/monitoring/metrics`
- Performance: `https://realtime.mechamap.com/api/monitoring/performance`

## 🏗️ Kiến trúc hệ thống

Server chạy ở chế độ **cluster mode** với 2 instances để đảm bảo:
- **Load balancing**: Phân tải tự động
- **High availability**: Độ tin cậy cao
- **Zero downtime**: Không gián đoạn khi restart

## 🔗 Production URLs

- **Main Server**: https://realtime.mechamap.com/
- **Health Check**: https://realtime.mechamap.com/api/health
- **WebSocket**: wss://realtime.mechamap.com/socket.io/

## 📚 Tài liệu chi tiết

- [API Documentation](docs/API.md) - Chi tiết về các API endpoints
- [Deployment Guide](docs/DEPLOYMENT.md) - Hướng dẫn deployment chi tiết
- [Monitoring Guide](docs/MONITORING.md) - Hướng dẫn giám sát và maintenance

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch
3. Thực hiện thay đổi
4. Thêm tests cho tính năng mới
5. Đảm bảo tất cả tests pass
6. Submit pull request

## 📄 License

Dự án này được cấp phép theo MIT License - xem file LICENSE để biết chi tiết.

## 🆘 Hỗ trợ

Để được hỗ trợ và đặt câu hỏi, vui lòng liên hệ team phát triển hoặc tạo issue trong repository.
