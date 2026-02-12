/**
 * User Email Config Service
 * Manages per-user SMTP configuration
 */

const nodemailer = require('nodemailer');
const db = require('../../../models');
const UserEmailConfig = db.UserEmailConfig;
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * Get config for a user (returns null if none exists)
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function getConfig(userId) {
  return UserEmailConfig.findOne({ where: { user_id: userId } });
}

/**
 * Update (or create) config for a user
 * @param {string} userId
 * @param {Object} data - Config fields
 * @returns {Promise<Object>} Updated config
 */
async function updateConfig(userId, data) {
  let config = await UserEmailConfig.findOne({ where: { user_id: userId } });

  const updateData = {};
  const allowedFields = [
    'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user',
    'from_name', 'from_email', 'reply_to', 'is_active'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  // Handle password separately (encrypt it)
  const passwordChanged = data.smtp_password !== undefined && data.smtp_password !== '';
  if (passwordChanged) {
    updateData.smtp_password = encrypt(data.smtp_password);
  }

  // If SMTP credentials changed, reset verification
  const credentialFields = ['smtp_host', 'smtp_port', 'smtp_user'];
  const credentialsChanged = passwordChanged || credentialFields.some(f => data[f] !== undefined);
  if (credentialsChanged) {
    updateData.is_verified = false;
    updateData.verified_at = null;
  }

  if (config) {
    await config.update(updateData);
  } else {
    config = await UserEmailConfig.create({
      user_id: userId,
      ...updateData
    });
  }

  return config;
}

/**
 * Verify SMTP connection for a user's config
 * @param {string} userId
 * @returns {Promise<Object>} Verification result
 */
async function verifyConfig(userId) {
  const config = await getConfig(userId);
  if (!config) {
    throw new Error('No email configuration found');
  }

  if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
    throw new Error('Incomplete SMTP configuration');
  }

  const transporter = createTransporterFromConfig(config);

  try {
    await transporter.verify();
    await config.update({
      is_verified: true,
      verified_at: new Date()
    });
    return { success: true, message: 'SMTP connection verified' };
  } catch (error) {
    await config.update({
      is_verified: false,
      verified_at: null
    });
    throw new Error(`SMTP verification failed: ${error.message}`);
  }
}

/**
 * Send a test email using the user's SMTP config
 * @param {string} userId
 * @param {string} recipient - Email address to send test to
 * @returns {Promise<Object>}
 */
async function sendTestEmail(userId, recipient) {
  const config = await getConfig(userId);
  if (!config) {
    throw new Error('No email configuration found');
  }

  const transporter = createTransporterFromConfig(config);

  const fromName = config.from_name || 'NutriVault';
  const fromEmail = config.from_email || config.smtp_user;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: recipient,
    subject: 'NutriVault - Test email / Email de test',
    text: 'This is a test email from your NutriVault SMTP configuration.\n\nCeci est un email de test de votre configuration SMTP NutriVault.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4CAF50;">NutriVault - Configuration SMTP</h2>
        <p>This is a test email from your NutriVault SMTP configuration.</p>
        <p>Ceci est un email de test de votre configuration SMTP NutriVault.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #888; font-size: 12px;">If you received this email, your SMTP configuration is working correctly.</p>
      </div>
    `
  });

  // Mark as verified since we just successfully sent
  if (!config.is_verified) {
    await config.update({
      is_verified: true,
      verified_at: new Date()
    });
  }

  return { success: true, messageId: info.messageId };
}

/**
 * Delete a user's email config (return to global)
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function deleteConfig(userId) {
  const config = await getConfig(userId);
  if (!config) {
    throw new Error('No email configuration found');
  }
  await config.destroy();
  return true;
}

/**
 * Sanitize config for API response (remove password, add has_password flag)
 * @param {Object} config - UserEmailConfig instance
 * @returns {Object} Sanitized config
 */
function sanitizeConfig(config) {
  if (!config) return null;

  const json = config.toJSON();
  const hasPassword = !!json.smtp_password;
  delete json.smtp_password;
  json.has_password = hasPassword;
  return json;
}

/**
 * Create a nodemailer transporter from a UserEmailConfig instance
 * @param {Object} config - UserEmailConfig instance
 * @returns {Object} Nodemailer transporter
 */
function createTransporterFromConfig(config) {
  const password = config.smtp_password ? decrypt(config.smtp_password) : null;

  return nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port || 587,
    secure: config.smtp_secure || false,
    auth: {
      user: config.smtp_user,
      pass: password
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

module.exports = {
  getConfig,
  updateConfig,
  verifyConfig,
  sendTestEmail,
  deleteConfig,
  sanitizeConfig,
  createTransporterFromConfig
};
