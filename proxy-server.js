const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const port = 3001;

// Enable CORS for all origins
app.use(cors());

// Proxy middleware configuration
const proxyOptions = {
  target: 'http://50.145.48.68:30082',
  changeOrigin: true,
  pathRewrite: {
    '^/proxy': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request:', req.method, req.url);
  }
};

// Create proxy middleware
app.use('/proxy', createProxyMiddleware(proxyOptions));

app.listen(port, () => {
  console.log(`🚀 CORS proxy server running on http://localhost:${port}`);
  console.log(`✅ Your browser frontend can now use: http://localhost:${port}/proxy`);
});
