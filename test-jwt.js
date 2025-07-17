const jwt = require('jsonwebtoken');

// JWT secret from Laravel
const jwtSecret = 'mechamap_jwt_secret_key_for_websocket_auth_2025';

// JWT token from newest API response
const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjIyLCJyb2xlIjoibWVtYmVyIiwicGVybWlzc2lvbnMiOlsid2Vic29ja2V0OmNvbm5lY3QiXSwiaWF0IjoxNzUyNzYyNTcwLCJleHAiOjE3NTI3NjYxNzB9.2d1gRvPDY-h9YPmEirDF-9G1fSVDn_mNgE05n-E3fFE';

console.log('🔐 Testing JWT verification...');
console.log('JWT Secret:', jwtSecret.substring(0, 10) + '...');
console.log('JWT Token:', token.substring(0, 50) + '...');

try {
    const decoded = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256']
    });

    console.log('✅ JWT verification successful!');
    console.log('Decoded payload:', decoded);
} catch (error) {
    console.log('❌ JWT verification failed:', error.message);

    // Try to decode without verification to see payload
    try {
        const decoded = jwt.decode(token);
        console.log('📋 Token payload (unverified):', decoded);
    } catch (decodeError) {
        console.log('❌ Cannot decode token:', decodeError.message);
    }
}
