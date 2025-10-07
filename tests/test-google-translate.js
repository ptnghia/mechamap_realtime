#!/usr/bin/env node

/**
 * Test Google Translate API directly
 */

async function testGoogleTranslate() {
  try {
    console.log('🧪 Testing Google Translate API directly...\n');

    // Try different import methods
    console.log('1. Testing require method...');
    try {
      const translate1 = require('@vitalets/google-translate-api');
      console.log('translate1 type:', typeof translate1);
      console.log('translate1 keys:', Object.keys(translate1));
      
      if (typeof translate1 === 'function') {
        const result1 = await translate1('Hello world', { to: 'vi' });
        console.log('✅ Result1:', result1);
      }
    } catch (error) {
      console.log('❌ Method 1 failed:', error.message);
    }

    console.log('\n2. Testing destructured require...');
    try {
      const { translate } = require('@vitalets/google-translate-api');
      console.log('translate type:', typeof translate);
      
      if (typeof translate === 'function') {
        const result2 = await translate('Hello world', { to: 'vi' });
        console.log('✅ Result2:', result2);
      }
    } catch (error) {
      console.log('❌ Method 2 failed:', error.message);
    }

    console.log('\n3. Testing default import...');
    try {
      const translateModule = require('@vitalets/google-translate-api');
      const translate3 = translateModule.default || translateModule;
      console.log('translate3 type:', typeof translate3);
      
      if (typeof translate3 === 'function') {
        const result3 = await translate3('Hello world', { to: 'vi' });
        console.log('✅ Result3:', result3);
      }
    } catch (error) {
      console.log('❌ Method 3 failed:', error.message);
    }

    console.log('\n4. Testing dynamic import...');
    try {
      const translateModule = await import('@vitalets/google-translate-api');
      console.log('Dynamic import keys:', Object.keys(translateModule));
      
      const translate4 = translateModule.default || translateModule.translate;
      console.log('translate4 type:', typeof translate4);
      
      if (typeof translate4 === 'function') {
        const result4 = await translate4('Hello world', { to: 'vi' });
        console.log('✅ Result4:', result4);
      }
    } catch (error) {
      console.log('❌ Method 4 failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGoogleTranslate();
