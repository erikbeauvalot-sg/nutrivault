/**
 * Data Export Controller
 *
 * Handles HTTP requests for data export endpoints
 */

const {
  exportPatients,
  exportVisits,
  exportBilling
} = require('../services/export.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Export patients data
 * GET /api/export/patients?format=csv|excel|pdf
 */
const exportPatientsHandler = asyncHandler(async (req, res) => {
  const format = req.query.format || 'csv';
  const filters = {
    is_active: req.query.is_active
  };

  const requestMetadata = {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path
  };

  const result = await exportPatients(format, filters, req.user, requestMetadata);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `patients_${timestamp}.${result.extension}`;

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(result.data);
});

/**
 * Export visits data
 * GET /api/export/visits?format=csv|excel|pdf
 */
const exportVisitsHandler = asyncHandler(async (req, res) => {
  const format = req.query.format || 'csv';
  const filters = {
    patient_id: req.query.patient_id,
    status: req.query.status
  };

  const requestMetadata = {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path
  };

  const result = await exportVisits(format, filters, req.user, requestMetadata);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `visits_${timestamp}.${result.extension}`;

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(result.data);
});

/**
 * Export billing data
 * GET /api/export/billing?format=csv|excel|pdf
 */
const exportBillingHandler = asyncHandler(async (req, res) => {
  const format = req.query.format || 'csv';
  const filters = {
    patient_id: req.query.patient_id,
    status: req.query.status
  };

  const requestMetadata = {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path
  };

  const result = await exportBilling(format, filters, req.user, requestMetadata);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `billing_${timestamp}.${result.extension}`;

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(result.data);
});

module.exports = {
  exportPatientsHandler,
  exportVisitsHandler,
  exportBillingHandler
};
