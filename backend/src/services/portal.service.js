/**
 * Portal Service
 * Handles patient portal lifecycle: activation, invitation, password setup, deactivation
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../../../models');
const { sendEmail } = require('./email.service');

const INVITATION_EXPIRY_HOURS = 72;
const SALT_ROUNDS = 12;

/**
 * Activate patient portal - creates User account, generates invitation token, sends email
 * @param {string} patientId - Patient UUID
 * @param {string} invitedByUserId - User who is activating the portal
 * @returns {Object} Portal status
 */
async function activatePortal(patientId, invitedByUserId) {
  const patient = await db.Patient.findByPk(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  if (!patient.email) {
    throw new Error('Patient must have an email address to activate the portal');
  }

  // Check if portal is already activated
  if (patient.user_id) {
    const existingUser = await db.User.findByPk(patient.user_id);
    if (existingUser && existingUser.is_active) {
      throw new Error('Portal is already active for this patient');
    }
    // If user exists but is deactivated, use reactivatePortal instead
    if (existingUser && !existingUser.is_active) {
      throw new Error('Portal is deactivated. Use reactivate instead.');
    }
  }

  // Get PATIENT role
  const patientRole = await db.Role.findOne({ where: { name: 'PATIENT' } });
  if (!patientRole) {
    throw new Error('PATIENT role not found. Please run database migrations.');
  }

  // Only check email conflict among other PATIENT users (same email is allowed for dietitian + patient)
  const existingPatientUser = await db.User.findOne({
    where: {
      email: patient.email.trim().toLowerCase(),
      role_id: patientRole.id
    }
  });
  if (existingPatientUser) {
    throw new Error('Another patient portal account already uses this email address.');
  }

  // Generate invitation token
  const invitationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITATION_EXPIRY_HOURS);

  // Create User account with a temporary random password (will be set by patient)
  const tempPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

  // If email/username already taken by another role (e.g. dietitian uses same email),
  // use a sub-addressed email (user+patient@domain) to stay unique AND pass isEmail validation.
  // The login service finds PATIENT users by querying the linked patient's email.
  const normalizedEmail = patient.email.trim().toLowerCase();
  const existingByUsername = await db.User.findOne({ where: { username: normalizedEmail } });
  const existingByEmail = await db.User.findOne({ where: { email: normalizedEmail } });
  const needsAlias = !!(existingByUsername || existingByEmail);
  let username, userEmail;
  if (needsAlias) {
    const [local, domain] = normalizedEmail.split('@');
    userEmail = `${local}+patient@${domain}`;
    username = userEmail;
  } else {
    userEmail = normalizedEmail;
    username = normalizedEmail;
  }

  const portalUser = await db.User.create({
    username,
    email: userEmail,
    password_hash: passwordHash,
    role_id: patientRole.id,
    first_name: patient.first_name,
    last_name: patient.last_name,
    phone: patient.phone,
    is_active: true,
    language_preference: patient.language_preference || 'fr'
  });

  // Link User to Patient
  await patient.update({
    user_id: portalUser.id,
    portal_invitation_token: invitationToken,
    portal_invitation_expires_at: expiresAt
  });

  // Send invitation email
  await sendPortalInvitationEmail(patient, invitationToken);

  return getPortalStatus(patientId);
}

/**
 * Deactivate patient portal
 * @param {string} patientId - Patient UUID
 */
async function deactivatePortal(patientId) {
  const patient = await db.Patient.findByPk(patientId);
  if (!patient || !patient.user_id) {
    throw new Error('Portal is not active for this patient');
  }

  const portalUser = await db.User.findByPk(patient.user_id);
  if (!portalUser) {
    throw new Error('Portal user account not found');
  }

  await portalUser.update({ is_active: false });

  return getPortalStatus(patientId);
}

/**
 * Reactivate patient portal
 * @param {string} patientId - Patient UUID
 */
async function reactivatePortal(patientId) {
  const patient = await db.Patient.findByPk(patientId);
  if (!patient || !patient.user_id) {
    throw new Error('Portal was never activated for this patient');
  }

  const portalUser = await db.User.findByPk(patient.user_id);
  if (!portalUser) {
    throw new Error('Portal user account not found');
  }

  if (portalUser.is_active) {
    throw new Error('Portal is already active');
  }

  await portalUser.update({ is_active: true });

  return getPortalStatus(patientId);
}

/**
 * Set password from invitation token (public endpoint)
 * @param {string} token - Invitation token
 * @param {string} newPassword - New password
 */
async function setPasswordFromInvitation(token, newPassword) {
  if (!token || !newPassword) {
    throw new Error('Token and password are required');
  }

  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const patient = await db.Patient.findOne({
    where: { portal_invitation_token: token }
  });

  if (!patient) {
    throw new Error('Invalid or expired invitation token');
  }

  if (patient.portal_invitation_expires_at && new Date(patient.portal_invitation_expires_at) < new Date()) {
    throw new Error('Invitation token has expired. Please ask your dietitian to resend the invitation.');
  }

  if (!patient.user_id) {
    throw new Error('Portal user account not found');
  }

  const portalUser = await db.User.findByPk(patient.user_id);
  if (!portalUser) {
    throw new Error('Portal user account not found');
  }

  // Hash and set password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await portalUser.update({ password_hash: passwordHash });

  // Clear token and set activation date
  await patient.update({
    portal_invitation_token: null,
    portal_invitation_expires_at: null,
    portal_activated_at: new Date()
  });

  return { success: true, message: 'Password set successfully. You can now log in.' };
}

/**
 * Resend invitation email with a new token
 * @param {string} patientId - Patient UUID
 */
async function resendInvitation(patientId) {
  const patient = await db.Patient.findByPk(patientId);
  if (!patient || !patient.user_id) {
    throw new Error('Portal is not active for this patient');
  }

  if (!patient.email) {
    throw new Error('Patient does not have an email address');
  }

  // Generate new token
  const invitationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITATION_EXPIRY_HOURS);

  await patient.update({
    portal_invitation_token: invitationToken,
    portal_invitation_expires_at: expiresAt
  });

  // Send email
  await sendPortalInvitationEmail(patient, invitationToken);

  return getPortalStatus(patientId);
}

/**
 * Get portal status for a patient
 * @param {string} patientId - Patient UUID
 * @returns {Object} Portal status
 */
async function getPortalStatus(patientId) {
  const patient = await db.Patient.findByPk(patientId, {
    include: [{
      model: db.User,
      as: 'portalUser',
      attributes: ['id', 'email', 'is_active', 'last_login', 'created_at']
    }]
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  if (!patient.user_id || !patient.portalUser) {
    return {
      status: 'not_activated',
      portal_user: null,
      invitation_pending: false,
      activated_at: null
    };
  }

  const portalUser = patient.portalUser;
  const hasPendingInvitation = !!patient.portal_invitation_token &&
    patient.portal_invitation_expires_at &&
    new Date(patient.portal_invitation_expires_at) > new Date();

  let status;
  if (!portalUser.is_active) {
    status = 'deactivated';
  } else if (!patient.portal_activated_at) {
    status = 'invitation_pending';
  } else {
    status = 'active';
  }

  return {
    status,
    portal_user: {
      id: portalUser.id,
      email: portalUser.email,
      is_active: portalUser.is_active,
      last_login: portalUser.last_login,
      created_at: portalUser.created_at
    },
    invitation_pending: hasPendingInvitation,
    invitation_expires_at: patient.portal_invitation_expires_at,
    activated_at: patient.portal_activated_at
  };
}

/**
 * Send portal invitation email
 * @param {Object} patient - Patient record
 * @param {string} token - Invitation token
 */
async function sendPortalInvitationEmail(patient, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const activationLink = `${frontendUrl}/portal/set-password?token=${token}`;

  const subject = 'Bienvenue sur votre portail patient NutriVault';

  const text = `
Bonjour ${patient.first_name} ${patient.last_name},

Votre diététicien(ne) vous a donné accès au portail patient NutriVault.

Vous pourrez consulter vos mesures, vos consultations, vos documents et vos recettes.

Pour activer votre accès, veuillez définir votre mot de passe en cliquant sur le lien suivant :
${activationLink}

Ce lien est valable ${INVITATION_EXPIRY_HOURS} heures.

Votre identifiant de connexion sera : ${patient.email}

Cordialement,
L'équipe NutriVault
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2d5016 0%, #4a7c25 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 30px; background-color: #f9f9f9; }
    .cta-button { display: inline-block; background: #4a7c25; color: white !important; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .info-box { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4a7c25; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌱 Bienvenue sur NutriVault</h1>
      <p>Votre portail patient</p>
    </div>
    <div class="content">
      <p>Bonjour <strong>${patient.first_name} ${patient.last_name}</strong>,</p>
      <p>Votre diététicien(ne) vous a donné accès au portail patient NutriVault.</p>
      <p>Vous pourrez consulter :</p>
      <ul>
        <li>📊 Vos mesures et leur évolution</li>
        <li>📋 L'historique de vos consultations</li>
        <li>📄 Vos documents partagés</li>
        <li>🍽️ Vos recettes personnalisées</li>
      </ul>

      <div style="text-align: center;">
        <a href="${activationLink}" class="cta-button">Définir mon mot de passe</a>
      </div>

      <div class="info-box">
        <p><strong>Votre identifiant :</strong> ${patient.email}</p>
        <p><strong>Validité du lien :</strong> ${INVITATION_EXPIRY_HOURS} heures</p>
      </div>

      <p>Si vous n'avez pas demandé cet accès, veuillez ignorer cet email.</p>
      <p>Cordialement,<br><strong>L'équipe NutriVault</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un email automatique. Veuillez ne pas répondre à ce message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: patient.email,
    subject,
    text,
    html
  });
}

/**
 * Send password reset email for portal patient
 * Generates a new invitation token and sends a reset link
 * @param {string} patientId - Patient UUID
 * @returns {Object} Portal status
 */
async function sendPasswordReset(patientId) {
  const patient = await db.Patient.findByPk(patientId);
  if (!patient || !patient.user_id) {
    throw new Error('Portal is not active for this patient');
  }

  if (!patient.email) {
    throw new Error('Patient does not have an email address');
  }

  const portalUser = await db.User.findByPk(patient.user_id);
  if (!portalUser || !portalUser.is_active) {
    throw new Error('Portal user account is not active');
  }

  // Generate new token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITATION_EXPIRY_HOURS);

  await patient.update({
    portal_invitation_token: resetToken,
    portal_invitation_expires_at: expiresAt
  });

  // Send reset email
  await sendPasswordResetEmail(patient, resetToken);

  return getPortalStatus(patientId);
}

/**
 * Send password reset email
 * @param {Object} patient - Patient record
 * @param {string} token - Reset token
 */
async function sendPasswordResetEmail(patient, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/portal/set-password?token=${token}`;

  const subject = 'Réinitialisation de votre mot de passe NutriVault';

  const text = `
Bonjour ${patient.first_name} ${patient.last_name},

Une demande de réinitialisation de mot de passe a été effectuée pour votre compte patient NutriVault.

Pour définir un nouveau mot de passe, cliquez sur le lien suivant :
${resetLink}

Ce lien est valable ${INVITATION_EXPIRY_HOURS} heures.

Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.

Cordialement,
L'équipe NutriVault
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2d5016 0%, #4a7c25 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 30px; background-color: #f9f9f9; }
    .cta-button { display: inline-block; background: #4a7c25; color: white !important; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .info-box { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4a7c25; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔑 Réinitialisation du mot de passe</h1>
      <p>Portail patient NutriVault</p>
    </div>
    <div class="content">
      <p>Bonjour <strong>${patient.first_name} ${patient.last_name}</strong>,</p>
      <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte.</p>

      <div style="text-align: center;">
        <a href="${resetLink}" class="cta-button">Définir un nouveau mot de passe</a>
      </div>

      <div class="info-box">
        <p><strong>Votre identifiant :</strong> ${patient.email}</p>
        <p><strong>Validité du lien :</strong> ${INVITATION_EXPIRY_HOURS} heures</p>
      </div>

      <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email. Votre mot de passe actuel reste inchangé.</p>
      <p>Cordialement,<br><strong>L'équipe NutriVault</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un email automatique. Veuillez ne pas répondre à ce message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: patient.email,
    subject,
    text,
    html
  });
}

module.exports = {
  activatePortal,
  deactivatePortal,
  reactivatePortal,
  setPasswordFromInvitation,
  resendInvitation,
  sendPasswordReset,
  getPortalStatus,
  sendPortalInvitationEmail
};
