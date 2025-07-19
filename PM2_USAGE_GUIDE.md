# PM2 Usage Guide - MechaMap Realtime Server

🔌 **Hướng dẫn sử dụng PM2 để quản lý MechaMap Realtime Server**

## 🚀 **Khởi động Server**

### Cách 1: Sử dụng script Windows
```bash
# Chạy script khởi động
scripts\start-pm2-windows.bat
```

### Cách 2: Sử dụng PM2 trực tiếp
```bash
# Development mode (mặc định)
pm2 start ecosystem.config.js --only mechamap-realtime-dev

# Production mode
pm2 start ecosystem.config.js --only mechamap-realtime-prod
```

### Cách 3: Production mode
```bash
# Sử dụng script production
scripts\start-pm2-production.bat
```

## 🛑 **Dừng Server**

```bash
# Sử dụng script
scripts\stop-pm2-windows.bat

# Hoặc PM2 trực tiếp
pm2 stop mechamap-realtime-dev  # Development
pm2 stop mechamap-realtime-prod # Production
```

## 🔄 **Restart Server**

```bash
# Sử dụng script
scripts\restart-pm2-windows.bat

# Hoặc PM2 trực tiếp
pm2 restart mechamap-realtime
```

## 📊 **Monitoring**

### Xem trạng thái
```bash
pm2 status
pm2 list
```

### Monitor real-time
```bash
# Sử dụng script
scripts\monitor-pm2-windows.bat

# Hoặc PM2 trực tiếp
pm2 monit
```

### Xem logs
```bash
# Xem logs real-time
pm2 logs mechamap-realtime

# Xem logs với số dòng cụ thể
pm2 logs mechamap-realtime --lines 50

# Xem chỉ error logs
pm2 logs mechamap-realtime --err

# Xem chỉ output logs
pm2 logs mechamap-realtime --out
```

## 🔧 **Quản lý Process**

### Reload (zero-downtime restart)
```bash
pm2 reload mechamap-realtime
```

### Delete process
```bash
pm2 delete mechamap-realtime
```

### Flush logs
```bash
pm2 flush mechamap-realtime
```

## 💾 **Lưu và Khôi phục**

### Lưu cấu hình hiện tại
```bash
pm2 save
```

### Khôi phục từ cấu hình đã lưu
```bash
pm2 resurrect
```

## 📈 **Thông tin chi tiết**

### Xem thông tin process
```bash
pm2 describe mechamap-realtime
```

### Xem environment variables
```bash
pm2 env 0  # 0 là ID của process
```

## 🌐 **Endpoints để test**

- **Health Check**: http://localhost:3000/api/health
- **Status**: http://localhost:3000/api/status
- **Main**: http://localhost:3000/

## ⚙️ **Cấu hình Environment**

### Development (mặc định)
- File: `.env.development`
- Port: 3000
- SSL: Disabled
- Watch: Enabled
- Memory limit: 1GB

### Production
- File: `.env.production`
- Port: 3000
- SSL: Enabled (nếu có certificates)
- Watch: Disabled
- Memory limit: 512MB
- Cluster mode: 2 instances

## 🚨 **Troubleshooting**

### Server không khởi động
```bash
# Kiểm tra logs
pm2 logs mechamap-realtime --lines 100

# Kiểm tra port có bị chiếm không
netstat -ano | findstr :3000

# Restart PM2 daemon
pm2 kill
pm2 resurrect
```

### Memory cao
```bash
# Restart để giải phóng memory
pm2 restart mechamap-realtime

# Xem memory usage
pm2 monit
```

### Cấu hình không đúng
```bash
# Kiểm tra environment
pm2 env 0

# Reload cấu hình
pm2 reload ecosystem.config.js
```

## 📝 **Lưu ý quan trọng**

1. **Development**: Sử dụng `mechamap-realtime` (fork mode, watch enabled)
2. **Production**: Sử dụng `mechamap-realtime-prod` (cluster mode, optimized)
3. **Auto-restart**: PM2 sẽ tự động restart nếu server crash
4. **Memory limit**: Server sẽ restart nếu vượt quá memory limit
5. **Logs**: Được lưu trong thư mục `logs/`
