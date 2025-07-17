# SSL Certificates for Development

This directory contains self-signed SSL certificates for local development.

## Files

- `localhost.crt` - SSL certificate
- `localhost.key` - Private key

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
```bash
npm run ssl:generate
```

## Security Note

⚠️ **These are self-signed certificates for development only!**
Never use these certificates in production.
