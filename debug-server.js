const express = require('express');
const https = require('https');
const fs = require('fs');

const app = express();

// Simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

// SSL options
const sslOptions = {
  key: fs.readFileSync('./deployment/ssl/localhost.key'),
  cert: fs.readFileSync('./deployment/ssl/localhost.crt')
};

const server = https.createServer(sslOptions, app);

server.listen(3001, () => {
  console.log('Debug server running on https://localhost:3001');
});
