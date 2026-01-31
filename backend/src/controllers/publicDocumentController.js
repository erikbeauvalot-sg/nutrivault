/**
 * Public Document Controller
 *
 * HTTP request handlers for public document access via share links.
 * No authentication required for these endpoints.
 */

const documentService = require('../services/document.service');

// In-memory rate limiter for password attempts
const passwordAttempts = new Map();
const MAX_PASSWORD_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

/**
 * Check if IP is rate limited for password attempts
 * @param {string} ip - IP address
 * @returns {boolean} Whether the IP is rate limited
 */
function isRateLimited(ip) {
  const attempts = passwordAttempts.get(ip);
  if (!attempts) return false;

  // Clean up old attempts
  const now = Date.now();
  const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentAttempts.length !== attempts.length) {
    passwordAttempts.set(ip, recentAttempts);
  }

  return recentAttempts.length >= MAX_PASSWORD_ATTEMPTS;
}

/**
 * Record a password attempt for rate limiting
 * @param {string} ip - IP address
 */
function recordPasswordAttempt(ip) {
  const attempts = passwordAttempts.get(ip) || [];
  attempts.push(Date.now());
  passwordAttempts.set(ip, attempts);
}

/**
 * Extract request metadata
 * @param {Object} req - Express request object
 * @returns {Object} Request metadata
 */
function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0],
    userAgent: req.get('user-agent')
  };
}

/**
 * GET /public/documents/:token - Get share info by token
 */
exports.getShareInfo = async (req, res, next) => {
  try {
    const { token } = req.params;
    const metadata = getRequestMetadata(req);

    const shareInfo = await documentService.getShareByToken(token);

    // Record the view
    await documentService.recordShareView(token, metadata);

    res.json({
      success: true,
      data: shareInfo
    });
  } catch (error) {
    if (error.message === 'Share link not found') {
      return res.status(404).json({
        success: false,
        error: 'Share link not found or has been removed'
      });
    }
    next(error);
  }
};

/**
 * POST /public/documents/:token/verify - Verify password for protected share
 */
exports.verifyPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const metadata = getRequestMetadata(req);

    // Check rate limiting
    if (isRateLimited(metadata.ip)) {
      return res.status(429).json({
        success: false,
        error: 'Too many password attempts. Please try again later.'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    // Record the attempt for rate limiting
    recordPasswordAttempt(metadata.ip);

    const result = await documentService.verifySharePassword(token, password, metadata);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Share link not found') {
      return res.status(404).json({
        success: false,
        error: 'Share link not found'
      });
    }
    if (error.message === 'Invalid password') {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }
    next(error);
  }
};

/**
 * GET /public/documents/:token/download - Download document via share token
 */
exports.downloadDocument = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.query; // Password can be passed as query param
    const metadata = getRequestMetadata(req);

    // First, check if the share requires a password
    const shareInfo = await documentService.getShareByToken(token);

    if (!shareInfo.is_accessible) {
      let errorMessage = 'This share link is not accessible';
      if (!shareInfo.is_active) errorMessage = 'This share link has been revoked';
      if (shareInfo.is_expired) errorMessage = 'This share link has expired';
      if (shareInfo.has_reached_limit) errorMessage = 'Download limit reached for this share link';

      return res.status(403).json({
        success: false,
        error: errorMessage
      });
    }

    // Verify password if protected
    let passwordVerified = !shareInfo.is_password_protected;
    if (shareInfo.is_password_protected) {
      if (!password) {
        return res.status(401).json({
          success: false,
          error: 'Password required',
          requires_password: true
        });
      }

      // Check rate limiting
      if (isRateLimited(metadata.ip)) {
        return res.status(429).json({
          success: false,
          error: 'Too many password attempts. Please try again later.'
        });
      }

      recordPasswordAttempt(metadata.ip);

      try {
        await documentService.verifySharePassword(token, password, metadata);
        passwordVerified = true;
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password'
        });
      }
    }

    const result = await documentService.downloadViaShareToken(token, metadata, passwordVerified);

    // Set headers for file download
    res.setHeader('Content-Type', result.document.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${result.document.file_name}"`);
    res.setHeader('Content-Length', result.document.file_size);

    // Stream file to response
    const fs = require('fs');
    const fileStream = fs.createReadStream(result.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error downloading file'
        });
      }
    });
  } catch (error) {
    if (error.message === 'Share link not found') {
      return res.status(404).json({
        success: false,
        error: 'Share link not found'
      });
    }
    if (error.message.includes('expired') || error.message.includes('revoked') || error.message.includes('limit')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

/**
 * GET /public/documents/:token/preview - Preview document (for images/PDFs)
 */
exports.previewDocument = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.query;
    const metadata = getRequestMetadata(req);

    // Check if the share is accessible
    const shareInfo = await documentService.getShareByToken(token);

    if (!shareInfo.is_accessible) {
      let errorMessage = 'This share link is not accessible';
      if (!shareInfo.is_active) errorMessage = 'This share link has been revoked';
      if (shareInfo.is_expired) errorMessage = 'This share link has expired';
      if (shareInfo.has_reached_limit) errorMessage = 'Download limit reached for this share link';

      return res.status(403).json({
        success: false,
        error: errorMessage
      });
    }

    // Verify password if protected
    let passwordVerified = !shareInfo.is_password_protected;
    if (shareInfo.is_password_protected) {
      if (!password) {
        return res.status(401).json({
          success: false,
          error: 'Password required',
          requires_password: true
        });
      }

      try {
        await documentService.verifySharePassword(token, password, metadata);
        passwordVerified = true;
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password'
        });
      }
    }

    // Get document info for preview (don't increment download count)
    const share = await documentService.getShareByToken(token);
    const document = share.document;

    // Only allow preview for images and PDFs
    const previewableMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!previewableMimeTypes.includes(document.mime_type)) {
      return res.status(400).json({
        success: false,
        error: 'Preview not available for this file type'
      });
    }

    // For preview, we need to get the file path
    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(process.cwd(), 'uploads', share.document.file_path || '');

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Document file not found'
      });
    }

    // Set headers for inline display
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${document.file_name}"`);

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error loading preview'
        });
      }
    });
  } catch (error) {
    if (error.message === 'Share link not found') {
      return res.status(404).json({
        success: false,
        error: 'Share link not found'
      });
    }
    next(error);
  }
};
