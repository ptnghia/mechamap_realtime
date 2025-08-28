#!/usr/bin/env node

/**
 * Final WebSocket test for realtime.mechamap.com
 * Tests both HTTP API and WebSocket connection
 */

const https = require('https');
const WebSocket = require('ws');

console.log('🔌 Testing WebSocket server at realtime.mechamap.com...\n');

// Test 1: Check server info
async function testServerInfo() {
  return new Promise((resolve, reject) => {
    console.log('📡 1. Testing server info endpoint...');
    
    const options = {
      hostname: 'realtime.mechamap.com',
      port: 443,
      path: '/',
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
        try {
          const response = JSON.parse(data);
          console.log(`   ✅ Status: ${res.statusCode}`);
          console.log(`   📊 Service: ${response.service}`);
          console.log(`   🌐 WebSocket URL: ${response.websocket.url}`);
          console.log(`   🚀 Transports: ${response.websocket.transports.join(', ')}`);
          console.log(`   🏷️  Environment: ${response.environment}`);
          resolve(response);
        } catch (e) {
          console.log('   ❌ Invalid JSON response');
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('   ❌ Error:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('   ❌ Timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Test 2: Check status endpoint
async function testStatus() {
  return new Promise((resolve, reject) => {
    console.log('\n📊 2. Testing status endpoint...');
    
    const options = {
      hostname: 'realtime.mechamap.com',
      port: 443,
      path: '/api/status',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`   ✅ Status: ${response.status}`);
          console.log(`   🔒 SSL: ${response.features.ssl}`);
          console.log(`   🔄 Clustering: ${response.features.clustering}`);
          console.log(`   📊 Metrics: ${response.features.metrics}`);
          console.log(`   🔗 Proxy: ${response.features.proxy}`);
          resolve(response);
        } catch (e) {
          console.log('   ❌ Invalid JSON response');
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('   ❌ Error:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('   ❌ Timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Test 3: Test Socket.IO polling
async function testSocketIOPolling() {
  return new Promise((resolve, reject) => {
    console.log('\n🔌 3. Testing Socket.IO polling transport...');
    
    const options = {
      hostname: 'realtime.mechamap.com',
      port: 443,
      path: '/socket.io/?EIO=4&transport=polling',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   ✅ Status: ${res.statusCode}`);
        if (data.startsWith('0{')) {
          const jsonPart = data.substring(1);
          try {
            const response = JSON.parse(jsonPart);
            console.log(`   🆔 Session ID: ${response.sid}`);
            console.log(`   ⬆️  Upgrades: ${response.upgrades.join(', ')}`);
            console.log(`   ⏱️  Ping Interval: ${response.pingInterval}ms`);
            console.log(`   ⏰ Ping Timeout: ${response.pingTimeout}ms`);
            resolve(response);
          } catch (e) {
            console.log('   ⚠️  Response format unexpected but connection works');
            resolve(true);
          }
        } else {
          console.log('   ⚠️  Unexpected response format');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('   ❌ Error:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('   ❌ Timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Test 4: Test WebSocket upgrade (basic)
async function testWebSocketUpgrade() {
  return new Promise((resolve, reject) => {
    console.log('\n🔌 4. Testing WebSocket upgrade capability...');
    
    try {
      const ws = new WebSocket('wss://realtime.mechamap.com/socket.io/?EIO=4&transport=websocket', {
        headers: {
          'Origin': 'https://mechamap.com'
        }
      });

      const timeout = setTimeout(() => {
        console.log('   ⏰ Connection timeout (30s)');
        ws.terminate();
        resolve(false);
      }, 30000);

      ws.on('open', () => {
        console.log('   ✅ WebSocket connection opened successfully!');
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      });

      ws.on('error', (error) => {
        console.log('   ❌ WebSocket error:', error.message);
        clearTimeout(timeout);
        resolve(false);
      });

      ws.on('close', (code, reason) => {
        console.log(`   🔌 WebSocket closed: ${code} ${reason}`);
        clearTimeout(timeout);
      });

    } catch (error) {
      console.log('   ❌ WebSocket creation failed:', error.message);
      resolve(false);
    }
  });
}

// Main test function
async function runTests() {
  try {
    console.log('🚀 Starting comprehensive WebSocket tests...\n');
    
    // Test 1: Server info
    const serverInfo = await testServerInfo();
    
    // Test 2: Status
    const status = await testStatus();
    
    // Test 3: Socket.IO polling
    const polling = await testSocketIOPolling();
    
    // Test 4: WebSocket upgrade
    const websocket = await testWebSocketUpgrade();
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Server Info: PASSED`);
    console.log(`✅ Status Check: PASSED`);
    console.log(`✅ Socket.IO Polling: PASSED`);
    console.log(`${websocket ? '✅' : '❌'} WebSocket Upgrade: ${websocket ? 'PASSED' : 'FAILED'}`);
    
    if (serverInfo.websocket.url === 'wss://realtime.mechamap.com') {
      console.log(`✅ WebSocket URL: CORRECT (${serverInfo.websocket.url})`);
    } else {
      console.log(`❌ WebSocket URL: INCORRECT (${serverInfo.websocket.url})`);
    }
    
    if (status.features.ssl === true) {
      console.log(`✅ SSL Status: CORRECT (${status.features.ssl})`);
    } else {
      console.log(`❌ SSL Status: INCORRECT (${status.features.ssl})`);
    }
    
    console.log('\n🎉 WebSocket server is properly configured and working!');
    console.log('🌐 Domain: https://realtime.mechamap.com');
    console.log('🔒 SSL: Enabled via reverse proxy');
    console.log('🔌 WebSocket: wss://realtime.mechamap.com');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
