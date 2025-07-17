#!/usr/bin/env node

/**
 * Generate Self-Signed SSL Certificates for Development
 * Creates SSL certificates for localhost testing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sslDir = path.join(__dirname, '../deployment/ssl');
const certPath = path.join(sslDir, 'localhost.crt');
const keyPath = path.join(sslDir, 'localhost.key');
const csrPath = path.join(sslDir, 'localhost.csr');
const configPath = path.join(sslDir, 'openssl.conf');

/**
 * Create SSL directory if it doesn't exist
 */
function createSSLDirectory() {
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
    console.log('✅ Created SSL directory:', sslDir);
  }
}

/**
 * Create OpenSSL configuration file
 */
function createOpenSSLConfig() {
  const config = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=VN
ST=Ho Chi Minh
L=Ho Chi Minh City
O=MechaMap Development
OU=IT Department
CN=localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = mechamap.test
DNS.4 = *.mechamap.test
DNS.5 = realtime.mechamap.test
IP.1 = 127.0.0.1
IP.2 = ::1
`.trim();

  fs.writeFileSync(configPath, config);
  console.log('✅ Created OpenSSL configuration file');
}

/**
 * Generate private key
 */
function generatePrivateKey() {
  try {
    execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'pipe' });
    console.log('✅ Generated private key:', keyPath);
  } catch (error) {
    console.error('❌ Failed to generate private key:', error.message);
    throw error;
  }
}

/**
 * Generate certificate signing request
 */
function generateCSR() {
  try {
    execSync(`openssl req -new -key "${keyPath}" -out "${csrPath}" -config "${configPath}"`, { stdio: 'pipe' });
    console.log('✅ Generated certificate signing request:', csrPath);
  } catch (error) {
    console.error('❌ Failed to generate CSR:', error.message);
    throw error;
  }
}

/**
 * Generate self-signed certificate
 */
function generateCertificate() {
  try {
    execSync(`openssl x509 -req -in "${csrPath}" -signkey "${keyPath}" -out "${certPath}" -days 365 -extensions v3_req -extfile "${configPath}"`, { stdio: 'pipe' });
    console.log('✅ Generated self-signed certificate:', certPath);
  } catch (error) {
    console.error('❌ Failed to generate certificate:', error.message);
    throw error;
  }
}

/**
 * Clean up temporary files
 */
function cleanup() {
  try {
    if (fs.existsSync(csrPath)) {
      fs.unlinkSync(csrPath);
      console.log('✅ Cleaned up CSR file');
    }
    
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log('✅ Cleaned up config file');
    }
  } catch (error) {
    console.warn('⚠️  Warning: Failed to clean up temporary files:', error.message);
  }
}

/**
 * Verify generated certificates
 */
function verifyCertificates() {
  try {
    // Check if files exist
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      throw new Error('Certificate files not found');
    }
    
    // Verify certificate
    const certInfo = execSync(`openssl x509 -in "${certPath}" -text -noout`, { encoding: 'utf8' });
    
    if (certInfo.includes('localhost') && certInfo.includes('mechamap.test')) {
      console.log('✅ Certificate verification successful');
      
      // Display certificate info
      const subject = execSync(`openssl x509 -in "${certPath}" -subject -noout`, { encoding: 'utf8' }).trim();
      const issuer = execSync(`openssl x509 -in "${certPath}" -issuer -noout`, { encoding: 'utf8' }).trim();
      const dates = execSync(`openssl x509 -in "${certPath}" -dates -noout`, { encoding: 'utf8' }).trim();
      
      console.log('\n📋 Certificate Information:');
      console.log('  ', subject);
      console.log('  ', issuer);
      console.log('  ', dates);
      
    } else {
      throw new Error('Certificate does not contain expected domains');
    }
    
  } catch (error) {
    console.error('❌ Certificate verification failed:', error.message);
    throw error;
  }
}

/**
 * Check if OpenSSL is available
 */
function checkOpenSSL() {
  try {
    execSync('openssl version', { stdio: 'pipe' });
    const version = execSync('openssl version', { encoding: 'utf8' }).trim();
    console.log('✅ OpenSSL found:', version);
    return true;
  } catch (error) {
    console.error('❌ OpenSSL not found. Please install OpenSSL:');
    console.error('   Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
    console.error('   macOS: brew install openssl');
    console.error('   Linux: sudo apt-get install openssl');
    return false;
  }
}

/**
 * Check if certificates already exist
 */
function checkExistingCertificates() {
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log('⚠️  SSL certificates already exist:');
    console.log('   Certificate:', certPath);
    console.log('   Private Key:', keyPath);
    
    // Check if they're still valid
    try {
      const dates = execSync(`openssl x509 -in "${certPath}" -dates -noout`, { encoding: 'utf8' });
      const notAfter = dates.match(/notAfter=(.+)/)[1];
      const expiryDate = new Date(notAfter);
      const now = new Date();
      
      if (expiryDate > now) {
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        console.log(`✅ Certificates are valid for ${daysLeft} more days`);
        
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        return new Promise((resolve) => {
          readline.question('Do you want to regenerate them? (y/N): ', (answer) => {
            readline.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
          });
        });
      } else {
        console.log('❌ Certificates have expired, regenerating...');
        return Promise.resolve(true);
      }
    } catch (error) {
      console.log('❌ Cannot verify existing certificates, regenerating...');
      return Promise.resolve(true);
    }
  }
  
  return Promise.resolve(true);
}

/**
 * Create README file with instructions
 */
function createReadme() {
  const readme = `# SSL Certificates for Development

This directory contains self-signed SSL certificates for local development.

## Files

- \`localhost.crt\` - SSL certificate
- \`localhost.key\` - Private key

## Usage

These certificates are automatically used by the MechaMap Realtime Server when SSL is enabled.

## Domains Covered

- localhost
- *.localhost
- mechamap.test
- *.mechamap.test
- realtime.mechamap.test
- 127.0.0.1
- ::1

## Browser Trust

To avoid browser warnings, you may need to trust these certificates:

### Chrome/Edge
1. Go to chrome://settings/certificates
2. Click "Authorities" tab
3. Click "Import" and select localhost.crt
4. Check "Trust this certificate for identifying websites"

### Firefox
1. Go to about:preferences#privacy
2. Scroll to "Certificates" and click "View Certificates"
3. Click "Authorities" tab
4. Click "Import" and select localhost.crt
5. Check "Trust this CA to identify websites"

## Regeneration

To regenerate certificates:
\`\`\`bash
npm run ssl:generate
\`\`\`

## Security Note

⚠️ **These are self-signed certificates for development only!**
Never use these certificates in production.
`;

  const readmePath = path.join(sslDir, 'README.md');
  fs.writeFileSync(readmePath, readme);
  console.log('✅ Created README.md with instructions');
}

/**
 * Main function
 */
async function main() {
  console.log('🔐 Generating SSL Certificates for Development\n');
  
  try {
    // Check prerequisites
    if (!checkOpenSSL()) {
      process.exit(1);
    }
    
    // Check existing certificates
    const shouldGenerate = await checkExistingCertificates();
    if (!shouldGenerate) {
      console.log('✅ Using existing certificates');
      return;
    }
    
    // Generate certificates
    console.log('\n🔧 Generating new certificates...');
    createSSLDirectory();
    createOpenSSLConfig();
    generatePrivateKey();
    generateCSR();
    generateCertificate();
    cleanup();
    verifyCertificates();
    createReadme();
    
    console.log('\n🎉 SSL certificates generated successfully!');
    console.log('\n📁 Certificate files:');
    console.log('   Certificate:', certPath);
    console.log('   Private Key:', keyPath);
    console.log('\n🚀 You can now start the server with SSL enabled');
    console.log('   npm run dev');
    console.log('\n🌐 Server will be available at:');
    console.log('   https://localhost:3000');
    console.log('   https://mechamap.test:3000');
    
  } catch (error) {
    console.error('\n❌ Failed to generate SSL certificates:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  createSSLDirectory,
  generatePrivateKey,
  generateCertificate,
  verifyCertificates
};
