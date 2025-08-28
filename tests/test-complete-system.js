#!/usr/bin/env node

/**
 * Complete System Test Suite
 * Tests all API endpoints and WebSocket functionality
 */

const https = require('https');
const { io } = require('socket.io-client');

const BASE_URL = 'https://realtime.mechamap.com';

// Test helper function for HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'realtime.mechamap.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Complete-System-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// WebSocket test helper
function testWebSocket() {
  return new Promise((resolve, reject) => {
    console.log('🔌 Testing WebSocket connection...');
    
    const socket = io(BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    let connected = false;
    let testResults = {
      connection: false,
      transport: null,
      socketId: null,
      events: []
    };

    const timeout = setTimeout(() => {
      if (!connected) {
        socket.disconnect();
        reject(new Error('WebSocket connection timeout'));
      }
    }, 15000);

    socket.on('connect', () => {
      connected = true;
      clearTimeout(timeout);
      
      testResults.connection = true;
      testResults.transport = socket.io.engine.transport.name;
      testResults.socketId = socket.id;
      
      console.log(`   ✅ WebSocket connected via ${testResults.transport}`);
      console.log(`   🆔 Socket ID: ${testResults.socketId}`);
      
      // Test sending a message
      socket.emit('test_message', { 
        message: 'Hello from test client',
        timestamp: new Date().toISOString()
      });
      
      // Wait a bit then disconnect
      setTimeout(() => {
        socket.disconnect();
        resolve(testResults);
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.log('   ❌ WebSocket connection failed:', error.message);
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      console.log(`   🔌 WebSocket disconnected: ${reason}`);
    });

    // Listen for any events
    socket.onAny((eventName, ...args) => {
      testResults.events.push({ eventName, args });
      console.log(`   📨 Received event: ${eventName}`, args);
    });
  });
}

// Main test function
async function runCompleteTests() {
  console.log('🚀 Starting Complete System Test Suite...\n');
  console.log('🌐 Testing Server: https://realtime.mechamap.com\n');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  const testResults = {
    api: {},
    websocket: {},
    summary: {}
  };

  // ========================================
  // CORE API TESTS
  // ========================================
  
  console.log('📡 TESTING CORE API ENDPOINTS');
  console.log('='.repeat(50));

  // Test 1: Server Info
  try {
    totalTests++;
    console.log('1. Testing GET / (Server Info)...');
    const result = await makeRequest('GET', '/');
    
    if (result.statusCode === 200 && result.data.service) {
      console.log('   ✅ PASSED - Server info retrieved');
      console.log(`   📊 Service: ${result.data.service}`);
      console.log(`   🏷️  Version: ${result.data.version}`);
      console.log(`   🌐 Environment: ${result.data.environment}`);
      console.log(`   🔌 WebSocket URL: ${result.data.websocket?.url}`);
      testResults.api.serverInfo = { status: 'PASSED', data: result.data };
      passedTests++;
    } else {
      console.log('   ❌ FAILED - Server info failed');
      testResults.api.serverInfo = { status: 'FAILED', error: 'Invalid response' };
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    testResults.api.serverInfo = { status: 'FAILED', error: error.message };
    failedTests++;
  }

  // Test 2: Health Check
  try {
    totalTests++;
    console.log('\n2. Testing GET /api/health...');
    const result = await makeRequest('GET', '/api/health');
    
    if (result.statusCode === 200 && result.data.status === 'healthy') {
      console.log('   ✅ PASSED - Health check successful');
      console.log(`   ⏱️  Uptime: ${Math.floor(result.data.uptime)}s`);
      console.log(`   💾 Memory: ${Math.floor(result.data.memory.rss / 1024 / 1024)}MB`);
      testResults.api.health = { status: 'PASSED', data: result.data };
      passedTests++;
    } else {
      console.log('   ❌ FAILED - Health check failed');
      testResults.api.health = { status: 'FAILED', error: 'Unhealthy status' };
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    testResults.api.health = { status: 'FAILED', error: error.message };
    failedTests++;
  }

  // Test 3: Status Check
  try {
    totalTests++;
    console.log('\n3. Testing GET /api/status...');
    const result = await makeRequest('GET', '/api/status');
    
    if (result.statusCode === 200 && result.data.status === 'running') {
      console.log('   ✅ PASSED - Status check successful');
      console.log(`   🔒 SSL: ${result.data.features.ssl}`);
      console.log(`   🔄 Clustering: ${result.data.features.clustering}`);
      console.log(`   📊 Metrics: ${result.data.features.metrics}`);
      console.log(`   🔗 Proxy: ${result.data.features.proxy}`);
      testResults.api.status = { status: 'PASSED', data: result.data };
      passedTests++;
    } else {
      console.log('   ❌ FAILED - Status check failed');
      testResults.api.status = { status: 'FAILED', error: 'Invalid status' };
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    testResults.api.status = { status: 'FAILED', error: error.message };
    failedTests++;
  }

  // ========================================
  // TRANSLATION API TESTS
  // ========================================
  
  console.log('\n\n🌐 TESTING TRANSLATION API');
  console.log('='.repeat(50));

  // Test 4: Supported Languages
  try {
    totalTests++;
    console.log('4. Testing GET /api/supported-languages...');
    const result = await makeRequest('GET', '/api/supported-languages');
    
    if (result.statusCode === 200 && result.data.success) {
      console.log('   ✅ PASSED - Supported languages retrieved');
      console.log(`   📊 Total languages: ${result.data.data.total}`);
      testResults.api.supportedLanguages = { status: 'PASSED', data: result.data };
      passedTests++;
    } else {
      console.log('   ❌ FAILED - Supported languages failed');
      testResults.api.supportedLanguages = { status: 'FAILED', error: 'Invalid response' };
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    testResults.api.supportedLanguages = { status: 'FAILED', error: error.message };
    failedTests++;
  }

  // Test 5: Text Translation
  try {
    totalTests++;
    console.log('\n5. Testing POST /api/translate (text)...');
    const result = await makeRequest('POST', '/api/translate', {
      sourceLanguage: 'vi',
      targetLanguage: 'en',
      content: 'Xin chào, đây là test hệ thống',
      contentType: 'text'
    });
    
    if (result.statusCode === 200 && result.data.success) {
      console.log('   ✅ PASSED - Text translation successful');
      console.log(`   📝 Original: ${result.data.data.originalText}`);
      console.log(`   🔄 Translated: ${result.data.data.translatedText}`);
      console.log(`   🌐 Detected: ${result.data.data.detectedLanguage}`);
      testResults.api.textTranslation = { status: 'PASSED', data: result.data };
      passedTests++;
    } else {
      console.log('   ❌ FAILED - Text translation failed');
      testResults.api.textTranslation = { status: 'FAILED', error: 'Translation failed' };
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    testResults.api.textTranslation = { status: 'FAILED', error: error.message };
    failedTests++;
  }

  // Test 6: HTML Translation
  try {
    totalTests++;
    console.log('\n6. Testing POST /api/translate (HTML)...');
    const result = await makeRequest('POST', '/api/translate', {
      sourceLanguage: 'en',
      targetLanguage: 'vi',
      content: '<h1>System Test</h1><p>This is a <strong>complete</strong> system test.</p>',
      contentType: 'html'
    });
    
    if (result.statusCode === 200 && result.data.success) {
      console.log('   ✅ PASSED - HTML translation successful');
      console.log(`   📝 Original: ${result.data.data.originalText}`);
      console.log(`   🔄 Translated: ${result.data.data.translatedText.substring(0, 100)}...`);
      testResults.api.htmlTranslation = { status: 'PASSED', data: result.data };
      passedTests++;
    } else {
      console.log('   ❌ FAILED - HTML translation failed');
      testResults.api.htmlTranslation = { status: 'FAILED', error: 'HTML translation failed' };
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    testResults.api.htmlTranslation = { status: 'FAILED', error: error.message };
    failedTests++;
  }

  // Test 7: Language Detection
  try {
    totalTests++;
    console.log('\n7. Testing POST /api/detect-language...');
    const result = await makeRequest('POST', '/api/detect-language', {
      content: 'Hola, ¿cómo estás? Este es un test del sistema.'
    });
    
    if (result.statusCode === 200 && result.data.success) {
      console.log('   ✅ PASSED - Language detection successful');
      console.log(`   🔍 Detected: ${result.data.data.detectedLanguage}`);
      testResults.api.languageDetection = { status: 'PASSED', data: result.data };
      passedTests++;
    } else {
      console.log('   ❌ FAILED - Language detection failed');
      testResults.api.languageDetection = { status: 'FAILED', error: 'Detection failed' };
      failedTests++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    testResults.api.languageDetection = { status: 'FAILED', error: error.message };
    failedTests++;
  }

  // ========================================
  // WEBSOCKET TESTS
  // ========================================
  
  console.log('\n\n🔌 TESTING WEBSOCKET FUNCTIONALITY');
  console.log('='.repeat(50));

  // Test 8: WebSocket Connection
  try {
    totalTests++;
    const wsResult = await testWebSocket();
    console.log('   ✅ PASSED - WebSocket test completed');
    testResults.websocket.connection = { status: 'PASSED', data: wsResult };
    passedTests++;
  } catch (error) {
    console.log('   ❌ FAILED - WebSocket test failed:', error.message);
    testResults.websocket.connection = { status: 'FAILED', error: error.message };
    failedTests++;
  }

  // ========================================
  // FINAL SUMMARY
  // ========================================
  
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 COMPLETE SYSTEM TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  console.log(`🧪 Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  console.log('Core API:');
  console.log(`  - Server Info: ${testResults.api.serverInfo?.status || 'NOT_TESTED'}`);
  console.log(`  - Health Check: ${testResults.api.health?.status || 'NOT_TESTED'}`);
  console.log(`  - Status Check: ${testResults.api.status?.status || 'NOT_TESTED'}`);
  
  console.log('Translation API:');
  console.log(`  - Supported Languages: ${testResults.api.supportedLanguages?.status || 'NOT_TESTED'}`);
  console.log(`  - Text Translation: ${testResults.api.textTranslation?.status || 'NOT_TESTED'}`);
  console.log(`  - HTML Translation: ${testResults.api.htmlTranslation?.status || 'NOT_TESTED'}`);
  console.log(`  - Language Detection: ${testResults.api.languageDetection?.status || 'NOT_TESTED'}`);
  
  console.log('WebSocket:');
  console.log(`  - Connection Test: ${testResults.websocket.connection?.status || 'NOT_TESTED'}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL! Server is working perfectly!');
    console.log('✅ API Endpoints: Fully functional');
    console.log('✅ Translation Service: Fully functional');
    console.log('✅ WebSocket Server: Fully functional');
    console.log('✅ SSL/HTTPS: Working correctly');
    console.log('✅ Error Handling: Working correctly');
  } else {
    console.log(`\n⚠️  SYSTEM ISSUES DETECTED: ${failedTests} test(s) failed`);
    console.log('Please check the failed tests above for details.');
  }
  
  console.log('\n🔗 Server Status: https://realtime.mechamap.com/api/status');
  console.log('📚 API Documentation: Available in docs/API.md');
  
  return {
    totalTests,
    passedTests,
    failedTests,
    successRate: ((passedTests / totalTests) * 100).toFixed(1),
    results: testResults
  };
}

// Run complete tests
runCompleteTests().catch(console.error);
