/**
 * Alerts Service
 *
 * Aggregates and provides actionable alerts for urgent tasks:
 * - Overdue invoices
 * - Completed visits without notes
 * - Patients requiring follow-up
 */

const db = require('../../../models');
const Billing = db.Billing;
const Patient = db.Patient;
const Visit = db.Visit;
const VisitCustomFieldValue = db.VisitCustomFieldValue;
const CustomFieldDefinition = db.CustomFieldDefinition;
const { Op } = db.Sequelize;

/**
 * Get all alerts for the authenticated user
 *
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Categorized alerts
 */
async function getAlerts(user, requestMetadata = {}) {
  try {
    const alerts = {
      overdue_invoices: [],
      visits_without_notes: [],
      patients_followup: [],
      summary: {
        total_count: 0,
        critical_count: 0,
        warning_count: 0
      }
    };

    // 1. Get overdue invoices
    const overdueInvoices = await Billing.findAll({
      where: {
        status: 'OVERDUE',
        is_active: true
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          where: { is_active: true },
          required: true
        }
      ],
      order: [['due_date', 'ASC']],
      limit: 50
    });

    alerts.overdue_invoices = overdueInvoices.map(invoice => {
      const daysOverdue = Math.floor((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
      return {
        type: 'OVERDUE_INVOICE',
        severity: daysOverdue > 30 ? 'critical' : 'warning',
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        patient_id: invoice.patient_id,
        patient_name: `${invoice.patient.first_name} ${invoice.patient.last_name}`,
        amount_due: parseFloat(invoice.amount_due),
        due_date: invoice.due_date,
        days_overdue: daysOverdue,
        message: `Invoice #${invoice.invoice_number} overdue by ${daysOverdue} days`,
        action: 'send_reminder'
      };
    });

    // 2. Get completed visits without custom field values
    // First, get all completed visits
    const completedVisits = await Visit.findAll({
      where: {
        status: 'COMPLETED'
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name'],
          where: { is_active: true },
          required: true
        }
      ],
      order: [['visit_date', 'DESC']],
      limit: 100 // Check more to find those without custom fields
    });

    // Get active custom field definitions for visits
    const allCustomFields = await CustomFieldDefinition.findAll({
      where: {
        is_active: true
      },
      include: [{
        model: db.CustomFieldCategory,
        as: 'category',
        where: {
          is_active: true
        },
        required: true
      }],
      attributes: ['id']
    });

    // Filter for visit fields - check if 'visit' is in entity_types array
    const visitCustomFields = allCustomFields.filter(field => {
      const entityTypes = field.category.entity_types;
      // entity_types is a JSON field that could be an array or a string
      if (Array.isArray(entityTypes)) {
        return entityTypes.includes('visit');
      }
      return false;
    });

    const visitFieldIds = visitCustomFields.map(f => f.id);

    // Check each visit for missing custom fields
    const visitsWithoutFields = [];
    for (const visit of completedVisits) {
      if (visitFieldIds.length === 0) continue; // Skip if no visit custom fields defined

      // Get custom field values for this visit
      const values = await VisitCustomFieldValue.findAll({
        where: {
          visit_id: visit.id,
          field_definition_id: visitFieldIds
        }
      });

      // Filter out empty values - check all value columns
      const nonEmptyValues = values.filter(v =>
        v.value_text !== null && v.value_text !== undefined && v.value_text !== '' ||
        v.value_number !== null && v.value_number !== undefined ||
        v.value_boolean !== null && v.value_boolean !== undefined ||
        v.value_json !== null && v.value_json !== undefined
      );

      // If no custom fields have values, add to alerts
      if (nonEmptyValues.length === 0) {
        visitsWithoutFields.push({
          visit,
          missingFieldsCount: visitFieldIds.length
        });
      }

      // Limit results
      if (visitsWithoutFields.length >= 50) break;
    }

    alerts.visits_without_notes = visitsWithoutFields.map(({ visit, missingFieldsCount }) => ({
      type: 'VISIT_WITHOUT_CUSTOM_FIELDS',
      severity: 'warning',
      visit_id: visit.id,
      patient_id: visit.patient_id,
      patient_name: `${visit.patient.first_name} ${visit.patient.last_name}`,
      visit_date: visit.visit_date,
      visit_type: visit.visit_type,
      missing_fields_count: missingFieldsCount,
      message: `Visit on ${new Date(visit.visit_date).toLocaleDateString()} has no custom field data (${missingFieldsCount} fields empty)`,
      action: 'edit_visit'
    }));

    // 3. Get patients needing follow-up (completed visits with next_visit_date in the past)
    const now = new Date();
    const patientsNeedingFollowup = await Visit.findAll({
      where: {
        status: 'COMPLETED',
        next_visit_date: {
          [Op.not]: null,
          [Op.lt]: now
        }
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
          where: { is_active: true },
          required: true
        }
      ],
      order: [['next_visit_date', 'ASC']],
      limit: 50
    });

    // Group by patient (only show most urgent per patient)
    const followupMap = new Map();
    patientsNeedingFollowup.forEach(visit => {
      if (!followupMap.has(visit.patient_id)) {
        const daysOverdue = Math.floor((now - new Date(visit.next_visit_date)) / (1000 * 60 * 60 * 24));
        followupMap.set(visit.patient_id, {
          type: 'PATIENT_FOLLOWUP',
          severity: daysOverdue > 14 ? 'warning' : 'info',
          patient_id: visit.patient_id,
          patient_name: `${visit.patient.first_name} ${visit.patient.last_name}`,
          last_visit_id: visit.id,
          last_visit_date: visit.visit_date,
          next_visit_date: visit.next_visit_date,
          days_overdue: daysOverdue,
          contact_email: visit.patient.email,
          contact_phone: visit.patient.phone,
          message: `Follow-up overdue by ${daysOverdue} days`,
          action: 'schedule_visit'
        });
      }
    });

    alerts.patients_followup = Array.from(followupMap.values());

    // Calculate summary
    const criticalCount = alerts.overdue_invoices.filter(a => a.severity === 'critical').length;
    const warningCount =
      alerts.overdue_invoices.filter(a => a.severity === 'warning').length +
      alerts.visits_without_notes.length +
      alerts.patients_followup.filter(a => a.severity === 'warning').length;

    alerts.summary = {
      total_count:
        alerts.overdue_invoices.length +
        alerts.visits_without_notes.length +
        alerts.patients_followup.length,
      critical_count: criticalCount,
      warning_count: warningCount,
      info_count: alerts.patients_followup.filter(a => a.severity === 'info').length
    };

    return alerts;
  } catch (error) {
    console.error('Error in getAlerts:', error);
    throw error;
  }
}

module.exports = {
  getAlerts
};
