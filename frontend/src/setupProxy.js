const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // API and WebSocket proxy
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://localhost:12001',
      changeOrigin: true,
      ws: true,
      // Required for Guacamole binary WebSocket frames
      onProxyReqWs: (proxyReq, req, socket, options, head) => {
        // Ensure the connection stays open and binary frames are preserved
        socket.on('error', (err) => {
          console.error('WebSocket proxy error:', err);
        });
      },
      // Don't modify WebSocket data
      preserveHeaderKeyCase: true,
    })
  );
};
