const { test, expect } = require('@playwright/test');

/**
 * Performance and Load Tests for MechaMap
 * 
 * Tests:
 * - Page load performance
 * - WebSocket connection performance
 * - Memory usage monitoring
 * - Concurrent user simulation
 * - API response times
 */

test.describe('Performance Tests', () => {
  
  test('page load performance benchmarks', async ({ page }) => {
    console.log('⚡ Testing page load performance');
    
    const pages = [
      { path: '/login', name: 'Login' },
      { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
      { path: '/forums', name: 'Forums', requiresAuth: true },
      { path: '/search', name: 'Search', requiresAuth: true }
    ];
    
    const performanceResults = [];
    
    // Login first if needed
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    await page.waitForURL(/.*dashboard.*/);
    
    for (const pageInfo of pages) {
      console.log(`📊 Testing ${pageInfo.name} page performance`);
      
      const startTime = Date.now();
      
      // Navigate to page
      await page.goto(pageInfo.path);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Get detailed performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp: navigation.connectEnd - navigation.connectStart,
          request: navigation.responseStart - navigation.requestStart,
          response: navigation.responseEnd - navigation.responseStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });
      
      const result = {
        page: pageInfo.name,
        path: pageInfo.path,
        loadTime,
        metrics
      };
      
      performanceResults.push(result);
      
      // Performance assertions
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
      expect(metrics.totalTime).toBeLessThan(8000); // Navigation should complete within 8 seconds
      
      console.log(`✅ ${pageInfo.name}: ${loadTime}ms (Total: ${metrics.totalTime.toFixed(2)}ms)`);
    }
    
    // Generate performance report
    console.log('\n📊 Performance Summary:');
    performanceResults.forEach(result => {
      console.log(`${result.page}:`);
      console.log(`  Load Time: ${result.loadTime}ms`);
      console.log(`  DNS: ${result.metrics.dns.toFixed(2)}ms`);
      console.log(`  Request: ${result.metrics.request.toFixed(2)}ms`);
      console.log(`  DOM Content Loaded: ${result.metrics.domContentLoaded.toFixed(2)}ms`);
      console.log(`  First Contentful Paint: ${result.metrics.firstContentfulPaint.toFixed(2)}ms`);
    });
    
    // Check for performance issues
    const slowPages = performanceResults.filter(r => r.loadTime > 5000);
    if (slowPages.length > 0) {
      console.log('⚠️ Slow pages detected:', slowPages.map(p => p.page));
    }
  });

  test('WebSocket connection performance', async ({ page }) => {
    console.log('🔌 Testing WebSocket connection performance');
    
    // Login first
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    await page.waitForURL(/.*dashboard.*/);
    
    const connectionMetrics = await page.evaluate(async () => {
      const metrics = [];
      
      // Get JWT token
      const tokenResponse = await fetch('/api/user/token');
      const tokenData = await tokenResponse.json();
      const token = tokenData.data.data.token;
      
      // Test multiple connection attempts
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        const connectionResult = await new Promise((resolve) => {
          const socket = io('http://localhost:3000', {
            auth: { token },
            transports: ['websocket']
          });
          
          const timeout = setTimeout(() => {
            socket.disconnect();
            resolve({ success: false, duration: Date.now() - startTime });
          }, 10000);
          
          socket.on('connected', (data) => {
            clearTimeout(timeout);
            const duration = Date.now() - startTime;
            socket.disconnect();
            resolve({ success: true, duration, data });
          });
          
          socket.on('connection_rejected', (data) => {
            clearTimeout(timeout);
            const duration = Date.now() - startTime;
            socket.disconnect();
            resolve({ success: false, duration, reason: data.reason });
          });
        });
        
        metrics.push(connectionResult);
        
        // Wait between attempts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return metrics;
    });
    
    // Analyze connection performance
    const successfulConnections = connectionMetrics.filter(m => m.success);
    const averageConnectionTime = successfulConnections.reduce((sum, m) => sum + m.duration, 0) / successfulConnections.length;
    
    console.log(`📊 WebSocket Connection Metrics:`);
    console.log(`  Successful connections: ${successfulConnections.length}/5`);
    console.log(`  Average connection time: ${averageConnectionTime.toFixed(2)}ms`);
    console.log(`  Fastest connection: ${Math.min(...successfulConnections.map(m => m.duration))}ms`);
    console.log(`  Slowest connection: ${Math.max(...successfulConnections.map(m => m.duration))}ms`);
    
    // Performance assertions
    expect(successfulConnections.length).toBeGreaterThan(0);
    expect(averageConnectionTime).toBeLessThan(3000); // Should connect within 3 seconds on average
    
    console.log('✅ WebSocket connection performance test completed');
  });

  test('API response time benchmarks', async ({ page }) => {
    console.log('🌐 Testing API response times');
    
    // Login first
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    await page.waitForURL(/.*dashboard.*/);
    
    const apiEndpoints = [
      { url: '/api/user/token', name: 'JWT Token' },
      { url: 'http://localhost:3000/api/health', name: 'WebSocket Health' },
      { url: 'http://localhost:3000/api/connections/stats', name: 'Connection Stats' },
      { url: 'http://localhost:3000/api/performance/metrics', name: 'Performance Metrics' }
    ];
    
    const apiResults = [];
    
    for (const endpoint of apiEndpoints) {
      console.log(`📡 Testing ${endpoint.name} API`);
      
      const startTime = Date.now();
      
      try {
        const response = await page.request.get(endpoint.url);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        const result = {
          name: endpoint.name,
          url: endpoint.url,
          responseTime,
          status: response.status(),
          success: response.ok()
        };
        
        apiResults.push(result);
        
        // Performance assertion
        expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
        expect(response.ok()).toBe(true);
        
        console.log(`✅ ${endpoint.name}: ${responseTime}ms (${response.status()})`);
        
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Failed - ${error.message}`);
        apiResults.push({
          name: endpoint.name,
          url: endpoint.url,
          responseTime: -1,
          success: false,
          error: error.message
        });
      }
    }
    
    // Generate API performance summary
    console.log('\n📊 API Performance Summary:');
    const successfulAPIs = apiResults.filter(r => r.success);
    const averageResponseTime = successfulAPIs.reduce((sum, r) => sum + r.responseTime, 0) / successfulAPIs.length;
    
    console.log(`  Successful APIs: ${successfulAPIs.length}/${apiResults.length}`);
    console.log(`  Average response time: ${averageResponseTime.toFixed(2)}ms`);
    console.log(`  Fastest API: ${Math.min(...successfulAPIs.map(r => r.responseTime))}ms`);
    console.log(`  Slowest API: ${Math.max(...successfulAPIs.map(r => r.responseTime))}ms`);
  });

  test('memory usage monitoring', async ({ page }) => {
    console.log('💾 Testing memory usage during operations');
    
    // Login first
    await page.goto('/login');
    await page.fill('input[name="login"], input[type="email"]', 'member01');
    await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
    await page.click('button[type="submit"], button:has-text("Đăng nhập")');
    await page.waitForURL(/.*dashboard.*/);
    
    const memorySnapshots = [];
    
    // Take initial memory snapshot
    let initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (initialMemory) {
      memorySnapshots.push({ stage: 'initial', memory: initialMemory });
      console.log(`📊 Initial memory: ${(initialMemory.used / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Perform memory-intensive operations
    const operations = [
      { name: 'Navigate to Forums', action: () => page.goto('/forums') },
      { name: 'Navigate to Search', action: () => page.goto('/search') },
      { name: 'WebSocket Connection', action: async () => {
        await page.evaluate(async () => {
          const tokenResponse = await fetch('/api/user/token');
          const tokenData = await tokenResponse.json();
          const token = tokenData.data.data.token;
          
          const socket = io('http://localhost:3000', {
            auth: { token },
            transports: ['websocket']
          });
          
          await new Promise(resolve => {
            socket.on('connected', () => {
              setTimeout(() => {
                socket.disconnect();
                resolve();
              }, 2000);
            });
          });
        });
      }}
    ];
    
    for (const operation of operations) {
      console.log(`🔄 Performing: ${operation.name}`);
      
      await operation.action();
      await page.waitForTimeout(2000);
      
      if (initialMemory) {
        const currentMemory = await page.evaluate(() => {
          if (performance.memory) {
            return {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
              limit: performance.memory.jsHeapSizeLimit
            };
          }
          return null;
        });
        
        if (currentMemory) {
          memorySnapshots.push({ stage: operation.name, memory: currentMemory });
          const memoryIncrease = currentMemory.used - initialMemory.used;
          console.log(`📊 Memory after ${operation.name}: ${(currentMemory.used / 1024 / 1024).toFixed(2)}MB (+${(memoryIncrease / 1024 / 1024).toFixed(2)}MB)`);
        }
      }
    }
    
    // Analyze memory usage
    if (memorySnapshots.length > 1) {
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].memory;
      const totalIncrease = finalMemory.used - initialMemory.used;
      const percentageIncrease = (totalIncrease / initialMemory.used) * 100;
      
      console.log('\n💾 Memory Usage Summary:');
      console.log(`  Initial: ${(initialMemory.used / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final: ${(finalMemory.used / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Increase: ${(totalIncrease / 1024 / 1024).toFixed(2)}MB (${percentageIncrease.toFixed(2)}%)`);
      
      // Memory leak detection
      if (percentageIncrease > 50) {
        console.log('⚠️ Potential memory leak detected - memory increased by more than 50%');
      } else {
        console.log('✅ Memory usage within acceptable range');
      }
    }
  });

  test('concurrent user simulation', async ({ browser }) => {
    console.log('👥 Testing concurrent user simulation');
    
    const userCount = 3;
    const contexts = [];
    const results = [];
    
    try {
      // Create multiple browser contexts (simulating different users)
      for (let i = 0; i < userCount; i++) {
        const context = await browser.newContext();
        contexts.push(context);
      }
      
      // Simulate concurrent user actions
      const userPromises = contexts.map(async (context, index) => {
        const page = await context.newPage();
        const startTime = Date.now();
        
        try {
          // Login
          await page.goto('/login');
          await page.fill('input[name="login"], input[type="email"]', 'member01');
          await page.fill('input[name="password"], input[type="password"]', 'O!0omj-kJ6yP');
          await page.click('button[type="submit"], button:has-text("Đăng nhập")');
          await page.waitForURL(/.*dashboard.*/);
          
          // Navigate to different pages
          await page.goto('/forums');
          await page.waitForTimeout(1000);
          await page.goto('/search');
          await page.waitForTimeout(1000);
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          return {
            user: index + 1,
            success: true,
            duration
          };
          
        } catch (error) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          return {
            user: index + 1,
            success: false,
            duration,
            error: error.message
          };
        }
      });
      
      // Wait for all users to complete
      const userResults = await Promise.all(userPromises);
      results.push(...userResults);
      
      // Analyze concurrent performance
      const successfulUsers = results.filter(r => r.success);
      const averageDuration = successfulUsers.reduce((sum, r) => sum + r.duration, 0) / successfulUsers.length;
      
      console.log('\n👥 Concurrent User Results:');
      console.log(`  Successful users: ${successfulUsers.length}/${userCount}`);
      console.log(`  Average completion time: ${averageDuration.toFixed(2)}ms`);
      console.log(`  Fastest user: ${Math.min(...successfulUsers.map(r => r.duration))}ms`);
      console.log(`  Slowest user: ${Math.max(...successfulUsers.map(r => r.duration))}ms`);
      
      // Performance assertions
      expect(successfulUsers.length).toBe(userCount);
      expect(averageDuration).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log('✅ Concurrent user simulation completed successfully');
      
    } finally {
      // Clean up contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });
});
