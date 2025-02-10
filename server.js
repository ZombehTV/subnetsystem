const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 10000; // Use the host's provided port or 8080

// Function to load domain mappings dynamically from mappings.json
let domainMappings = {};
function loadMappings() {
  try {
    const data = fs.readFileSync('mappings.json');
    domainMappings = JSON.parse(data);
    console.log('Domain mappings loaded:', domainMappings);
  } catch (err) {
    console.error('Error loading mappings:', err);
  }
}
loadMappings();

// (Optional) Automatically reload mappings when the file changes
fs.watchFile('mappings.json', (curr, prev) => {
  console.log('Reloading mappings...');
  loadMappings();
});

// Middleware to handle requests based on the Host header
app.use((req, res, next) => {
  const hostHeader = req.headers.host;
  const host = hostHeader && hostHeader.split(':')[0]; // Strip out any port info

  if (domainMappings[host]) {
    // If a custom mapping exists, serve the custom HTML file
    return res.sendFile(path.join(__dirname, domainMappings[host]), err => {
      if (err) {
        console.error(`Error sending file for ${host}:`, err);
        res.status(500).send('Internal Server Error');
      }
    });
  }
  
  // If no custom mapping exists, proxy the request to the original destination
  // (For HTTP only; note that HTTPS requires extra handling)
  return createProxyMiddleware({
    target: `http://${host}`,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error(`Proxy error for ${host}:`, err);
      res.status(502).send('Bad Gateway');
    }
  })(req, res, next);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Dynamic proxy server is running on port ${PORT}`);
});
