/**
 * Visit Controller
 * 
 * HTTP request handlers for visit management.
 * Thin controllers that delegate business logic to visit service.
 */

const visitService = require('../services/visit.service');
const autoSyncService = require('../services/autoSync.service');

/**
 * Extract request metadata for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Request metadata
 */
function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

/**
 * GET /api/visits - Get all visits
 */
exports.getAllVisits = async (req, res, next) => {
  try {
    const user = req.user;
    const filters = {
      search: req.query.search,
      patient_id: req.query.patient_id,
      dietitian_id: req.query.dietitian_id,
      status: req.query.status,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      page: req.query.page,
      limit: req.query.limit
    };
    const requestMetadata = getRequestMetadata(req);

    const result = await visitService.getVisits(user, filters, requestMetadata);

    // Auto-sync to Google Calendar when accessing visits/agenda
    setImmediate(() => {
      autoSyncService.autoSyncOnAgendaAccess(user);
    });

    res.json({
      success: true,
      data: result.visits,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/visits/:id - Get visit by ID
 */
exports.getVisitById = async (req, res, next) => {
  try {
    const user = req.user;
    const visitId = req.params.id;
    const requestMetadata = getRequestMetadata(req);

    console.log('📅 GET VISIT BY ID:', { visitId, userId: user.id });
    
    const visit = await visitService.getVisitById(user, visitId, requestMetadata);

    console.log('📅 VISIT FOUND:', { visitId, patientId: visit.patient_id });

    // Auto-sync to Google Calendar when viewing visit details
    setImmediate(() => {
      autoSyncService.autoSyncOnAgendaAccess(user);
    });

    res.json({
      success: true,
      data: visit
    });
  } catch (error) {
    console.log('📅 GET VISIT ERROR:', { error: error.message });
    next(error);
  }
};

/**
 * POST /api/visits - Create new visit
 */
exports.createVisit = async (req, res, next) => {
  try {
    const user = req.user;
    const visitData = req.body;
    const requestMetadata = getRequestMetadata(req);

    const visit = await visitService.createVisit(user, visitData, requestMetadata);

    // Auto-sync to Google Calendar after visit creation
    setImmediate(() => {
      autoSyncService.autoSyncAfterVisitChange(user, visit, 'create');
    });

    res.status(201).json({
      success: true,
      data: visit,
      message: 'Visit created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/visits/:id - Update visit
 */
exports.updateVisit = async (req, res, next) => {
  try {
    const user = req.user;
    const visitId = req.params.id;
    const updateData = req.body;
    const requestMetadata = getRequestMetadata(req);

    const visit = await visitService.updateVisit(user, visitId, updateData, requestMetadata);

    // Auto-sync to Google Calendar after visit update
    setImmediate(() => {
      autoSyncService.autoSyncAfterVisitChange(user, visit, 'update');
    });

    res.json({
      success: true,
      data: visit,
      message: 'Visit updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/visits/:id - Delete visit
 */
exports.deleteVisit = async (req, res, next) => {
  try {
    const user = req.user;
    const visitId = req.params.id;
    const requestMetadata = getRequestMetadata(req);

    await visitService.deleteVisit(user, visitId, requestMetadata);

    res.json({
      success: true,
      message: 'Visit deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/visits/:id/finish-and-invoice - Complete visit and generate invoice with email
 * Options in body:
 *   - markCompleted: boolean (default: true) - Mark visit as COMPLETED
 *   - generateInvoice: boolean (default: true) - Generate invoice automatically
 *   - sendEmail: boolean (default: false) - Send invoice email to patient
 */
exports.finishAndInvoice = async (req, res, next) => {
  try {
    const user = req.user;
    const visitId = req.params.id;
    const requestMetadata = getRequestMetadata(req);
    const options = {
      markCompleted: req.body.markCompleted !== false, // default true
      generateInvoice: req.body.generateInvoice !== false, // default true
      sendEmail: req.body.sendEmail === true // default false
    };

    const result = await visitService.finishAndInvoice(user, visitId, options, requestMetadata);

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};