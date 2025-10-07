#!/usr/bin/env node

/**
 * Test translation service
 */

const translationService = require('./src/services/TranslationService');

async function testTranslation() {
  try {
    console.log('🧪 Testing Translation Service...\n');

    // Test 1: Simple text translation
    console.log('1. Testing simple text translation...');
    const result1 = await translationService.translateText(
      'Hello world', 
      'en', 
      'vi'
    );
    console.log('✅ Result:', result1);

    // Test 2: Language detection
    console.log('\n2. Testing language detection...');
    const detected = await translationService.detectLanguage('Xin chào thế giới');
    console.log('✅ Detected language:', detected);

    // Test 3: HTML translation
    console.log('\n3. Testing HTML translation...');
    const htmlResult = await translationService.translateHTML(
      '<p>Hello <strong>world</strong></p>',
      'en',
      'vi'
    );
    console.log('✅ HTML Result:', htmlResult);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTranslation();
