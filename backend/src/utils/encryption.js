/**
 * Encryption Utility
 * AES-256-GCM encryption/decryption for sensitive data (SMTP passwords)
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key (32 bytes for AES-256)
 */
function getKey() {
  const raw = process.env.SMTP_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!raw) {
    throw new Error('No encryption key available. Set SMTP_ENCRYPTION_KEY or JWT_SECRET.');
  }
  // Hash to ensure exactly 32 bytes
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a plaintext string
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Encrypted string in format: iv:authTag:encrypted (hex)
 */
function encrypt(text) {
  if (!text) return null;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * @param {string} encryptedText - Encrypted string in format: iv:authTag:encrypted (hex)
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const key = getKey();
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { encrypt, decrypt };
