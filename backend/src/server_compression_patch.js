// Patch to add compression middleware to server.js
// Add after line 8 (const helmet = require('helmet');)
const compression = require('compression');

// Add after line 80 (app.use(express.urlencoded...))
// Response compression middleware (gzip)
app.use(compression({
  // Only compress responses larger than 1kb
  threshold: 1024,
  // Compression level (0-9, default 6)
  level: 6,
  // Filter function - compress JSON and text responses
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
