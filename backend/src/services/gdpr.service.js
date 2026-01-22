/**
 * GDPR Service
 *
 * Handles GDPR compliance operations:
 * - Data export (Right to Data Portability)
 * - Data deletion (Right to be Forgotten)
 */

const db = require('../../../models');
const { Patient, User, Visit, VisitMeasurement, Billing, Payment, InvoiceEmail, Document, AuditLog } = db;
const auditService = require('./audit.service');

/**
 * Export all patient data for RGPD compliance
 *
 * @param {string} patientId - Patient UUID
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Complete patient data export
 */
async function exportPatientData(patientId, user, requestMetadata = {}) {
  try {
    // Get complete patient data with all relationships
    const patient = await Patient.findOne({
      where: { id: patientId },
      include: [
        {
          model: User,
          as: 'assigned_dietitian',
          attributes: ['id', 'username', 'first_name', 'last_name', 'email']
        },
        {
          model: Visit,
          as: 'visits',
          include: [
            {
              model: VisitMeasurement,
              as: 'measurements'
            },
            {
              model: User,
              as: 'dietitian',
              attributes: ['id', 'username', 'first_name', 'last_name']
            }
          ]
        }
      ]
    });

    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // Get billing data
    const billings = await Billing.findAll({
      where: { patient_id: patientId },
      include: [
        {
          model: Payment,
          as: 'payments'
        },
        {
          model: InvoiceEmail,
          as: 'email_history'
        }
      ]
    });

    // Get documents (polymorphic association)
    const documents = await Document.findAll({
      where: {
        resource_type: 'patient',
        resource_id: patientId
      }
    });

    // Get audit logs related to this patient
    const auditLogs = await AuditLog.findAll({
      where: {
        resource_type: 'patients',
        resource_id: patientId
      },
      order: [['created_at', 'DESC']],
      limit: 1000 // Limit to prevent excessive data
    });

    // Construct complete export object
    const exportData = {
      export_date: new Date().toISOString(),
      export_requested_by: {
        user_id: user.id,
        username: user.username,
        name: `${user.first_name} ${user.last_name}`
      },
      patient_information: {
        id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        email: patient.email,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        address: patient.address,
        city: patient.city,
        state: patient.state,
        zip_code: patient.zip_code,
        emergency_contact_name: patient.emergency_contact_name,
        emergency_contact_phone: patient.emergency_contact_phone,
        medical_record_number: patient.medical_record_number,
        insurance_provider: patient.insurance_provider,
        insurance_policy_number: patient.insurance_policy_number,
        primary_care_physician: patient.primary_care_physician,
        allergies: patient.allergies,
        current_medications: patient.current_medications,
        medical_conditions: patient.medical_conditions,
        medical_notes: patient.medical_notes,
        height_cm: patient.height_cm,
        weight_kg: patient.weight_kg,
        blood_type: patient.blood_type,
        dietary_restrictions: patient.dietary_restrictions,
        dietary_preferences: patient.dietary_preferences,
        food_preferences: patient.food_preferences,
        nutritional_goals: patient.nutritional_goals,
        exercise_habits: patient.exercise_habits,
        smoking_status: patient.smoking_status,
        alcohol_consumption: patient.alcohol_consumption,
        notes: patient.notes,
        assigned_dietitian: patient.assigned_dietitian,
        is_active: patient.is_active,
        created_at: patient.created_at,
        updated_at: patient.updated_at
      },
      visits: patient.visits || [],
      billings: billings || [],
      documents: documents.map(doc => ({
        id: doc.id,
        file_name: doc.file_name,
        file_path: doc.file_path,
        mime_type: doc.mime_type,
        file_size: doc.file_size,
        description: doc.description,
        category: doc.category,
        tags: doc.tags,
        is_template: doc.is_template,
        uploaded_at: doc.created_at,
        uploaded_by: doc.uploaded_by,
        // Note: File content not included in export for size reasons
        // Files can be downloaded separately via the documents endpoint
        download_note: 'File content available via separate download'
      })),
      audit_trail: auditLogs.map(log => ({
        timestamp: log.timestamp,
        action: log.action,
        user: log.username,
        details: log.changes ? JSON.parse(log.changes) : null,
        ip_address: log.ip_address
      })),
      data_categories: {
        personal_information: true,
        medical_information: true,
        visit_history: true,
        billing_records: true,
        documents: true,
        audit_logs: true
      },
      rgpd_notice: {
        right_to_rectification: 'You have the right to request correction of inaccurate data',
        right_to_erasure: 'You have the right to request deletion of your data',
        right_to_restriction: 'You have the right to request restriction of processing',
        right_to_object: 'You have the right to object to processing of your data',
        contact: 'To exercise your rights, please contact your dietitian'
      }
    };

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'EXPORT',
      resource_type: 'patients',
      resource_id: patientId,
      changes: { export_type: 'RGPD_FULL_DATA' },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return exportData;
  } catch (error) {
    // Audit log failure
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'EXPORT',
      resource_type: 'patients',
      resource_id: patientId,
      status_code: 500,
      error_message: error.message,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path
    });

    throw error;
  }
}

module.exports = {
  exportPatientData
};
