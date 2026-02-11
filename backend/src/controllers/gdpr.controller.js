/**
 * GDPR Controller
 *
 * Handles GDPR compliance endpoints
 */

const gdprService = require('../services/gdpr.service');
const patientService = require('../services/patient.service');
const auditService = require('../services/audit.service');

/**
 * Export patient data (RGPD Right to Data Portability)
 * GET /api/gdpr/patients/:id/export
 */
async function exportPatientData(req, res) {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    const requestMetadata = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      path: req.path
    };

    const exportData = await gdprService.exportPatientData(id, req.user, requestMetadata);

    if (format === 'csv') {
      // Convert to CSV format (simplified for main patient data)
      const json2csv = require('json2csv').parse;
      const csv = json2csv([exportData.patient_information], {
        fields: Object.keys(exportData.patient_information)
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="patient_${id}_export_${Date.now()}.csv"`);
      return res.send(csv);
    }

    // Default: JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="patient_${id}_export_${Date.now()}.json"`);
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Export patient data error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to export patient data'
    });
  }
}

/**
 * Delete patient permanently (RGPD Right to be Forgotten)
 * DELETE /api/gdpr/patients/:id/permanent
 */
async function deletePatientPermanently(req, res) {
  try {
    const { id } = req.params;
    const { confirm } = req.body;

    if (confirm !== 'DELETE_PERMANENTLY') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Please send { "confirm": "DELETE_PERMANENTLY" } in request body'
      });
    }

    const requestMetadata = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      path: req.path
    };

    // Get patient data before deletion for audit log
    const patient = await patientService.getPatientById(id, req.user, requestMetadata);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Perform hard delete
    const db = require('../../../models');
    const Op = db.Sequelize.Op;

    // Collect related IDs
    const visitIds = (await db.Visit.findAll({ where: { patient_id: id }, attributes: ['id'], raw: true })).map(v => v.id);
    const billingIds = (await db.Billing.findAll({ where: { patient_id: id }, attributes: ['id'], raw: true })).map(b => b.id);
    const measureIds = (await db.PatientMeasure.findAll({ where: { patient_id: id }, attributes: ['id'], raw: true, paranoid: false })).map(m => m.id);
    const journalIds = db.JournalEntry ? (await db.JournalEntry.findAll({ where: { patient_id: id }, attributes: ['id'], raw: true })).map(j => j.id) : [];

    // Helper: safely destroy if model exists
    const safeDestroy = async (model, where) => {
      if (model) await model.destroy({ where, force: true });
    };

    // Delete in dependency order (children first)

    // 1. Measure annotations (FK: patient_id) & alerts (FK: patient_measure_id)
    await safeDestroy(db.MeasureAnnotation, { patient_id: id });
    if (measureIds.length > 0) {
      await safeDestroy(db.MeasureAlert, { patient_measure_id: { [Op.in]: measureIds } });
    }
    await safeDestroy(db.PatientMeasure, { patient_id: id });

    // 2. Visit custom field values (FK: visit_id), then visits
    if (visitIds.length > 0) {
      await safeDestroy(db.VisitCustomFieldValue, { visit_id: { [Op.in]: visitIds } });
    }
    await safeDestroy(db.Visit, { patient_id: id });

    // 3. Billing: payments & invoice emails (FK: billing_id), then billings
    if (billingIds.length > 0) {
      await safeDestroy(db.Payment, { billing_id: { [Op.in]: billingIds } });
      await safeDestroy(db.InvoiceEmail, { billing_id: { [Op.in]: billingIds } });
    }
    await safeDestroy(db.Billing, { patient_id: id });

    // 4. Document shares: access logs first (FK: document_share_id)
    if (db.DocumentShare) {
      const shareIds = (await db.DocumentShare.findAll({ where: { patient_id: id }, attributes: ['id'], raw: true })).map(s => s.id);
      if (shareIds.length > 0) {
        await safeDestroy(db.DocumentAccessLog, { document_share_id: { [Op.in]: shareIds } });
      }
      await db.DocumentShare.destroy({ where: { patient_id: id }, force: true });
    }

    // 5. Documents (polymorphic: resource_type + resource_id, NOT patient_id)
    // Delete documents linked to journal entries first
    if (journalIds.length > 0) {
      await safeDestroy(db.Document, { resource_type: 'journal_entry', resource_id: { [Op.in]: journalIds } });
    }
    await safeDestroy(db.Document, { resource_type: 'patient', resource_id: id });

    // 6. Journal comments (FK: journal_entry_id), then journal entries
    if (journalIds.length > 0) {
      await safeDestroy(db.JournalComment, { journal_entry_id: { [Op.in]: journalIds } });
    }
    await safeDestroy(db.JournalEntry, { patient_id: id });

    // 7. Custom field values
    await safeDestroy(db.PatientCustomFieldValue, { patient_id: id });

    // 8. Tags, dietitian links, email logs, campaign recipients, recipes, tasks
    await safeDestroy(db.PatientTag, { patient_id: id });
    await safeDestroy(db.PatientDietitian, { patient_id: id });
    await safeDestroy(db.EmailLog, { patient_id: id });
    await safeDestroy(db.EmailCampaignRecipient, { patient_id: id });
    await safeDestroy(db.RecipePatientAccess, { patient_id: id });
    await safeDestroy(db.Task, { patient_id: id });

    // 9. Finally delete the patient
    await db.Patient.destroy({ where: { id }, force: true });

    // Audit log deletion
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'DELETE_PERMANENT',
      resource_type: 'patients',
      resource_id: id,
      changes: {
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_email: patient.email,
        deletion_reason: 'RGPD_RIGHT_TO_BE_FORGOTTEN'
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    res.json({
      success: true,
      message: 'Patient and all associated data permanently deleted',
      deleted_patient: {
        id: patient.id,
        name: `${patient.first_name} ${patient.last_name}`,
        email: patient.email
      }
    });
  } catch (error) {
    console.error('Permanent delete error:', error);

    // Audit log failure
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'DELETE_PERMANENT',
      resource_type: 'patients',
      resource_id: req.params.id,
      status_code: 500,
      error_message: error.message,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      request_method: req.method,
      request_path: req.path
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete patient permanently'
    });
  }
}

module.exports = {
  exportPatientData,
  deletePatientPermanently
};
