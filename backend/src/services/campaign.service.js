/**
 * Campaign Service
 * CRUD operations and campaign management for email marketing
 */

const { Op } = require('sequelize');
const db = require('../../../models');
const { EmailCampaign, EmailCampaignRecipient, User, Patient } = db;
const audienceSegmentService = require('./audienceSegment.service');
const { getScopedDietitianIds } = require('../helpers/scopeHelper');

/**
 * Create a new campaign
 * @param {Object} data - Campaign data
 * @param {Object} user - User creating the campaign
 * @returns {Promise<Object>} Created campaign
 */
async function createCampaign(data, user) {
  const campaign = await EmailCampaign.create({
    name: data.name,
    subject: data.subject,
    body_html: data.body_html || null,
    body_text: data.body_text || null,
    status: 'draft',
    campaign_type: data.campaign_type || 'newsletter',
    target_audience: data.target_audience || {},
    created_by: user.id,
    sender_id: data.sender_id || null
  });

  return getCampaign(campaign.id);
}

/**
 * Update an existing campaign
 * @param {string} id - Campaign ID
 * @param {Object} data - Update data
 * @param {Object} user - User performing update
 * @returns {Promise<Object>} Updated campaign
 */
async function updateCampaign(id, data, user) {
  const campaign = await EmailCampaign.findByPk(id);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // RBAC: Check access
  const hasAccess = await canAccessCampaign(campaign, user);
  if (!hasAccess) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  if (!campaign.canEdit()) {
    throw new Error('Campaign cannot be edited in its current status');
  }

  const allowedFields = [
    'name', 'subject', 'body_html', 'body_text',
    'campaign_type', 'target_audience', 'scheduled_at', 'sender_id'
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      // Convert empty string to null for foreign key fields
      if (field === 'sender_id' && data[field] === '') {
        updateData[field] = null;
      } else {
        updateData[field] = data[field];
      }
    }
  }

  await campaign.update(updateData);
  return getCampaign(id);
}

/**
 * Delete a campaign (soft delete)
 * @param {string} id - Campaign ID
 * @param {Object} user - User performing deletion
 * @returns {Promise<boolean>} Success status
 */
async function deleteCampaign(id, user) {
  const campaign = await EmailCampaign.findByPk(id);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // RBAC: Check access
  const hasAccess = await canAccessCampaign(campaign, user);
  if (!hasAccess) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  if (campaign.status === 'sending') {
    throw new Error('Cannot delete a campaign that is currently sending');
  }

  await campaign.update({ is_active: false });
  return true;
}

/**
 * Check if user can access a campaign (by created_by scoping)
 * @param {Object} campaign - Campaign object
 * @param {Object} user - Authenticated user
 * @returns {Promise<boolean>}
 */
async function canAccessCampaign(campaign, user) {
  if (!user) return true; // No user context (internal call)
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds === null) return true; // ADMIN
  if (dietitianIds.length === 0) return false;
  return dietitianIds.includes(campaign.created_by);
}

/**
 * Get a single campaign by ID
 * @param {string} id - Campaign ID
 * @param {Object} user - Authenticated user (optional, for RBAC)
 * @returns {Promise<Object>} Campaign with stats
 */
async function getCampaign(id, user = null) {
  const campaign = await EmailCampaign.findByPk(id, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'first_name', 'last_name', 'email']
      },
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }
    ]
  });

  if (!campaign || !campaign.is_active) {
    throw new Error('Campaign not found');
  }

  // RBAC: Check access
  if (user) {
    const hasAccess = await canAccessCampaign(campaign, user);
    if (!hasAccess) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      throw error;
    }
  }

  // Get recipient stats
  const stats = await getRecipientStats(id);

  return {
    ...campaign.toJSON(),
    stats
  };
}

/**
 * Get campaigns list with filters and pagination
 * @param {Object} filters - Filter options
 * @param {Object} pagination - Pagination options
 * @param {Object} user - Authenticated user object
 * @returns {Promise<Object>} Campaigns list with pagination info
 */
async function getCampaigns(filters = {}, pagination = {}, user = null) {
  const { status, campaign_type, search } = filters;
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  const where = { is_active: true };

  // RBAC: Scope campaigns by creator
  // DIETITIAN sees only their own campaigns; ASSISTANT sees linked dietitians' campaigns; ADMIN sees all
  if (user) {
    const dietitianIds = await getScopedDietitianIds(user);
    if (dietitianIds !== null) {
      if (dietitianIds.length === 0) {
        return { campaigns: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      }
      where.created_by = { [Op.in]: dietitianIds };
    }
  }

  if (status) {
    where.status = status;
  }

  if (campaign_type) {
    where.campaign_type = campaign_type;
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { subject: { [Op.like]: `%${search}%` } }
    ];
  }

  const { count, rows } = await EmailCampaign.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'first_name', 'last_name']
      },
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'first_name', 'last_name']
      }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  // Get stats for each campaign
  const campaignsWithStats = await Promise.all(
    rows.map(async (campaign) => {
      const stats = await getRecipientStats(campaign.id);
      return {
        ...campaign.toJSON(),
        stats
      };
    })
  );

  return {
    campaigns: campaignsWithStats,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
}

/**
 * Duplicate a campaign
 * @param {string} id - Campaign ID to duplicate
 * @param {Object} user - User performing duplication
 * @returns {Promise<Object>} New campaign
 */
async function duplicateCampaign(id, user) {
  const original = await EmailCampaign.findByPk(id);

  if (!original || !original.is_active) {
    throw new Error('Campaign not found');
  }

  const newCampaign = await EmailCampaign.create({
    name: `${original.name} (copie)`,
    subject: original.subject,
    body_html: original.body_html,
    body_text: original.body_text,
    status: 'draft',
    campaign_type: original.campaign_type,
    target_audience: original.target_audience,
    created_by: user.id
  });

  return getCampaign(newCampaign.id);
}

/**
 * Preview audience for a campaign
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Audience preview
 */
async function previewCampaignAudience(id) {
  const campaign = await EmailCampaign.findByPk(id);

  if (!campaign || !campaign.is_active) {
    throw new Error('Campaign not found');
  }

  return audienceSegmentService.previewAudience(campaign.target_audience, 10);
}

/**
 * Preview audience for given criteria (without saving)
 * @param {Object} criteria - Audience criteria
 * @returns {Promise<Object>} Audience preview
 */
async function previewAudienceCriteria(criteria) {
  return audienceSegmentService.previewAudience(criteria, 10);
}

/**
 * Schedule a campaign for sending
 * @param {string} id - Campaign ID
 * @param {Date} scheduledAt - Scheduled send time
 * @param {Object} user - User scheduling the campaign
 * @returns {Promise<Object>} Updated campaign
 */
async function scheduleCampaign(id, scheduledAt, user) {
  const campaign = await EmailCampaign.findByPk(id);

  if (!campaign || !campaign.is_active) {
    throw new Error('Campaign not found');
  }

  if (!['draft', 'scheduled'].includes(campaign.status)) {
    throw new Error('Campaign cannot be scheduled in its current status');
  }

  // Validate scheduled time is in the future
  const scheduleDate = new Date(scheduledAt);
  if (scheduleDate <= new Date()) {
    throw new Error('Scheduled time must be in the future');
  }

  // Prepare recipients
  await prepareRecipients(campaign);

  await campaign.update({
    status: 'scheduled',
    scheduled_at: scheduleDate
  });

  return getCampaign(id);
}

/**
 * Send a campaign immediately
 * @param {string} id - Campaign ID
 * @param {Object} user - User sending the campaign
 * @returns {Promise<Object>} Updated campaign
 */
async function sendCampaignNow(id, user) {
  const campaign = await EmailCampaign.findByPk(id);

  if (!campaign || !campaign.is_active) {
    throw new Error('Campaign not found');
  }

  if (!campaign.canSend()) {
    throw new Error('Campaign cannot be sent - missing required fields or invalid status');
  }

  // Prepare recipients
  await prepareRecipients(campaign);

  await campaign.update({
    status: 'sending',
    sent_at: new Date()
  });

  // Trigger async sending (will be handled by campaignSender service)
  const campaignSenderService = require('./campaignSender.service');
  campaignSenderService.processCampaign(id).catch(err => {
    console.error(`Error processing campaign ${id}:`, err);
  });

  return getCampaign(id);
}

/**
 * Cancel a scheduled or sending campaign
 * @param {string} id - Campaign ID
 * @param {Object} user - User cancelling the campaign
 * @returns {Promise<Object>} Updated campaign
 */
async function cancelCampaign(id, user) {
  const campaign = await EmailCampaign.findByPk(id);

  if (!campaign || !campaign.is_active) {
    throw new Error('Campaign not found');
  }

  if (!campaign.canCancel()) {
    throw new Error('Campaign cannot be cancelled in its current status');
  }

  await campaign.update({
    status: 'cancelled'
  });

  return getCampaign(id);
}

/**
 * Prepare recipients for a campaign based on target audience
 * @param {Object} campaign - Campaign object
 */
async function prepareRecipients(campaign) {
  // Delete existing pending recipients (in case of re-scheduling)
  await EmailCampaignRecipient.destroy({
    where: {
      campaign_id: campaign.id,
      status: 'pending'
    }
  });

  // Get patients matching criteria
  const patients = await audienceSegmentService.getPatientsBySegment(
    campaign.target_audience,
    { limit: 10000 } // Max recipients
  );

  if (patients.length === 0) {
    throw new Error('No recipients found matching the audience criteria');
  }

  // Create recipient records
  const recipients = patients.map(patient => ({
    campaign_id: campaign.id,
    patient_id: patient.id,
    email: patient.email,
    status: 'pending'
  }));

  await EmailCampaignRecipient.bulkCreate(recipients, {
    ignoreDuplicates: true
  });

  // Update campaign recipient count
  await campaign.update({
    recipient_count: recipients.length
  });

  return recipients.length;
}

/**
 * Get recipient stats for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Stats object
 */
async function getRecipientStats(campaignId) {
  const stats = await EmailCampaignRecipient.findAll({
    attributes: [
      'status',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    where: { campaign_id: campaignId },
    group: ['status'],
    raw: true
  });

  const totalSent = await EmailCampaignRecipient.count({
    where: {
      campaign_id: campaignId,
      status: 'sent'
    }
  });

  const totalOpened = await EmailCampaignRecipient.count({
    where: {
      campaign_id: campaignId,
      opened_at: { [Op.ne]: null }
    }
  });

  const totalClicked = await EmailCampaignRecipient.count({
    where: {
      campaign_id: campaignId,
      clicked_at: { [Op.ne]: null }
    }
  });

  const statusCounts = {};
  stats.forEach(s => {
    statusCounts[s.status] = parseInt(s.count);
  });

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return {
    total,
    pending: statusCounts.pending || 0,
    sent: statusCounts.sent || 0,
    failed: statusCounts.failed || 0,
    bounced: statusCounts.bounced || 0,
    opened: totalOpened,
    clicked: totalClicked,
    openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0,
    clickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0
  };
}

/**
 * Get detailed campaign stats
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Detailed stats
 */
async function getCampaignStats(id) {
  const campaign = await getCampaign(id);
  const stats = campaign.stats;

  // Get daily stats (for charts)
  const dailyStats = await EmailCampaignRecipient.findAll({
    attributes: [
      [db.sequelize.fn('DATE', db.sequelize.col('sent_at')), 'date'],
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'sent'],
      [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END')), 'opened'],
      [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END')), 'clicked']
    ],
    where: {
      campaign_id: id,
      sent_at: { [Op.ne]: null }
    },
    group: [db.sequelize.fn('DATE', db.sequelize.col('sent_at'))],
    order: [[db.sequelize.fn('DATE', db.sequelize.col('sent_at')), 'ASC']],
    raw: true
  });

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      subject: campaign.subject,
      status: campaign.status,
      campaign_type: campaign.campaign_type,
      sent_at: campaign.sent_at,
      recipient_count: campaign.recipient_count
    },
    stats,
    dailyStats
  };
}

/**
 * Get recipients list for a campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} filters - Filter options
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Recipients list with pagination
 */
async function getCampaignRecipients(campaignId, filters = {}, pagination = {}) {
  const { status, search } = filters;
  const { page = 1, limit = 50 } = pagination;
  const offset = (page - 1) * limit;

  const where = { campaign_id: campaignId };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.email = { [Op.like]: `%${search}%` };
  }

  const { count, rows } = await EmailCampaignRecipient.findAndCountAll({
    where,
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }
    ],
    order: [['created_at', 'ASC']],
    limit,
    offset
  });

  return {
    recipients: rows.map(r => ({
      id: r.id,
      email: r.email,
      status: r.status,
      sent_at: r.sent_at,
      opened_at: r.opened_at,
      clicked_at: r.clicked_at,
      error_message: r.error_message,
      patient: r.patient ? {
        id: r.patient.id,
        name: `${r.patient.first_name} ${r.patient.last_name}`
      } : null
    })),
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
}

/**
 * Get available segment fields
 * @returns {Promise<Object>} Segment field definitions
 */
async function getSegmentFields() {
  return audienceSegmentService.getAvailableSegmentFields();
}

module.exports = {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaign,
  getCampaigns,
  duplicateCampaign,
  previewCampaignAudience,
  previewAudienceCriteria,
  scheduleCampaign,
  sendCampaignNow,
  cancelCampaign,
  getCampaignStats,
  getCampaignRecipients,
  getSegmentFields,
  prepareRecipients
};
