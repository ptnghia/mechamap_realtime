# Hướng dẫn Setup Local Development cho MechaMap Realtime Server

Tài liệu này hướng dẫn cách setup MechaMap Realtime Server trên môi trường local để phát triển với `https://mechamap.test`.

## 🎯 Mục tiêu

- Chạy Realtime Server trên local (port 3001)
- Kết nối với Laravel local (`https://mechamap.test`)
- Tách biệt hoàn toàn với production server
- Hỗ trợ hot reload và debugging

## 📋 Yêu cầu

- Node.js >= 18.0
- MySQL/MariaDB local
- Laravel project đã setup tại `https://mechamap.test`
- Git

## 🚀 Bước 1: Clone Repository

```bash
# Clone repository
git clone https://github.com/ptnghia/mechamap_realtime.git
cd mechamap_realtime

# Checkout development branch (nếu có)
git checkout development
```

## ⚙️ Bước 2: Cấu hình Environment

```bash
# Copy file cấu hình development
cp docs/.env.development.example .env.development

# Chỉnh sửa cấu hình theo môi trường local
nano .env.development
```

### **Cấu hình quan trọng cần thay đổi:**

```env
# Database (thay đổi theo setup local)
DB_HOST=localhost
DB_NAME=mechamap_db_local
DB_USER=root
DB_PASSWORD=your_local_password

# Laravel API (local Laravel)
LARAVEL_API_URL=https://mechamap.test
LARAVEL_API_KEY=your_local_api_key

# JWT Secret (tạo secret mới)
JWT_SECRET=your_local_jwt_secret_here

# Admin Key (tạo key mới)
ADMIN_KEY=your_local_admin_key_here
```

## 🗄️ Bước 3: Setup Database

```bash
# Tạo database local
mysql -u root -p
CREATE DATABASE mechamap_db_local;
GRANT ALL PRIVILEGES ON mechamap_db_local.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema từ production (nếu cần)
# mysqldump -h production_host -u user -p mechamap_db > schema.sql
# mysql -u root -p mechamap_db_local < schema.sql
```

## 📦 Bước 4: Cài đặt Dependencies

```bash
# Cài đặt packages
npm install

# Hoặc sử dụng yarn
yarn install
```

## 🔧 Bước 5: Setup Laravel Local

### **Thêm routes vào Laravel local:**

Trong `routes/api.php`:

```php
use App\Http\Controllers\WebSocketController;

// WebSocket API routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/user/websocket-token', [WebSocketController::class, 'getWebSocketToken']);
});

Route::middleware(['auth:sanctum'])->prefix('websocket-api')->group(function () {
    Route::post('/verify-user', [WebSocketController::class, 'verifyUser']);
});
```

### **Copy WebSocketController:**

```bash
# Copy controller từ docs/laravel-examples/
cp docs/laravel-examples/WebSocketController.php /path/to/laravel/app/Http/Controllers/
```

## 🚀 Bước 6: Chạy Development Server

```bash
# Chạy với development config
NODE_ENV=development npm run dev

# Hoặc sử dụng nodemon cho hot reload
npm install -g nodemon
nodemon --env-file=.env.development src/server.js

# Hoặc sử dụng PM2 cho development
pm2 start ecosystem.config.js --env development
```

## 🧪 Bước 7: Test Local Setup

### **Test health endpoint:**

```bash
curl http://localhost:3001/api/health
```

### **Test từ frontend:**

```javascript
// Trong frontend local (https://mechamap.test)
const socket = io('ws://localhost:3001', {
    auth: { 
        token: sanctumToken  // Token từ Laravel local
    }
});

socket.on('connect', () => {
    console.log('✅ Connected to local Realtime Server');
});
```

## 🔍 Bước 8: Debugging

### **Xem logs real-time:**

```bash
# Xem logs
tail -f logs/app.log

# Hoặc với PM2
pm2 logs mechamap-realtime-dev
```

### **Debug mode:**

```env
# Trong .env.development
DEBUG_MODE=true
VERBOSE_LOGGING=true
LOG_LEVEL=debug
```

## 📁 Bước 9: Project Structure

```
mechamap_realtime/
├── .env.development          # Local config
├── .env.production          # Production config (không dùng local)
├── src/
│   ├── server.js           # Entry point
│   ├── app.js              # Express app
│   └── ...
├── docs/
│   ├── .env.development.example
│   └── LOCAL_DEVELOPMENT_SETUP.md
└── logs/                   # Local logs
```

## 🔄 Bước 10: Development Workflow

### **Khởi động development:**

```bash
# Terminal 1: Start Laravel local
cd /path/to/laravel
php artisan serve --host=mechamap.test --port=80

# Terminal 2: Start Realtime Server local
cd /path/to/mechamap_realtime
npm run dev
```

### **Test integration:**

```bash
# Test Laravel API
curl -H "Authorization: Bearer TOKEN" https://mechamap.test/api/user/websocket-token

# Test Realtime Server
curl http://localhost:3001/api/health
```

## 🚨 Troubleshooting

### **Lỗi thường gặp:**

1. **Port conflict:**
   ```bash
   # Thay đổi port trong .env.development
   PORT=3002
   ```

2. **Database connection:**
   ```bash
   # Kiểm tra MySQL service
   sudo service mysql status
   ```

3. **Laravel API không accessible:**
   ```bash
   # Kiểm tra Laravel đang chạy
   curl https://mechamap.test/api/health
   ```

4. **SSL certificate issues:**
   ```env
   # Trong .env.development
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

## 📚 Scripts hữu ích

### **Package.json scripts:**

```json
{
  "scripts": {
    "dev": "NODE_ENV=development nodemon --env-file=.env.development src/server.js",
    "dev:debug": "NODE_ENV=development DEBUG=* nodemon --env-file=.env.development src/server.js",
    "test:local": "NODE_ENV=development npm test",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

## 🎉 Kết quả

Sau khi setup thành công:

- ✅ Realtime Server chạy tại `http://localhost:3001`
- ✅ Kết nối với Laravel local tại `https://mechamap.test`
- ✅ WebSocket hoạt động từ frontend local
- ✅ Hot reload khi thay đổi code
- ✅ Logs chi tiết cho debugging
- ✅ Tách biệt hoàn toàn với production

## 🔗 Tài liệu liên quan

- [Laravel Setup Guide](LARAVEL_SETUP_GUIDE.md)
- [API Documentation](API.md)
- [Production Deployment](PRODUCTION_DEPLOYMENT.md)
