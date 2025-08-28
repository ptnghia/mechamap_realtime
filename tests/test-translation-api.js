#!/usr/bin/env node

/**
 * Comprehensive Translation API Test Suite
 */

const https = require('https');

const BASE_URL = 'https://realtime.mechamap.com';

// Test helper function
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'realtime.mechamap.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Translation-API-Test/1.0'
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

// Test cases
async function runTests() {
  console.log('🧪 Starting Translation API Test Suite...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Get supported languages
  try {
    console.log('1. Testing GET /api/supported-languages...');
    const result = await makeRequest('GET', '/api/supported-languages');
    
    if (result.statusCode === 200 && result.data.success) {
      console.log('   ✅ PASSED - Supported languages retrieved');
      console.log(`   📊 Total languages: ${result.data.data.total}`);
      passed++;
    } else {
      console.log('   ❌ FAILED - Unexpected response');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    failed++;
  }

  // Test 2: Simple text translation
  try {
    console.log('\n2. Testing POST /api/translate (text)...');
    const result = await makeRequest('POST', '/api/translate', {
      sourceLanguage: 'vi',
      targetLanguage: 'en',
      content: 'Xin chào thế giới',
      contentType: 'text'
    });
    
    if (result.statusCode === 200 && result.data.success) {
      console.log('   ✅ PASSED - Text translation successful');
      console.log(`   📝 Original: ${result.data.data.originalText}`);
      console.log(`   🔄 Translated: ${result.data.data.translatedText}`);
      console.log(`   🌐 Detected: ${result.data.data.detectedLanguage}`);
      passed++;
    } else {
      console.log('   ❌ FAILED - Translation failed');
      console.log('   Response:', result.data);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    failed++;
  }

  // Test 3: HTML translation
  try {
    console.log('\n3. Testing POST /api/translate (HTML)...');
    const result = await makeRequest('POST', '/api/translate', {
      sourceLanguage: 'en',
      targetLanguage: 'vi',
      content: '<p>Hello <strong>world</strong>! This is a <em>test</em>.</p>',
      contentType: 'html'
    });
    
    if (result.statusCode === 200 && result.data.success) {
      console.log('   ✅ PASSED - HTML translation successful');
      console.log(`   📝 Original: ${result.data.data.originalText}`);
      console.log(`   🔄 Translated: ${result.data.data.translatedText.substring(0, 100)}...`);
      passed++;
    } else {
      console.log('   ❌ FAILED - HTML translation failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    failed++;
  }

  // Test 4: Auto language detection
  try {
    console.log('\n4. Testing POST /api/translate (auto-detect)...');
    const result = await makeRequest('POST', '/api/translate', {
      sourceLanguage: 'auto',
      targetLanguage: 'en',
      content: 'Bonjour le monde',
      contentType: 'text'
    });
    
    if (result.statusCode === 200 && result.data.success) {
      console.log('   ✅ PASSED - Auto-detection successful');
      console.log(`   🔍 Detected language: ${result.data.data.detectedLanguage}`);
      console.log(`   🔄 Translated: ${result.data.data.translatedText}`);
      passed++;
    } else {
      console.log('   ❌ FAILED - Auto-detection failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    failed++;
  }

  // Test 5: Language detection endpoint
  try {
    console.log('\n5. Testing POST /api/detect-language...');
    const result = await makeRequest('POST', '/api/detect-language', {
      content: 'Guten Tag, wie geht es Ihnen?'
    });
    
    if (result.statusCode === 200 && result.data.success) {
      console.log('   ✅ PASSED - Language detection successful');
      console.log(`   🔍 Detected: ${result.data.data.detectedLanguage}`);
      passed++;
    } else {
      console.log('   ❌ FAILED - Language detection failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    failed++;
  }

  // Test 6: Validation error (missing required field)
  try {
    console.log('\n6. Testing validation error handling...');
    const result = await makeRequest('POST', '/api/translate', {
      sourceLanguage: 'vi',
      content: 'Test content'
      // Missing targetLanguage
    });
    
    if (result.statusCode === 400 && !result.data.success) {
      console.log('   ✅ PASSED - Validation error handled correctly');
      console.log(`   📋 Error: ${result.data.message}`);
      passed++;
    } else {
      console.log('   ❌ FAILED - Validation error not handled properly');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    failed++;
  }

  // Test 7: Invalid language code
  try {
    console.log('\n7. Testing invalid language code...');
    const result = await makeRequest('POST', '/api/translate', {
      sourceLanguage: 'invalid',
      targetLanguage: 'en',
      content: 'Test content'
    });
    
    if (result.statusCode === 400 && !result.data.success) {
      console.log('   ✅ PASSED - Invalid language code rejected');
      passed++;
    } else {
      console.log('   ❌ FAILED - Invalid language code not rejected');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    failed++;
  }

  // Test 8: Empty content
  try {
    console.log('\n8. Testing empty content validation...');
    const result = await makeRequest('POST', '/api/translate', {
      sourceLanguage: 'vi',
      targetLanguage: 'en',
      content: ''
    });
    
    if (result.statusCode === 400 && !result.data.success) {
      console.log('   ✅ PASSED - Empty content rejected');
      passed++;
    } else {
      console.log('   ❌ FAILED - Empty content not rejected');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ FAILED - Request error:', error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Translation API is working perfectly!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please check the issues above.`);
  }
}

// Run tests
runTests().catch(console.error);
