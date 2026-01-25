/**
 * Follow-up Controller
 * US-5.5.5: AI-Generated Follow-ups
 *
 * Handles API endpoints for generating and sending AI follow-up emails
 */

const aiFollowupService = require('../services/aiFollowup.service');
const aiProviderService = require('../services/aiProvider.service');
const emailService = require('../services/email.service');
const auditService = require('../services/audit.service');
const db = require('../../../models');
const Visit = db.Visit;
const Patient = db.Patient;
const EmailLog = db.EmailLog;

/**
 * Generate AI follow-up content for a visit
 * POST /api/followups/generate/:visitId
 */
const generateFollowup = async (req, res) => {
  try {
    const { visitId } = req.params;
    const { language, tone, includeNextSteps, includeNextAppointment } = req.body;

    // Generate follow-up content
    const result = await aiFollowupService.generateFollowupContent(visitId, {
      language: language || 'fr',
      tone: tone || 'professional',
      includeNextSteps: includeNextSteps !== false,
      includeNextAppointment: includeNextAppointment !== false
    });

    // Audit log
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'GENERATE_FOLLOWUP',
      resource_type: 'visits',
      resource_id: visitId,
      details: {
        language,
        tone,
        model: result.metadata?.model
      },
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error generating follow-up:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to generate follow-up content'
    });
  }
};

/**
 * Send follow-up email to patient
 * POST /api/followups/send/:visitId
 */
const sendFollowup = async (req, res) => {
  try {
    const { visitId } = req.params;
    const { subject, body_html, body_text, ai_generated } = req.body;

    // Validate required fields
    if (!subject || !body_html) {
      return res.status(400).json({
        success: false,
        error: 'Subject and HTML body are required'
      });
    }

    // Get visit with patient details
    const visit = await Visit.findByPk(visitId, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email', 'language_preference']
        }
      ]
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    if (!visit.patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found for this visit'
      });
    }

    if (!visit.patient.email) {
      return res.status(400).json({
        success: false,
        error: 'Patient has no email address'
      });
    }

    // Send email
    const emailResult = await emailService.sendEmail({
      to: visit.patient.email,
      subject,
      html: body_html,
      text: body_text || ''
    });

    // Log the email
    const emailLog = await EmailLog.create({
      template_id: null,
      template_slug: 'ai_followup',
      sent_to: visit.patient.email,
      patient_id: visit.patient.id,
      subject,
      variables_used: {
        visit_id: visitId,
        ai_generated: ai_generated === true
      },
      status: emailResult.success ? 'sent' : 'failed',
      sent_by: req.user.id,
      sent_at: new Date(),
      language_code: visit.patient.language_preference || 'fr',
      error_message: emailResult.success ? null : emailResult.message
    });

    // Audit log
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'SEND_FOLLOWUP',
      resource_type: 'visits',
      resource_id: visitId,
      details: {
        patient_id: visit.patient.id,
        email: visit.patient.email,
        ai_generated: ai_generated === true,
        email_log_id: emailLog.id
      },
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: {
        message: 'Follow-up email sent successfully',
        emailLogId: emailLog.id,
        sentTo: visit.patient.email
      }
    });
  } catch (error) {
    console.error('Error sending follow-up:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send follow-up email'
    });
  }
};

/**
 * Get follow-up email history for a visit
 * GET /api/followups/history/:visitId
 */
const getFollowupHistory = async (req, res) => {
  try {
    const { visitId } = req.params;

    // Get visit to get patient ID
    const visit = await Visit.findByPk(visitId, {
      attributes: ['id', 'patient_id']
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    // Get email logs for this visit
    const emailLogs = await EmailLog.findAll({
      where: {
        template_slug: 'ai_followup'
      },
      order: [['sent_at', 'DESC']],
      limit: 20
    });

    // Filter by visit_id in variables_used
    const visitLogs = emailLogs.filter(log => {
      const variables = log.variables_used;
      return variables && variables.visit_id === visitId;
    });

    res.json({
      success: true,
      data: visitLogs.map(log => ({
        id: log.id,
        sent_at: log.sent_at,
        sent_to: log.sent_to,
        subject: log.subject,
        status: log.status,
        ai_generated: log.variables_used?.ai_generated || false
      }))
    });
  } catch (error) {
    console.error('Error fetching follow-up history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch follow-up history'
    });
  }
};

/**
 * Check if AI service is available
 * GET /api/followups/status
 */
const getAIStatus = async (req, res) => {
  try {
    const isAvailable = aiFollowupService.isAIAvailable();
    const config = await aiProviderService.getAIConfiguration();
    const providers = aiProviderService.getAvailableProviders();
    const languages = aiFollowupService.getSupportedLanguages();

    // Find current provider info
    const currentProvider = providers.find(p => p.id === config.provider);
    const currentModel = currentProvider?.models.find(m => m.id === config.model);

    res.json({
      success: true,
      data: {
        ai_available: isAvailable,
        current_provider: config.provider,
        current_model: config.model,
        provider_name: currentProvider?.name || config.provider,
        model_name: currentModel?.name || config.model,
        is_configured: currentProvider?.configured || false,
        supported_languages: languages,
        message: isAvailable
          ? `AI service ready (${currentProvider?.name || config.provider})`
          : 'AI service is not configured. Configure an API key in settings.'
      }
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check AI status'
    });
  }
};

module.exports = {
  generateFollowup,
  sendFollowup,
  getFollowupHistory,
  getAIStatus
};
