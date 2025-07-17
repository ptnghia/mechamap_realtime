#!/usr/bin/env node

/**
 * Load Environment Variables Script
 * Ensures proper environment variables are loaded based on NODE_ENV
 */

const fs = require('fs');
const path = require('path');

function loadEnvironment() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const rootDir = path.join(__dirname, '..');
  
  console.log(`Loading environment for: ${nodeEnv}`);
  
  // Determine which .env file to load
  let envFile = '.env';
  if (nodeEnv === 'production') {
    envFile = '.env.production';
  }
  
  const envPath = path.join(rootDir, envFile);
  
  // Check if environment file exists
  if (!fs.existsSync(envPath)) {
    console.error(`❌ Environment file not found: ${envPath}`);
    process.exit(1);
  }
  
  // Load environment variables
  require('dotenv').config({ path: envPath });
  
  console.log(`✅ Loaded environment from: ${envFile}`);
  
  // Validate critical environment variables
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'LARAVEL_API_URL',
    'JWT_SECRET'
  ];
  
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    process.exit(1);
  }
  
  // Check JWT_SECRET
  if (process.env.JWT_SECRET === 'your_super_secure_jwt_secret_key_here' || 
      process.env.JWT_SECRET === 'your_super_secure_production_jwt_secret_key_here') {
    console.warn('⚠️  Warning: Using default JWT secret. Please update JWT_SECRET environment variable.');
  }
  
  // Log environment info (without sensitive data)
  console.log('📋 Environment Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   PORT: ${process.env.PORT}`);
  console.log(`   LARAVEL_API_URL: ${process.env.LARAVEL_API_URL}`);
  console.log(`   CORS_ORIGIN: ${process.env.CORS_ORIGIN}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '***SET***' : '***NOT SET***'}`);
  console.log(`   ADMIN_KEY: ${process.env.ADMIN_KEY ? '***SET***' : '***NOT SET***'}`);
  
  return true;
}

// If called directly, load environment
if (require.main === module) {
  loadEnvironment();
}

module.exports = { loadEnvironment };
