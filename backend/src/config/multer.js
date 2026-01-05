/**
 * Multer Configuration
 *
 * Configures file upload handling with security measures:
 * - File size limits
 * - MIME type validation
 * - Filename sanitization
 * - Organized storage structure
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Base uploads directory
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',

  // Documents
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
  'text/csv': '.csv',

  // Archives
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar'
};

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Ensure upload directory exists
 */
function ensureUploadDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Storage configuration
 * Organizes files by resource type and date
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get resource type from request (set by middleware)
    const resourceType = req.uploadResourceType || 'general';
    const dateFolder = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const uploadPath = path.join(UPLOADS_DIR, resourceType, dateFolder);
    ensureUploadDir(uploadPath);

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    // Generate UUID-based filename with original extension
    const uniqueId = uuidv4();
    const extension = ALLOWED_MIME_TYPES[file.mimetype] || path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;

    cb(null, filename);
  }
});

/**
 * File filter for MIME type validation
 */
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`
      ),
      false
    );
  }
};

/**
 * Main multer configuration
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Max 10 files per request
  }
});

/**
 * Middleware to set resource type for upload organization
 */
function setUploadResourceType(resourceType) {
  return (req, res, next) => {
    req.uploadResourceType = resourceType;
    next();
  };
}

/**
 * Delete file from filesystem
 */
function deleteFile(filePath) {
  try {
    const fullPath = path.join(UPLOADS_DIR, '..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

module.exports = {
  upload,
  setUploadResourceType,
  deleteFile,
  UPLOADS_DIR,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};
