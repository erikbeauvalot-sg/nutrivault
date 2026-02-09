/**
 * Campaign Controller
 *
 * HTTP request handlers for email campaign management.
 */

const campaignService = require('../services/campaign.service');
const campaignSenderService = require('../services/campaignSender.service');
const auditService = require('../services/audit.service');

/**
 * GET /api/campaigns - Get all campaigns
 */
exports.getAllCampaigns = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      campaign_type: req.query.campaign_type,
      search: req.query.search
    };
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await campaignService.getCampaigns(filters, pagination, req.user);

    res.json({
      success: true,
      data: result.campaigns,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/campaigns/segment-fields - Get available segment fields
 */
exports.getSegmentFields = async (req, res, next) => {
  try {
    const fields = await campaignService.getSegmentFields();

    res.json({
      success: true,
      data: fields
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/campaigns/:id - Get campaign by ID
 */
exports.getCampaignById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await campaignService.getCampaign(id, req.user);

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    if (error.message === 'Campaign not found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    next(error);
  }
};

/**
 * POST /api/campaigns - Create new campaign
 */
exports.createCampaign = async (req, res, next) => {
  try {
    const data = req.body;
    const user = req.user;

    const campaign = await campaignService.createCampaign(data, user);

    auditService.log({
      user_id: user.id, username: user.username,
      action: 'CREATE', resource_type: 'campaigns', resource_id: campaign.id,
      changes: { name: campaign.name },
      ip_address: req.ip, request_method: req.method, request_path: req.originalUrl
    }).catch(() => {});

    res.status(201).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/campaigns/:id - Update campaign
 */
exports.updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const user = req.user;

    const campaign = await campaignService.updateCampaign(id, data, user);

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    if (error.message === 'Campaign not found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    if (error.message.includes('cannot be edited')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/campaigns/:id - Delete campaign
 */
exports.deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    await campaignService.deleteCampaign(id, user);

    auditService.log({
      user_id: user.id, username: user.username,
      action: 'DELETE', resource_type: 'campaigns', resource_id: id,
      ip_address: req.ip, request_method: req.method, request_path: req.originalUrl
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    if (error.message === 'Campaign not found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    next(error);
  }
};

/**
 * POST /api/campaigns/:id/duplicate - Duplicate campaign
 */
exports.duplicateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const campaign = await campaignService.duplicateCampaign(id, user);

    res.status(201).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    if (error.message === 'Campaign not found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    next(error);
  }
};

/**
 * POST /api/campaigns/:id/preview-audience - Preview campaign audience
 */
exports.previewCampaignAudience = async (req, res, next) => {
  try {
    const { id } = req.params;

    const preview = await campaignService.previewCampaignAudience(id);

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    if (error.message === 'Campaign not found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    next(error);
  }
};

/**
 * POST /api/campaigns/preview-audience - Preview audience for criteria (without campaign)
 */
exports.previewAudienceCriteria = async (req, res, next) => {
  try {
    const criteria = req.body.criteria || req.body;

    const preview = await campaignService.previewAudienceCriteria(criteria);

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/campaigns/:id/send - Send campaign immediately
 */
exports.sendCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const campaign = await campaignService.sendCampaignNow(id, user);

    auditService.log({
      user_id: user.id, username: user.username,
      action: 'SEND', resource_type: 'campaigns', resource_id: id,
      changes: { name: campaign.name },
      ip_address: req.ip, request_method: req.method, request_path: req.originalUrl
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Campaign is being sent',
      data: campaign
    });
  } catch (error) {
    if (error.message === 'Campaign not found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    if (error.message.includes('cannot be sent') || error.message.includes('No recipients')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

/**
 * POST /api/campaigns/:id/schedule - Schedule campaign
 */
exports.scheduleCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduled_at } = req.body;
    const user = req.user;

    if (!scheduled_at) {
      return res.status(400).json({
        success: false,
        error: 'Scheduled time is required'
      });
    }

    const campaign = await campaignService.scheduleCampaign(id, scheduled_at, user);

    auditService.log({
      user_id: user.id, username: user.username,
      action: 'SCHEDULE', resource_type: 'campaigns', resource_id: id,
      changes: { name: campaign.name, scheduled_at },
      ip_address: req.ip, request_method: req.method, request_path: req.originalUrl
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Campaign scheduled successfully',
      data: campaign
    });
  } catch (error) {
    if (error.message === 'Campaign not found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    if (error.message.includes('cannot be scheduled') || error.message.includes('must be in the future') || error.message.includes('No recipients')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

/**
 * POST /api/campaigns/:id/cancel - Cancel campaign
 */
exports.cancelCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const campaign = await campaignService.cancelCampaign(id, user);

    auditService.log({
      user_id: user.id, username: user.username,
      action: 'CANCEL', resource_type: 'campaigns', resource_id: id,
      changes: { name: campaign.name },
      ip_address: req.ip, request_method: req.method, request_path: req.originalUrl
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Campaign cancelled successfully',
      data: campaign
    });
  } catch (error) {
    if (error.message === 'Campaign not found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    if (error.message.includes('cannot be cancelled')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

/**
 * GET /api/campaigns/:id/stats - Get campaign statistics
 */
exports.getCampaignStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stats = await campaignService.getCampaignStats(id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    if (error.message === 'Campaign not found') {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    next(error);
  }
};

/**
 * GET /api/campaigns/:id/recipients - Get campaign recipients
 */
exports.getCampaignRecipients = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filters = {
      status: req.query.status,
      search: req.query.search
    };
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50
    };

    const result = await campaignService.getCampaignRecipients(id, filters, pagination);

    res.json({
      success: true,
      data: result.recipients,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/campaigns/track/open/:campaignId/:patientId - Track email open (1x1 pixel)
 */
exports.trackOpen = async (req, res, next) => {
  try {
    const { campaignId, patientId } = req.params;

    // Track asynchronously
    campaignSenderService.trackOpen(campaignId, patientId).catch(err => {
      console.error('Error tracking email open:', err);
    });

    // Return transparent 1x1 GIF
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    res.set({
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.send(pixel);
  } catch (error) {
    // Return pixel anyway to not break email rendering
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  }
};

/**
 * GET /api/campaigns/track/click/:campaignId/:patientId - Track link click
 */
exports.trackClick = async (req, res, next) => {
  try {
    const { campaignId, patientId } = req.params;
    const { url } = req.query;

    if (!url) {
      return res.status(400).send('Missing redirect URL');
    }

    // Track asynchronously
    campaignSenderService.trackClick(campaignId, patientId).catch(err => {
      console.error('Error tracking email click:', err);
    });

    // Redirect to original URL
    const decodedUrl = decodeURIComponent(url);
    res.redirect(302, decodedUrl);
  } catch (error) {
    // Still try to redirect
    const { url } = req.query;
    if (url) {
      res.redirect(302, decodeURIComponent(url));
    } else {
      next(error);
    }
  }
};

/**
 * GET /api/campaigns/unsubscribe/:token - Process unsubscribe
 */
exports.unsubscribe = async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await campaignSenderService.processUnsubscribe(token);

    // Return HTML page for browser display
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Désabonnement - NutriVault</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 500px;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✅</div>
          <h1>Désabonnement confirmé</h1>
          <p>Vous avez été désabonné(e) avec succès de nos communications par email.</p>
          <p>Vous ne recevrez plus de newsletters ni d'emails promotionnels de notre part.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    if (error.message === 'Invalid unsubscribe token') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Erreur - NutriVault</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            .icon {
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 {
              color: #d32f2f;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>Lien invalide</h1>
            <p>Ce lien de désabonnement n'est pas valide ou a expiré.</p>
            <p>Si vous souhaitez vous désabonner, veuillez nous contacter directement.</p>
          </div>
        </body>
        </html>
      `);
    }
    next(error);
  }
};
