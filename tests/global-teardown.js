const fs = require('fs');
const path = require('path');

/**
 * Global Teardown for MechaMap Playwright Tests
 * 
 * This teardown:
 * 1. Cleans up test artifacts
 * 2. Generates test summary
 * 3. Cleans up authentication state
 * 4. Performs final cleanup
 */

async function globalTeardown(config) {
  console.log('🧹 Starting MechaMap Playwright Global Teardown...');

  try {
    // Clean up authentication state
    const authFile = path.join(__dirname, 'auth-state.json');
    if (fs.existsSync(authFile)) {
      fs.unlinkSync(authFile);
      console.log('🗑️ Authentication state cleaned up');
    }

    // Clean up JWT token
    const tokenFile = path.join(__dirname, 'jwt-token.json');
    if (fs.existsSync(tokenFile)) {
      fs.unlinkSync(tokenFile);
      console.log('🗑️ JWT token cleaned up');
    }

    // Generate test summary
    const resultsDir = path.join(__dirname, '../test-results');
    const resultsFile = path.join(resultsDir, 'results.json');
    
    if (fs.existsSync(resultsFile)) {
      try {
        const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        
        const summary = {
          timestamp: new Date().toISOString(),
          totalTests: results.stats?.total || 0,
          passed: results.stats?.passed || 0,
          failed: results.stats?.failed || 0,
          skipped: results.stats?.skipped || 0,
          duration: results.stats?.duration || 0,
          success: (results.stats?.failed || 0) === 0
        };
        
        const summaryFile = path.join(resultsDir, 'test-summary.json');
        fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
        
        console.log('📊 Test Summary:');
        console.log(`   Total Tests: ${summary.totalTests}`);
        console.log(`   Passed: ${summary.passed}`);
        console.log(`   Failed: ${summary.failed}`);
        console.log(`   Skipped: ${summary.skipped}`);
        console.log(`   Duration: ${(summary.duration / 1000).toFixed(2)}s`);
        console.log(`   Success: ${summary.success ? '✅' : '❌'}`);
        
      } catch (error) {
        console.warn('⚠️ Failed to generate test summary:', error.message);
      }
    }

    // Clean up temporary files
    const tempFiles = [
      path.join(__dirname, 'test-environment.json'),
      path.join(__dirname, 'setup-error.png')
    ];

    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`🗑️ Cleaned up: ${path.basename(file)}`);
      }
    });

    // Clean up old screenshots (keep only last 10)
    const screenshotsDir = path.join(resultsDir, 'screenshots');
    if (fs.existsSync(screenshotsDir)) {
      try {
        const screenshots = fs.readdirSync(screenshotsDir)
          .filter(file => file.endsWith('.png'))
          .map(file => ({
            name: file,
            path: path.join(screenshotsDir, file),
            mtime: fs.statSync(path.join(screenshotsDir, file)).mtime
          }))
          .sort((a, b) => b.mtime - a.mtime);

        if (screenshots.length > 10) {
          const toDelete = screenshots.slice(10);
          toDelete.forEach(screenshot => {
            fs.unlinkSync(screenshot.path);
          });
          console.log(`🗑️ Cleaned up ${toDelete.length} old screenshots`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to clean up screenshots:', error.message);
      }
    }

    // Final WebSocket server cleanup
    try {
      const response = await fetch('http://localhost:3000/api/connections/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('🧹 WebSocket connections cleared');
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear WebSocket connections:', error.message);
    }

    console.log('✅ Global teardown completed successfully!');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

module.exports = globalTeardown;
