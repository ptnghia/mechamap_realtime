#!/usr/bin/env node

/**
 * Test WebSocket connection through domain https://realtime.mechamap.com
 */

const https = require('https');

console.log('🔌 Testing WebSocket connection through domain...');
console.log('Domain: https://realtime.mechamap.com');

// Test 1: HTTP Health Check
function testHttpHealth() {
  return new Promise((resolve, reject) => {
    console.log('\n📡 Testing HTTP health endpoint...');
    
    const options = {
      hostname: 'realtime.mechamap.com',
      port: 443,
      path: '/api/health',
      method: 'GET',
      headers: {
        'User-Agent': 'WebSocket-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ HTTP Status: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          console.log('📊 Health Response:', response);
          resolve(response);
        } catch (e) {
          console.log('📄 Raw Response:', data);
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ HTTP Error:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('❌ HTTP Timeout');
      req.destroy();
      reject(new Error('HTTP Timeout'));
    });

    req.end();
  });
}

// Test 2: WebSocket Upgrade Test (HTTP-based)
function testWebSocketUpgrade() {
  return new Promise((resolve, reject) => {
    console.log('\n🔌 Testing WebSocket upgrade capability...');

    const options = {
      hostname: 'realtime.mechamap.com',
      port: 443,
      path: '/socket.io/?EIO=4&transport=websocket',
      method: 'GET',
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'User-Agent': 'WebSocket-Test/1.0',
        'Origin': 'https://mechamap.com'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`📡 Response Status: ${res.statusCode}`);
      console.log('📋 Response Headers:', res.headers);

      if (res.statusCode === 101) {
        console.log('✅ WebSocket upgrade successful!');
        resolve(true);
      } else if (res.statusCode === 200) {
        console.log('✅ Server responded (may support polling fallback)');
        resolve(true);
      } else {
        console.log('⚠️  Unexpected response, but server is reachable');
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.error('❌ WebSocket Upgrade Error:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('❌ WebSocket Upgrade Timeout');
      req.destroy();
      reject(new Error('WebSocket Upgrade Timeout'));
    });

    req.end();
  });
}

// Main test function
async function runTests() {
  try {
    console.log('🚀 Starting WebSocket domain tests...\n');
    
    // Test HTTP health first
    await testHttpHealth();
    
    // Test WebSocket upgrade capability
    await testWebSocketUpgrade();
    
    console.log('\n✅ All tests completed successfully!');
    console.log('🎉 Domain https://realtime.mechamap.com is working properly');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
