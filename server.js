const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 10000;

// Load domain mappings
let domainMappings = {};
function loadMappings() {
  try {
    domainMappings = JSON.parse(fs.readFileSync('mappings.json'));
  } catch (err) {
    console.error('Error loading mappings:', err);
  }
}
loadMappings();

// Watch for mapping changes (optional)
fs.watch('mappings.json', loadMappings);

// 1. First check for custom domain mapping
app.use((req, res, next) => {
  const host = req.hostname;
  
  if (domainMappings[host]) {
    const filePath = path.join(__dirname, domainMappings[host]);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`File error for ${host}:`, err);
        next(err); // Pass error to Express error handler
      }
    });
  } else {
    next(); // Proceed to proxy middleware
  }
});

// 2. Proxy middleware for all other requests
app.use(createProxyMiddleware({
  target: '', // Dynamic target set below
  router: (req) => {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    return `${protocol}://${req.headers.host}`;
  },
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(502).send('Bad Gateway');
  }
}));

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
