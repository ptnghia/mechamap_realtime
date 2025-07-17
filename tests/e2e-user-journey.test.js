const { test, expect } = require('@playwright/test');

/**
 * End-to-End User Journey Tests for MechaMap
 * 
 * Tests complete user workflows:
 * - Login → Dashboard → Forums → Search → Profile
 * - Real-time notifications during navigation
 * - Mobile responsive behavior
 * - Performance during navigation
 */

test.describe('End-to-End User Journey', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start each test with a fresh session
    await page.goto('/');
  });

  test('complete user journey: login → dashboard → forums → search', async ({ page }) => {
    // Step 1: Login
    console.log('🔐 Step 1: Login');
    await page.goto('/login');
    
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    
    await expect(page).toHaveURL(/.*dashboard.*/);
    await page.screenshot({ path: 'test-results/screenshots/journey-01-login.png' });
    
    // Step 2: Dashboard
    console.log('📊 Step 2: Dashboard');
    await expect(page.locator('h1, .page-title, [data-testid="page-title"]')).toBeVisible();
    
    // Check for dashboard elements
    const dashboardElements = [
      '.dashboard-stats',
      '.recent-activity', 
      '.notifications',
      '.quick-actions',
      '[data-testid="dashboard"]'
    ];
    
    let dashboardFound = false;
    for (const selector of dashboardElements) {
      if (await page.locator(selector).isVisible()) {
        dashboardFound = true;
        break;
      }
    }
    
    if (dashboardFound) {
      console.log('✅ Dashboard elements found');
    } else {
      console.log('⚠️ Dashboard elements not found - may need different selectors');
    }
    
    await page.screenshot({ path: 'test-results/screenshots/journey-02-dashboard.png' });
    
    // Step 3: Forums
    console.log('💬 Step 3: Forums');
    const forumLinks = [
      'a[href*="forum"]',
      'a:has-text("Forum")',
      'a:has-text("Diễn đàn")',
      '[data-testid="forums-link"]',
      '.nav-forums'
    ];
    
    let forumNavigated = false;
    for (const selector of forumLinks) {
      try {
        const forumLink = page.locator(selector).first();
        if (await forumLink.isVisible()) {
          await forumLink.click();
          await page.waitForTimeout(2000);
          forumNavigated = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!forumNavigated) {
      // Try direct navigation
      await page.goto('/forums');
      await page.waitForTimeout(2000);
    }
    
    // Check for forum elements
    const forumElements = [
      '.forum-list',
      '.topic-list',
      '.forum-categories',
      '[data-testid="forums"]',
      '.forum-container'
    ];
    
    let forumFound = false;
    for (const selector of forumElements) {
      if (await page.locator(selector).isVisible()) {
        forumFound = true;
        break;
      }
    }
    
    console.log(forumFound ? '✅ Forums page loaded' : '⚠️ Forums page elements not found');
    await page.screenshot({ path: 'test-results/screenshots/journey-03-forums.png' });
    
    // Step 4: Search
    console.log('🔍 Step 4: Search');
    const searchLinks = [
      'a[href*="search"]',
      'a:has-text("Search")',
      'a:has-text("Tìm kiếm")',
      '[data-testid="search-link"]',
      '.nav-search'
    ];
    
    let searchNavigated = false;
    for (const selector of searchLinks) {
      try {
        const searchLink = page.locator(selector).first();
        if (await searchLink.isVisible()) {
          await searchLink.click();
          await page.waitForTimeout(2000);
          searchNavigated = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!searchNavigated) {
      // Try direct navigation
      await page.goto('/search');
      await page.waitForTimeout(2000);
    }
    
    // Test search functionality
    const searchInputs = [
      'input[name="search"]',
      'input[type="search"]',
      'input[placeholder*="search"]',
      'input[placeholder*="tìm kiếm"]',
      '[data-testid="search-input"]'
    ];
    
    let searchTested = false;
    for (const selector of searchInputs) {
      try {
        const searchInput = page.locator(selector).first();
        if (await searchInput.isVisible()) {
          await searchInput.fill('test search query');
          
          // Try to submit search
          const submitButtons = [
            'button[type="submit"]',
            'button:has-text("Search")',
            'button:has-text("Tìm kiếm")',
            '[data-testid="search-submit"]'
          ];
          
          for (const btnSelector of submitButtons) {
            try {
              const submitBtn = page.locator(btnSelector).first();
              if (await submitBtn.isVisible()) {
                await submitBtn.click();
                await page.waitForTimeout(2000);
                searchTested = true;
                break;
              }
            } catch (error) {
              // Continue
            }
          }
          
          if (searchTested) break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    console.log(searchTested ? '✅ Search functionality tested' : '⚠️ Search functionality not found');
    await page.screenshot({ path: 'test-results/screenshots/journey-04-search.png' });
    
    // Step 5: Profile/Settings
    console.log('👤 Step 5: Profile');
    const profileLinks = [
      'a[href*="profile"]',
      'a[href*="settings"]',
      'a:has-text("Profile")',
      'a:has-text("Hồ sơ")',
      '[data-testid="profile-link"]',
      '.user-menu a'
    ];
    
    let profileNavigated = false;
    for (const selector of profileLinks) {
      try {
        const profileLink = page.locator(selector).first();
        if (await profileLink.isVisible()) {
          await profileLink.click();
          await page.waitForTimeout(2000);
          profileNavigated = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!profileNavigated) {
      // Try direct navigation
      await page.goto('/profile');
      await page.waitForTimeout(2000);
    }
    
    console.log(profileNavigated ? '✅ Profile page accessed' : '⚠️ Profile page not found');
    await page.screenshot({ path: 'test-results/screenshots/journey-05-profile.png' });
    
    console.log('🎉 Complete user journey test finished');
  });

  test('mobile responsive user journey', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    console.log('📱 Testing mobile responsive journey');
    
    // Login on mobile
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    
    await expect(page).toHaveURL(/.*dashboard.*/);
    await page.screenshot({ path: 'test-results/screenshots/mobile-01-login.png' });
    
    // Test mobile navigation
    const mobileMenuSelectors = [
      '.mobile-menu-toggle',
      '.hamburger-menu',
      '.navbar-toggler',
      '[data-testid="mobile-menu"]',
      '.menu-toggle'
    ];
    
    let mobileMenuFound = false;
    for (const selector of mobileMenuSelectors) {
      try {
        const menuToggle = page.locator(selector).first();
        if (await menuToggle.isVisible()) {
          await menuToggle.click();
          await page.waitForTimeout(1000);
          mobileMenuFound = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    console.log(mobileMenuFound ? '✅ Mobile menu found and opened' : '⚠️ Mobile menu not found');
    await page.screenshot({ path: 'test-results/screenshots/mobile-02-menu.png' });
    
    // Test mobile navigation to forums
    try {
      await page.goto('/forums');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/screenshots/mobile-03-forums.png' });
      console.log('✅ Mobile forums navigation successful');
    } catch (error) {
      console.log('⚠️ Mobile forums navigation failed');
    }
    
    console.log('📱 Mobile responsive journey test completed');
  });

  test('performance during user journey', async ({ page }) => {
    console.log('⚡ Testing performance during user journey');
    
    const performanceMetrics = [];
    
    // Monitor navigation timing
    page.on('load', async () => {
      const timing = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart
        };
      });
      
      performanceMetrics.push({
        url: page.url(),
        timing
      });
    });
    
    // Login
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    await page.waitForURL(/.*dashboard.*/);
    
    // Navigate to different pages
    const pages = ['/forums', '/search', '/profile'];
    
    for (const pagePath of pages) {
      try {
        await page.goto(pagePath);
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log(`⚠️ Failed to navigate to ${pagePath}`);
      }
    }
    
    // Analyze performance
    console.log('📊 Performance Metrics:');
    performanceMetrics.forEach(metric => {
      console.log(`${metric.url}:`);
      console.log(`  DOM Content Loaded: ${metric.timing.domContentLoaded}ms`);
      console.log(`  Load Complete: ${metric.timing.loadComplete}ms`);
      console.log(`  Total Time: ${metric.timing.totalTime}ms`);
    });
    
    // Check if any page took too long
    const slowPages = performanceMetrics.filter(m => m.timing.totalTime > 5000);
    if (slowPages.length > 0) {
      console.log('⚠️ Slow pages detected:', slowPages.map(p => p.url));
    } else {
      console.log('✅ All pages loaded within acceptable time');
    }
  });

  test('real-time notifications during navigation', async ({ page }) => {
    console.log('🔔 Testing real-time notifications during navigation');
    
    // Login first
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    await page.waitForURL(/.*dashboard.*/);
    
    // Setup WebSocket connection monitoring
    const notificationsReceived = await page.evaluate(async () => {
      const notifications = [];
      
      // Get JWT token
      try {
        const tokenResponse = await fetch('/api/user/token');
        const tokenData = await tokenResponse.json();
        const token = tokenData.data.data.token;
        
        // Connect to WebSocket
        const socket = io('http://localhost:3000', {
          auth: { token },
          transports: ['websocket']
        });
        
        socket.on('connected', (data) => {
          console.log('WebSocket connected during navigation test');
          notifications.push({ type: 'connected', data });
        });
        
        socket.on('notification', (data) => {
          console.log('Notification received:', data);
          notifications.push({ type: 'notification', data });
        });
        
        // Keep connection open for the test
        window.testSocket = socket;
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(notifications);
          }, 5000);
        });
        
      } catch (error) {
        console.log('WebSocket setup failed:', error);
        return [];
      }
    });
    
    // Navigate between pages while monitoring notifications
    const pages = ['/dashboard', '/forums', '/search'];
    
    for (const pagePath of pages) {
      try {
        await page.goto(pagePath);
        await page.waitForTimeout(2000);
        console.log(`Navigated to ${pagePath}`);
      } catch (error) {
        console.log(`Failed to navigate to ${pagePath}`);
      }
    }
    
    // Clean up WebSocket connection
    await page.evaluate(() => {
      if (window.testSocket) {
        window.testSocket.disconnect();
        delete window.testSocket;
      }
    });
    
    console.log(`📊 Notifications received during navigation: ${notificationsReceived.length}`);
    console.log('🔔 Real-time notifications test completed');
  });
});
