const exportService = require('../services/export.service');
const auditService = require('../services/audit.service');

/**
 * Export Controller
 * Handles data export requests
 */
class ExportController {
  /**
   * Export patients data
   */
  async exportPatients(req, res) {
    try {
      const { format = 'csv', is_active } = req.query;
      const filters = {};

      if (is_active !== undefined) {
        filters.is_active = is_active;
      }

      const result = await exportService.exportPatients(format, filters, req.user);

      // Log the export action
      await auditService.logAction(
        req.user.id,
        'EXPORT',
        'patients',
        null,
        `Exported ${result.filename} (${format.toUpperCase()})`,
        req.ip
      );

      // Set response headers
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

      res.send(result.data);
    } catch (error) {
      console.error('Export patients error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export patients data'
      });
    }
  }

  /**
   * Export visits data
   */
  async exportVisits(req, res) {
    try {
      const { format = 'csv', patient_id, status } = req.query;
      const filters = {};

      if (patient_id) filters.patient_id = patient_id;
      if (status) filters.status = status;

      const result = await exportService.exportVisits(format, filters, req.user);

      // Log the export action
      await auditService.logAction(
        req.user.id,
        'EXPORT',
        'visits',
        null,
        `Exported ${result.filename} (${format.toUpperCase()})`,
        req.ip
      );

      // Set response headers
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

      res.send(result.data);
    } catch (error) {
      console.error('Export visits error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export visits data'
      });
    }
  }

  /**
   * Export billing data
   */
  async exportBilling(req, res) {
    try {
      const { format = 'csv', patient_id, status } = req.query;
      const filters = {};

      if (patient_id) filters.patient_id = patient_id;
      if (status) filters.status = status;

      const result = await exportService.exportBilling(format, filters, req.user);

      // Log the export action
      await auditService.logAction(
        req.user.id,
        'EXPORT',
        'billing',
        null,
        `Exported ${result.filename} (${format.toUpperCase()})`,
        req.ip
      );

      // Set response headers
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

      res.send(result.data);
    } catch (error) {
      console.error('Export billing error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export billing data'
      });
    }
  }
}

module.exports = new ExportController();