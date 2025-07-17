const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Global Setup for MechaMap Playwright Tests
 * 
 * This setup:
 * 1. Authenticates with test credentials
 * 2. Saves authentication state
 * 3. Prepares test environment
 * 4. Validates WebSocket server
 */

async function globalSetup(config) {
  console.log('🚀 Starting MechaMap Playwright Global Setup...');

  // Test credentials
  const TEST_CREDENTIALS = {
    username: 'member01',
    password: 'O!0omj-kJ6yP',
    baseURL: 'https://mechamap.test'
  };

  // Create browser instance
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh'
  });
  const page = await context.newPage();

  try {
    console.log('🔐 Authenticating with test credentials...');
    
    // Navigate to login page
    await page.goto(`${TEST_CREDENTIALS.baseURL}/login`);
    
    // Wait for login form
    await page.waitForSelector('input[name="login"], input[type="email"], textbox[name*="email"], textbox[name*="login"]', { timeout: 10000 });
    
    // Fill login form
    const loginField = await page.locator('input[name="login"], input[type="email"], textbox[name*="email"], textbox[name*="login"]').first();
    await loginField.fill(TEST_CREDENTIALS.username);
    
    const passwordField = await page.locator('input[name="password"], input[type="password"], textbox[name*="password"]').first();
    await passwordField.fill(TEST_CREDENTIALS.password);
    
    // Submit form
    const submitButton = await page.locator('button[type="submit"], button:has-text("Đăng nhập"), input[type="submit"]').first();
    await submitButton.click();
    
    // Wait for successful login (redirect to dashboard)
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    console.log('✅ Authentication successful');
    
    // Save authentication state
    const authFile = path.join(__dirname, 'auth-state.json');
    await context.storageState({ path: authFile });
    console.log(`💾 Authentication state saved to: ${authFile}`);
    
    // Validate WebSocket server is running
    console.log('🔌 Validating WebSocket server...');
    
    try {
      const response = await page.request.get('http://localhost:3000/api/health');
      const healthData = await response.json();
      
      if (healthData.status === 'healthy') {
        console.log('✅ WebSocket server is healthy');
      } else {
        console.warn('⚠️ WebSocket server health check failed:', healthData);
      }
    } catch (error) {
      console.error('❌ WebSocket server validation failed:', error.message);
      throw new Error('WebSocket server is not accessible');
    }
    
    // Get JWT token for WebSocket tests
    console.log('🎫 Obtaining JWT token for WebSocket tests...');
    
    try {
      const tokenResponse = await page.request.get(`${TEST_CREDENTIALS.baseURL}/api/user/token`);
      const tokenData = await tokenResponse.json();
      
      if (tokenData.success && tokenData.data?.data?.token) {
        const jwtToken = tokenData.data.data.token;
        
        // Save JWT token for tests
        const tokenFile = path.join(__dirname, 'jwt-token.json');
        fs.writeFileSync(tokenFile, JSON.stringify({
          token: jwtToken,
          user: tokenData.data.data.user,
          expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
        }, null, 2));
        
        console.log('✅ JWT token obtained and saved');
      } else {
        console.warn('⚠️ Failed to obtain JWT token:', tokenData);
      }
    } catch (error) {
      console.error('❌ JWT token acquisition failed:', error.message);
    }
    
    // Create test results directory
    const resultsDir = path.join(__dirname, '../test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
      console.log('📁 Created test results directory');
    }
    
    // Create screenshots directory
    const screenshotsDir = path.join(resultsDir, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
      console.log('📸 Created screenshots directory');
    }
    
    // Save test environment info
    const envInfo = {
      timestamp: new Date().toISOString(),
      baseURL: TEST_CREDENTIALS.baseURL,
      nodeVersion: process.version,
      playwrightVersion: require('@playwright/test/package.json').version,
      testUser: {
        username: TEST_CREDENTIALS.username,
        authenticated: true
      },
      webSocketServer: {
        url: 'http://localhost:3000',
        healthy: true
      }
    };
    
    const envFile = path.join(__dirname, 'test-environment.json');
    fs.writeFileSync(envFile, JSON.stringify(envInfo, null, 2));
    console.log('🌍 Test environment info saved');
    
    console.log('🎉 Global setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    
    // Take screenshot for debugging
    try {
      const errorScreenshot = path.join(__dirname, 'setup-error.png');
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      console.log(`📸 Error screenshot saved: ${errorScreenshot}`);
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError);
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;
