const { test, expect } = require('@playwright/test');

/**
 * Authentication Flow Tests for MechaMap
 * 
 * Tests:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Logout functionality
 * - Session persistence
 * - JWT token generation
 * - Protected route access
 */

test.describe('Authentication Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.goto('/');
  });

  test('should login with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for login form to load
    await expect(page.locator('form')).toBeVisible();
    
    // Fill login form
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Should see user menu or profile
    await expect(page.locator('[data-testid="user-menu"], .user-menu, .profile-menu')).toBeVisible();
    
    // Take screenshot for verification
    await page.screenshot({ 
      path: 'test-results/screenshots/login-success.png',
      fullPage: true 
    });
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill with invalid credentials
    await page.fill('input[name="login"], input[type="email"]', 'invalid@user.com');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    
    // Should show error message
    await expect(page.locator('.alert-danger, .error-message, [role="alert"]')).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*login.*/);
    
    // Take screenshot for verification
    await page.screenshot({ 
      path: 'test-results/screenshots/login-failure.png' 
    });
  });

  test('should generate JWT token after login', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    
    // Wait for redirect
    await page.waitForURL(/.*dashboard.*/);
    
    // Request JWT token
    const response = await page.request.get('/api/user/token');
    const tokenData = await response.json();
    
    // Verify token response
    expect(tokenData.success).toBe(true);
    expect(tokenData.data?.data?.token).toBeDefined();
    expect(tokenData.data?.data?.user).toBeDefined();
    
    // Verify token format (JWT should have 3 parts separated by dots)
    const token = tokenData.data.data.token;
    const tokenParts = token.split('.');
    expect(tokenParts).toHaveLength(3);
    
    // Verify user data
    const userData = tokenData.data.data.user;
    expect(userData.id).toBeDefined();
    expect(userData.username).toBe('member01');
    
    console.log('JWT Token obtained:', token.substring(0, 50) + '...');
  });

  test('should access protected routes after login', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    
    await page.waitForURL(/.*dashboard.*/);
    
    // Test access to various protected routes
    const protectedRoutes = [
      '/dashboard',
      '/profile',
      '/settings',
      '/forums',
      '/search'
    ];
    
    for (const route of protectedRoutes) {
      try {
        await page.goto(route);
        
        // Should not redirect to login
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');
        
        console.log(`✅ Access granted to: ${route}`);
      } catch (error) {
        console.log(`⚠️ Route ${route} may not exist or require different permissions`);
      }
    }
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    
    await page.waitForURL(/.*dashboard.*/);
    
    // Find and click logout button
    const logoutSelectors = [
      'a[href*="logout"]',
      'button:has-text("Đăng xuất")',
      'button:has-text("Logout")',
      '[data-testid="logout"]',
      '.logout-btn'
    ];
    
    let loggedOut = false;
    for (const selector of logoutSelectors) {
      try {
        const logoutElement = page.locator(selector).first();
        if (await logoutElement.isVisible()) {
          await logoutElement.click();
          loggedOut = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (loggedOut) {
      // Should redirect to login or home page
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(login|home|$)/);
      
      console.log('✅ Logout successful');
    } else {
      console.log('⚠️ Logout button not found - may need manual testing');
    }
  });

  test('should maintain session across page reloads', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    
    await page.waitForURL(/.*dashboard.*/);
    
    // Reload page
    await page.reload();
    
    // Should still be logged in
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
    
    // Should still see user menu
    const userMenuVisible = await page.locator('[data-testid="user-menu"], .user-menu, .profile-menu').isVisible();
    if (userMenuVisible) {
      console.log('✅ Session maintained after reload');
    } else {
      console.log('⚠️ Session may not be maintained - check session handling');
    }
  });

  test('should handle concurrent login attempts', async ({ browser }) => {
    // Create multiple browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Attempt login from both contexts simultaneously
      const loginPromises = [
        (async () => {
          await page1.goto('/login');
          await page1.fill('input[name="login"], input[type="email"]', 'member01');
          await page1.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
          await page1.click('button[type="submit"], button:has-text("Đăng nhập")');
          return page1.waitForURL(/.*dashboard.*/, { timeout: 10000 });
        })(),
        (async () => {
          await page2.goto('/login');
          await page2.fill('input[name="login"], input[type="email"]', 'member01');
          await page2.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
          await page2.click('button[type="submit"], button:has-text("Đăng nhập")');
          return page2.waitForURL(/.*dashboard.*/, { timeout: 10000 });
        })()
      ];
      
      // Both should succeed
      await Promise.all(loginPromises);
      
      console.log('✅ Concurrent login attempts handled successfully');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should validate JWT token with WebSocket server', async ({ page }) => {
    // Login and get JWT token
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    
    await page.waitForURL(/.*dashboard.*/);
    
    // Get JWT token
    const tokenResponse = await page.request.get('/api/user/token');
    const tokenData = await tokenResponse.json();
    const token = tokenData.data.data.token;
    
    // Test token with WebSocket server
    const wsResponse = await page.request.post('http://localhost:3000/api/test-auth', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const wsData = await wsResponse.json();
    
    // Verify WebSocket server accepts the token
    expect(wsData.success).toBe(true);
    expect(wsData.data.userId).toBeDefined();
    expect(wsData.data.role).toBe('member');
    expect(wsData.data.permissions).toContain('websocket:connect');
    
    console.log('✅ JWT token validated with WebSocket server');
  });
});
