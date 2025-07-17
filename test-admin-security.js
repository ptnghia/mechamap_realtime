#!/usr/bin/env node

/**
 * Test Admin Security for MechaMap Realtime Server
 * Tests JWT_SECRET and ADMIN_KEY security
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

const SERVER_URL = 'http://localhost:3000';

// Test data
const WEAK_ADMIN_KEY = 'your-super-secure-admin-key-development';
const STRONG_ADMIN_KEY = 'admin_7107a9c6f0bc6a95c1e93d9585ae766c5879a53bf7578e16f5065f55141dab7a';

const WEAK_JWT_SECRET = 'mechamap_jwt_secret_key_for_websocket_auth_2025';
const STRONG_JWT_SECRET = 'cc779c53b425a9c6efab2e9def898a025bc077dec144726be95bd50916345e02d2535935490f7c047506c7ae494d5d4372d38189a5c4d8922a326d79090ae744';

console.log('🔐 Testing MechaMap Realtime Server Security');
console.log('='.repeat(50));

/**
 * Test Admin Key Security
 */
async function testAdminKeySecurity() {
    console.log('\n🔑 Testing ADMIN_KEY Security...');
    
    // Test 1: No admin key
    try {
        const response = await axios.post(`${SERVER_URL}/api/monitoring/reset`);
        console.log('❌ SECURITY ISSUE: Admin endpoint accessible without key!');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Good: Admin endpoint requires authentication');
        } else {
            console.log('⚠️  Unexpected error:', error.message);
        }
    }
    
    // Test 2: Wrong admin key
    try {
        const response = await axios.post(`${SERVER_URL}/api/monitoring/reset`, {}, {
            headers: { 'X-Admin-Key': 'wrong-key' }
        });
        console.log('❌ SECURITY ISSUE: Admin endpoint accepts wrong key!');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Good: Admin endpoint rejects wrong key');
        } else {
            console.log('⚠️  Unexpected error:', error.message);
        }
    }
    
    // Test 3: Weak admin key (if still in use)
    try {
        const response = await axios.post(`${SERVER_URL}/api/monitoring/reset`, {}, {
            headers: { 'X-Admin-Key': WEAK_ADMIN_KEY }
        });
        if (response.status === 200) {
            console.log('❌ CRITICAL: Weak admin key still works! Change immediately!');
        }
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Good: Weak admin key rejected');
        }
    }
}

/**
 * Test JWT Security
 */
function testJWTSecurity() {
    console.log('\n🎫 Testing JWT Security...');
    
    // Test 1: Generate token with weak secret
    try {
        const weakToken = jwt.sign(
            { userId: 999, role: 'admin', permissions: ['all'] },
            WEAK_JWT_SECRET,
            { algorithm: 'HS256', expiresIn: '1h' }
        );
        console.log('⚠️  Weak JWT can be generated:', weakToken.substring(0, 50) + '...');
        
        // Try to verify with strong secret
        try {
            jwt.verify(weakToken, STRONG_JWT_SECRET);
            console.log('❌ CRITICAL: Weak token verified with strong secret!');
        } catch (error) {
            console.log('✅ Good: Weak token rejected by strong secret');
        }
    } catch (error) {
        console.log('Error generating weak JWT:', error.message);
    }
    
    // Test 2: Generate token with strong secret
    try {
        const strongToken = jwt.sign(
            { userId: 22, role: 'member', permissions: ['receive_notifications'] },
            STRONG_JWT_SECRET,
            { algorithm: 'HS256', expiresIn: '1h' }
        );
        console.log('✅ Strong JWT generated successfully');
        
        // Verify it works
        const decoded = jwt.verify(strongToken, STRONG_JWT_SECRET);
        console.log('✅ Strong JWT verified successfully:', {
            userId: decoded.userId,
            role: decoded.role
        });
    } catch (error) {
        console.log('Error with strong JWT:', error.message);
    }
}

/**
 * Test Rate Limiting
 */
async function testRateLimiting() {
    console.log('\n🚦 Testing Rate Limiting...');
    
    const requests = [];
    const maxRequests = 10;
    
    for (let i = 0; i < maxRequests; i++) {
        requests.push(
            axios.get(`${SERVER_URL}/api/health`).catch(err => ({
                status: err.response?.status,
                error: err.message
            }))
        );
    }
    
    try {
        const responses = await Promise.all(requests);
        const successful = responses.filter(r => r.status === 200 || r.data).length;
        const rateLimited = responses.filter(r => r.status === 429).length;
        
        console.log(`✅ Sent ${maxRequests} requests:`);
        console.log(`   - Successful: ${successful}`);
        console.log(`   - Rate limited: ${rateLimited}`);
        
        if (rateLimited > 0) {
            console.log('✅ Good: Rate limiting is working');
        } else {
            console.log('⚠️  Rate limiting may be too permissive');
        }
    } catch (error) {
        console.log('Error testing rate limiting:', error.message);
    }
}

/**
 * Test CORS Security
 */
async function testCORSSecurity() {
    console.log('\n🌐 Testing CORS Security...');
    
    try {
        // Test with malicious origin
        const response = await axios.get(`${SERVER_URL}/api/health`, {
            headers: {
                'Origin': 'https://malicious-site.com'
            }
        });
        
        const corsHeader = response.headers['access-control-allow-origin'];
        if (corsHeader === '*' || corsHeader === 'https://malicious-site.com') {
            console.log('❌ SECURITY ISSUE: CORS allows malicious origins!');
        } else {
            console.log('✅ Good: CORS properly configured');
        }
    } catch (error) {
        if (error.message.includes('CORS')) {
            console.log('✅ Good: CORS blocking malicious origins');
        } else {
            console.log('⚠️  CORS test error:', error.message);
        }
    }
}

/**
 * Security Recommendations
 */
function showSecurityRecommendations() {
    console.log('\n📋 Security Recommendations:');
    console.log('='.repeat(50));
    
    console.log('\n🔐 JWT_SECRET:');
    console.log('   ❌ Current: mechamap_jwt_secret_key_for_websocket_auth_2025');
    console.log('   ✅ Recommended: cc779c53b425a9c6efab2e9def898a025bc077dec144726be95bd50916345e02d2535935490f7c047506c7ae494d5d4372d38189a5c4d8922a326d79090ae744');
    
    console.log('\n🔑 ADMIN_KEY:');
    console.log('   ❌ Current: your-super-secure-admin-key-development');
    console.log('   ✅ Recommended: admin_7107a9c6f0bc6a95c1e93d9585ae766c5879a53bf7578e16f5065f55141dab7a');
    
    console.log('\n🚦 Rate Limiting:');
    console.log('   ✅ Reduce RATE_LIMIT_MAX_REQUESTS from 100 to 50');
    console.log('   ✅ Set MAX_CONNECTIONS_PER_USER to 3 (currently 5)');
    
    console.log('\n🔒 Production Settings:');
    console.log('   ✅ Set DISABLE_AUTH=false');
    console.log('   ✅ Set DEBUG_MODE=false');
    console.log('   ✅ Set MOCK_LARAVEL_API=false');
    console.log('   ✅ Enable SSL_ENABLED=true');
    
    console.log('\n📁 File Security:');
    console.log('   ✅ Add .env.secure to .gitignore');
    console.log('   ✅ Use environment-specific .env files');
    console.log('   ✅ Rotate keys regularly');
}

/**
 * Main test function
 */
async function runSecurityTests() {
    try {
        await testAdminKeySecurity();
        testJWTSecurity();
        await testRateLimiting();
        await testCORSSecurity();
        showSecurityRecommendations();
        
        console.log('\n✅ Security testing completed!');
        console.log('📋 Review the recommendations above and update your .env file');
        
    } catch (error) {
        console.error('❌ Security test failed:', error.message);
        process.exit(1);
    }
}

// Run tests
runSecurityTests();
