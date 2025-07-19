# Production Checklist - Laravel Integration

## 🎯 Pre-deployment Checklist

### ✅ Configuration
- [ ] Update `config/services.php` with production realtime server URL
- [ ] Set `REALTIME_SERVER_URL=https://realtime.mechamap.com` in .env
- [ ] Set `REALTIME_API_KEY` with production API key
- [ ] Configure CORS domains for production
- [ ] Update Sanctum stateful domains

### ✅ Security
- [ ] Use environment variables for all sensitive data
- [ ] Never hardcode API keys in code
- [ ] Configure proper CORS origins
- [ ] Enable SSL/TLS for all connections

### ✅ Services
- [ ] Register RealtimeNotificationService in service provider
- [ ] Add WebSocket routes to routes/api.php
- [ ] Test WebSocket authentication
- [ ] Verify notification delivery

### ✅ Testing
- [ ] Run `php artisan realtime:test` command
- [ ] Test WebSocket connection from frontend
- [ ] Verify real-time notifications work
- [ ] Check error handling and logging

### ✅ Monitoring
- [ ] Enable realtime server monitoring
- [ ] Configure error alerting
- [ ] Set up health check endpoints
- [ ] Monitor connection metrics

## 🚀 Deployment Commands

```bash
# Test realtime connection
php artisan realtime:test

# Clear config cache
php artisan config:clear
php artisan config:cache

# Test notification sending
php artisan tinker
>>> app(\App\Services\RealtimeNotificationService::class)->testConnection()
```

## 📞 Troubleshooting

1. **Connection Failed**: Check realtime server URL and API key
2. **CORS Errors**: Verify CORS configuration in realtime server
3. **Authentication Failed**: Check JWT secret synchronization
4. **SSL Errors**: Ensure SSL certificates are valid
