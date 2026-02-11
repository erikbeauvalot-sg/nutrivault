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

    // Collect related IDs with safe parameterized queries
    const visits = await db.Visit.findAll({ where: { patient_id: id }, attributes: ['id'], raw: true });
    const visitIds = visits.map(v => v.id);

    const billings = await db.Billing.findAll({ where: { patient_id: id }, attributes: ['id'], raw: true });
    const billingIds = billings.map(b => b.id);

    // Delete in order to respect foreign key constraints

    // 1. Patient measures & annotations
    const patientMeasures = await db.PatientMeasure.findAll({ where: { patient_id: id }, attributes: ['id'], raw: true, paranoid: false });
    const measureIds = patientMeasures.map(m => m.id);
    if (measureIds.length > 0) {
      await db.MeasureAnnotation.destroy({
        where: { patient_measure_id: { [db.Sequelize.Op.in]: measureIds } },
        force: true
      });
      await db.MeasureAlert.destroy({
        where: { patient_measure_id: { [db.Sequelize.Op.in]: measureIds } },
        force: true
      });
    }
    await db.PatientMeasure.destroy({ where: { patient_id: id }, force: true });

    // 2. Visits
    await db.Visit.destroy({ where: { patient_id: id }, force: true });

    // 3. Billing & payments
    if (billingIds.length > 0) {
      await db.Payment.destroy({
        where: { billing_id: { [db.Sequelize.Op.in]: billingIds } },
        force: true
      });
      if (db.InvoiceEmail) {
        await db.InvoiceEmail.destroy({
          where: { billing_id: { [db.Sequelize.Op.in]: billingIds } },
          force: true
        });
      }
    }
    await db.Billing.destroy({ where: { patient_id: id }, force: true });

    // 4. Documents & shares
    if (db.DocumentShare) {
      await db.DocumentShare.destroy({ where: { patient_id: id }, force: true });
    }
    await db.Document.destroy({ where: { patient_id: id }, force: true });

    // 5. Journal entries & comments
    if (db.JournalEntry) {
      const journalEntries = await db.JournalEntry.findAll({ where: { patient_id: id }, attributes: ['id'], raw: true });
      const journalIds = journalEntries.map(j => j.id);
      if (journalIds.length > 0 && db.JournalComment) {
        await db.JournalComment.destroy({
          where: { entry_id: { [db.Sequelize.Op.in]: journalIds } },
          force: true
        });
      }
      await db.JournalEntry.destroy({ where: { patient_id: id }, force: true });
    }

    // 6. Custom field values
    if (db.PatientCustomFieldValue) {
      await db.PatientCustomFieldValue.destroy({ where: { patient_id: id }, force: true });
    }

    // 7. Tags, dietitian links, email logs, campaign recipients, recipe access
    if (db.PatientTag) {
      await db.PatientTag.destroy({ where: { patient_id: id }, force: true });
    }
    await db.PatientDietitian.destroy({ where: { patient_id: id }, force: true });
    if (db.EmailLog) {
      await db.EmailLog.destroy({ where: { patient_id: id }, force: true });
    }
    if (db.EmailCampaignRecipient) {
      await db.EmailCampaignRecipient.destroy({ where: { patient_id: id }, force: true });
    }
    if (db.RecipePatientAccess) {
      await db.RecipePatientAccess.destroy({ where: { patient_id: id }, force: true });
    }
    if (db.Task) {
      await db.Task.destroy({ where: { patient_id: id }, force: true });
    }

    // 8. Finally delete the patient
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
