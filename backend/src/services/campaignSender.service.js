/**
 * Campaign Sender Service
 * Handles batch sending of campaign emails with rate limiting and tracking
 */

const { Op } = require('sequelize');
const db = require('../../../models');
const { EmailCampaign, EmailCampaignRecipient, Patient, EmailLog, User } = db;
const { sendEmail } = require('./email.service');
const { renderTemplate, buildVariableContext } = require('./templateRenderer.service');

// Configuration
const BATCH_SIZE = 10; // Number of emails to send per batch
const BATCH_DELAY_MS = 2000; // Delay between batches (2 seconds)
const EMAIL_DELAY_MS = 200; // Delay between individual emails (200ms)

/**
 * Process and send a campaign
 * @param {string} campaignId - Campaign ID to process
 */
async function processCampaign(campaignId) {
  console.log(`[CampaignSender] Starting to process campaign ${campaignId}`);

  const campaign = await EmailCampaign.findByPk(campaignId, {
    include: [{
      model: User,
      as: 'sender',
      attributes: ['id', 'first_name', 'last_name']
    }]
  });

  if (!campaign) {
    console.error(`[CampaignSender] Campaign ${campaignId} not found`);
    return;
  }

  if (campaign.status === 'cancelled') {
    console.log(`[CampaignSender] Campaign ${campaignId} was cancelled, skipping`);
    return;
  }

  try {
    // Update status to sending if not already
    if (campaign.status !== 'sending') {
      await campaign.update({ status: 'sending', sent_at: new Date() });
    }

    // Process recipients in batches
    let processed = 0;
    let hasMore = true;

    while (hasMore) {
      // Check if campaign was cancelled
      const currentCampaign = await EmailCampaign.findByPk(campaignId);
      if (currentCampaign.status === 'cancelled') {
        console.log(`[CampaignSender] Campaign ${campaignId} cancelled during processing`);
        return;
      }

      // Get next batch of pending recipients
      const recipients = await EmailCampaignRecipient.findAll({
        where: {
          campaign_id: campaignId,
          status: 'pending'
        },
        include: [{
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email', 'language_preference', 'unsubscribe_token', 'assigned_dietitian_id'],
          include: [{
            model: db.User,
            as: 'assigned_dietitian',
            attributes: ['id', 'first_name', 'last_name']
          }]
        }],
        limit: BATCH_SIZE
      });

      if (recipients.length === 0) {
        hasMore = false;
        continue;
      }

      // Process batch
      for (const recipient of recipients) {
        await sendToRecipient(campaign, recipient);
        processed++;

        // Small delay between emails
        await sleep(EMAIL_DELAY_MS);
      }

      console.log(`[CampaignSender] Campaign ${campaignId}: Processed ${processed} recipients`);

      // Delay between batches
      if (recipients.length === BATCH_SIZE) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Mark campaign as sent
    await campaign.update({ status: 'sent' });
    console.log(`[CampaignSender] Campaign ${campaignId} completed. Total sent: ${processed}`);

  } catch (error) {
    console.error(`[CampaignSender] Error processing campaign ${campaignId}:`, error);
    // Don't mark as failed - leave as sending so it can be resumed
  }
}

/**
 * Send email to a single recipient
 * @param {Object} campaign - Campaign object
 * @param {Object} recipient - Recipient record with patient data
 */
async function sendToRecipient(campaign, recipient) {
  try {
    const patient = recipient.patient;

    if (!patient) {
      await updateRecipientStatus(recipient.id, 'failed', 'Patient not found');
      return;
    }

    // Build personalized content
    const { subject, html, text } = buildPersonalizedEmail(campaign, patient);

    // Send email
    const result = await sendEmail({
      to: recipient.email,
      subject,
      html,
      text,
      sendingUserId: campaign.sender_id
    });

    if (result.success || result.messageId) {
      await updateRecipientStatus(recipient.id, 'sent');

      // Log the email
      await EmailLog.create({
        template_slug: `campaign_${campaign.id}`,
        email_type: 'campaign',
        sent_to: recipient.email,
        patient_id: patient.id,
        subject,
        body_html: html,
        body_text: text,
        variables_used: { campaign_id: campaign.id },
        status: 'sent',
        sent_at: new Date(),
        language_code: patient.language_preference || 'fr'
      });
    } else {
      await updateRecipientStatus(recipient.id, 'failed', result.message || 'Unknown error');
    }

  } catch (error) {
    console.error(`[CampaignSender] Error sending to ${recipient.email}:`, error.message);
    await updateRecipientStatus(recipient.id, 'failed', error.message);
  }
}

/**
 * Build personalized email content
 * @param {Object} campaign - Campaign object (with sender included)
 * @param {Object} patient - Patient object
 * @returns {Object} Personalized subject, html, and text
 */
function buildPersonalizedEmail(campaign, patient) {
  // Determine the dietitian name - use campaign sender if specified, otherwise patient's assigned dietitian
  let dietitianName = '';
  if (campaign.sender) {
    dietitianName = `${campaign.sender.first_name} ${campaign.sender.last_name}`;
  } else if (patient.assigned_dietitian) {
    dietitianName = `${patient.assigned_dietitian.first_name} ${patient.assigned_dietitian.last_name}`;
  }

  // Build variables for template
  const variables = {
    patient_first_name: patient.first_name,
    patient_last_name: patient.last_name,
    patient_email: patient.email,
    dietitian_name: dietitianName,
    unsubscribe_link: buildUnsubscribeLink(patient.unsubscribe_token)
  };

  // Replace variables in content
  let subject = campaign.subject;
  let html = campaign.body_html || '';
  let text = campaign.body_text || '';

  // Replace {{variable}} patterns
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    subject = subject.replace(pattern, value || '');
    html = html.replace(pattern, value || '');
    text = text.replace(pattern, value || '');
  }

  // Convert plain text to HTML if needed (no HTML tags detected)
  if (html && !/<[a-z][\s\S]*>/i.test(html)) {
    // It's plain text - convert line breaks to <br> and wrap in HTML
    html = convertPlainTextToHtml(html);
  }

  // Generate text version from HTML if not provided
  if (!text && html) {
    text = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  }

  // Add tracking pixel for open tracking
  const trackingPixel = buildTrackingPixel(patient.id, campaign.id);
  html = addTrackingPixel(html, trackingPixel);

  // Rewrite links for click tracking
  html = rewriteLinks(html, patient.id, campaign.id);

  // Ensure unsubscribe link is present
  if (!html.includes('unsubscribe') && !html.includes('désabonner')) {
    html = addUnsubscribeFooter(html, patient.unsubscribe_token);
  }

  return { subject, html, text };
}

/**
 * Build unsubscribe link
 * @param {string} token - Patient's unsubscribe token
 * @returns {string} Unsubscribe URL
 */
function buildUnsubscribeLink(token) {
  const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/unsubscribe/${token}`;
}

/**
 * Build tracking pixel URL
 * @param {string} patientId - Patient ID
 * @param {string} campaignId - Campaign ID
 * @returns {string} Tracking pixel URL
 */
function buildTrackingPixel(patientId, campaignId) {
  // Use FRONTEND_URL because nginx proxies /api to backend
  // This ensures tracking works in production where backend is not directly accessible
  const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/api/campaigns/track/open/${campaignId}/${patientId}`;
}

/**
 * Convert plain text to HTML
 * @param {string} text - Plain text content
 * @returns {string} HTML content with proper formatting
 */
function convertPlainTextToHtml(text) {
  // Escape HTML entities
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert line breaks to <br> tags
  html = html.replace(/\r\n/g, '\n').replace(/\n/g, '<br>\n');

  // Convert bullet points (• or - at start of line)
  html = html.replace(/<br>\n([•\-\*])\s/g, '<br>\n&nbsp;&nbsp;$1 ');

  // Wrap in a styled container
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background: #fff; padding: 20px; }
  </style>
</head>
<body>
  <div class="content">
    ${html}
  </div>
</body>
</html>`;
}

/**
 * Add tracking pixel to HTML
 * @param {string} html - HTML content
 * @param {string} pixelUrl - Tracking pixel URL
 * @returns {string} HTML with tracking pixel
 */
function addTrackingPixel(html, pixelUrl) {
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;visibility:hidden;" alt="" />`;

  // Add before closing body tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }

  // Or append at end
  return html + pixel;
}

/**
 * Rewrite links for click tracking
 * @param {string} html - HTML content
 * @param {string} patientId - Patient ID
 * @param {string} campaignId - Campaign ID
 * @returns {string} HTML with tracked links
 */
function rewriteLinks(html, patientId, campaignId) {
  // Use FRONTEND_URL because nginx proxies /api to backend
  // This ensures tracking works in production where backend is not directly accessible
  const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

  // Find all href attributes and rewrite them
  const linkPattern = /href="(https?:\/\/[^"]+)"/gi;

  return html.replace(linkPattern, (match, url) => {
    // Don't track unsubscribe links
    if (url.includes('unsubscribe')) {
      return match;
    }

    // Encode the original URL
    const encodedUrl = encodeURIComponent(url);
    const trackingUrl = `${baseUrl}/api/campaigns/track/click/${campaignId}/${patientId}?url=${encodedUrl}`;

    return `href="${trackingUrl}"`;
  });
}

/**
 * Add unsubscribe footer to HTML
 * @param {string} html - HTML content
 * @param {string} token - Unsubscribe token
 * @returns {string} HTML with unsubscribe footer
 */
function addUnsubscribeFooter(html, token) {
  const unsubscribeLink = buildUnsubscribeLink(token);
  const footer = `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #666;">
      <p>Vous recevez cet email car vous êtes inscrit(e) à notre newsletter.</p>
      <p><a href="${unsubscribeLink}" style="color: #666;">Se désabonner</a></p>
    </div>
  `;

  // Add before closing body tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }

  return html + footer;
}

/**
 * Update recipient status
 * @param {string} recipientId - Recipient ID
 * @param {string} status - New status
 * @param {string} errorMessage - Error message (if failed)
 */
async function updateRecipientStatus(recipientId, status, errorMessage = null) {
  const updateData = {
    status,
    ...(status === 'sent' && { sent_at: new Date() }),
    ...(errorMessage && { error_message: errorMessage })
  };

  await EmailCampaignRecipient.update(updateData, {
    where: { id: recipientId }
  });
}

/**
 * Track email open
 * @param {string} campaignId - Campaign ID
 * @param {string} patientId - Patient ID
 */
async function trackOpen(campaignId, patientId) {
  try {
    // Find recipient and update opened_at if not already set
    await EmailCampaignRecipient.update(
      { opened_at: db.sequelize.literal('COALESCE(opened_at, CURRENT_TIMESTAMP)') },
      {
        where: {
          campaign_id: campaignId,
          patient_id: patientId,
          opened_at: null
        }
      }
    );
  } catch (error) {
    console.error('[CampaignSender] Error tracking open:', error.message);
  }
}

/**
 * Track link click
 * @param {string} campaignId - Campaign ID
 * @param {string} patientId - Patient ID
 * @returns {Promise<void>}
 */
async function trackClick(campaignId, patientId) {
  try {
    // Update clicked_at if not already set
    await EmailCampaignRecipient.update(
      { clicked_at: db.sequelize.literal('COALESCE(clicked_at, CURRENT_TIMESTAMP)') },
      {
        where: {
          campaign_id: campaignId,
          patient_id: patientId,
          clicked_at: null
        }
      }
    );

    // Also mark as opened if not already
    await trackOpen(campaignId, patientId);
  } catch (error) {
    console.error('[CampaignSender] Error tracking click:', error.message);
  }
}

/**
 * Process unsubscribe request
 * @param {string} token - Unsubscribe token
 * @returns {Promise<Object>} Result
 */
async function processUnsubscribe(token) {
  const patient = await Patient.findOne({
    where: { unsubscribe_token: token }
  });

  if (!patient) {
    throw new Error('Invalid unsubscribe token');
  }

  await patient.update({
    appointment_reminders_enabled: false
  });

  return {
    success: true,
    message: 'Successfully unsubscribed',
    patientName: `${patient.first_name} ${patient.last_name}`
  };
}

/**
 * Check for scheduled campaigns that need to be sent
 * Called by scheduler
 */
async function processScheduledCampaigns() {
  console.log('[CampaignSender] Checking for scheduled campaigns...');
  const now = new Date();
  console.log(`[CampaignSender] Current time: ${now.toISOString()}`);

  const campaigns = await EmailCampaign.findAll({
    where: {
      status: 'scheduled',
      scheduled_at: { [Op.lte]: now },
      is_active: true
    }
  });

  console.log(`[CampaignSender] Found ${campaigns.length} scheduled campaigns ready to send`);

  for (const campaign of campaigns) {
    try {
      await campaign.update({ status: 'sending', sent_at: new Date() });
      processCampaign(campaign.id).catch(err => {
        console.error(`[CampaignSender] Error processing campaign ${campaign.id}:`, err);
      });
    } catch (error) {
      console.error(`[CampaignSender] Error starting campaign ${campaign.id}:`, error);
    }
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  processCampaign,
  sendToRecipient,
  trackOpen,
  trackClick,
  processUnsubscribe,
  processScheduledCampaigns,
  buildPersonalizedEmail
};
