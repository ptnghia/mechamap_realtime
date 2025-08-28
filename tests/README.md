# Test Suite

This directory contains all test files for the MechaMap Realtime Server.

## Test Files

### Core System Tests
- `test-final-complete.js` - Complete system test with all functionality
- `test-system-fixed.js` - Fixed system test with proper error handling
- `test-complete-system.js` - Original complete system test

### Translation API Tests
- `test-translation-api.js` - Comprehensive translation API test suite
- `test-translation.js` - Basic translation service test
- `test-google-translate.js` - Google Translate API test (deprecated)

### WebSocket Tests
- `test-websocket-final.js` - Final WebSocket functionality test
- `test-websocket-simple.js` - Simple WebSocket connection test
- `test-domain-websocket.js` - Domain-specific WebSocket test
- `test-websocket.js` - Basic WebSocket test

### System Tests
- `test-final-summary.js` - Final system summary test
- `test-system.sh` - Shell script for system testing

## Running Tests

### Individual Tests
```bash
# Run complete system test
node tests/test-final-complete.js

# Run translation API test
node tests/test-translation-api.js

# Run WebSocket test
node tests/test-websocket-final.js
```

### All Tests
```bash
# Run system test script
bash tests/test-system.sh
```

## Test Results

All tests should pass with 100% success rate when the system is properly configured.

Expected results:
- ✅ Core API: All endpoints operational
- ✅ Translation API: MyMemory API working
- ✅ WebSocket: Real-time communication ready
- ✅ Error Handling: Robust validation
- ✅ Performance: Optimized memory usage

## Notes

- Tests are designed for production environment
- Translation service uses MyMemory API (free tier)
- WebSocket tests may require authentication in production
- All tests include proper error handling and timeouts
