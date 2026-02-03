/**
 * Scope Helper
 *
 * Centralized data scoping logic based on user role.
 * ADMIN sees all data. DIETITIAN sees only patients linked via patient_dietitians.
 * ASSISTANT sees data of their linked dietitians.
 */

const db = require('../../../models');
const { Op } = db.Sequelize;

/**
 * Get the dietitian IDs that a user has access to.
 *
 * @param {Object} user - Authenticated user with role info
 * @returns {Promise<string[]|null>} Array of dietitian IDs, or null for unrestricted (ADMIN)
 */
async function getScopedDietitianIds(user) {
  if (!user || !user.role) return [];

  const roleName = user.role.name || user.role;

  if (roleName === 'ADMIN') {
    return null; // null = no filter (see all)
  }

  if (roleName === 'DIETITIAN') {
    return [user.id];
  }

  if (roleName === 'ASSISTANT') {
    const links = await db.UserSupervisor.findAll({
      where: { assistant_id: user.id },
      attributes: ['dietitian_id']
    });
    return links.map(l => l.dietitian_id);
  }

  // VIEWER or unknown
  return [];
}

/**
 * Get patient IDs that a user has access to (via patient_dietitians M2M).
 *
 * @param {Object} user - Authenticated user with role info
 * @returns {Promise<string[]|null>} Array of patient IDs, or null for unrestricted (ADMIN)
 */
async function getScopedPatientIds(user) {
  const dietitianIds = await getScopedDietitianIds(user);

  if (dietitianIds === null) {
    return null; // ADMIN sees all
  }

  if (dietitianIds.length === 0) {
    return []; // No access
  }

  const links = await db.PatientDietitian.findAll({
    where: {
      dietitian_id: { [Op.in]: dietitianIds }
    },
    attributes: ['patient_id']
  });

  return [...new Set(links.map(l => l.patient_id))];
}

/**
 * Apply patient scoping to a Sequelize where clause.
 * Mutates the whereClause in place.
 *
 * @param {Object} whereClause - Existing where clause to modify
 * @param {Object} user - Authenticated user
 * @param {string} patientIdField - Field name for patient ID (default: 'patient_id')
 * @returns {Promise<boolean>} false if user has no access at all
 */
async function applyPatientScope(whereClause, user, patientIdField = 'patient_id') {
  const patientIds = await getScopedPatientIds(user);

  if (patientIds === null) {
    return true; // ADMIN, no filter needed
  }

  if (patientIds.length === 0) {
    return false; // No access
  }

  whereClause[patientIdField] = { [Op.in]: patientIds };
  return true;
}

/**
 * Apply dietitian scoping to a Sequelize where clause.
 *
 * @param {Object} whereClause - Existing where clause to modify
 * @param {Object} user - Authenticated user
 * @param {string} dietitianIdField - Field name for dietitian ID
 * @returns {Promise<boolean>} false if user has no access at all
 */
async function applyDietitianScope(whereClause, user, dietitianIdField = 'dietitian_id') {
  const dietitianIds = await getScopedDietitianIds(user);

  if (dietitianIds === null) {
    return true; // ADMIN
  }

  if (dietitianIds.length === 0) {
    return false; // No access
  }

  whereClause[dietitianIdField] = { [Op.in]: dietitianIds };
  return true;
}

/**
 * Check if a user can access a specific patient (via patient_dietitians M2M).
 *
 * @param {Object} user - Authenticated user
 * @param {Object} patient - Patient record (must have id)
 * @returns {Promise<boolean>}
 */
async function canAccessPatient(user, patient) {
  const dietitianIds = await getScopedDietitianIds(user);

  if (dietitianIds === null) return true; // ADMIN
  if (dietitianIds.length === 0) return false;

  const link = await db.PatientDietitian.findOne({
    where: {
      patient_id: patient.id,
      dietitian_id: { [Op.in]: dietitianIds }
    }
  });

  return !!link;
}

/**
 * Check if a user can access a specific visit (via M2M link or direct dietitian match).
 *
 * @param {Object} user - Authenticated user
 * @param {Object} visit - Visit record (must have dietitian_id and patient_id or patient.id)
 * @returns {Promise<boolean>}
 */
async function canAccessVisit(user, visit) {
  const dietitianIds = await getScopedDietitianIds(user);

  if (dietitianIds === null) return true; // ADMIN
  if (dietitianIds.length === 0) return false;

  // Direct dietitian match on the visit
  if (dietitianIds.includes(visit.dietitian_id)) return true;

  // Check M2M link for the patient
  const patientId = visit.patient_id || (visit.patient && visit.patient.id);
  if (patientId) {
    const link = await db.PatientDietitian.findOne({
      where: {
        patient_id: patientId,
        dietitian_id: { [Op.in]: dietitianIds }
      }
    });
    if (link) return true;
  }

  return false;
}

/**
 * Ensure a link exists between a patient and a dietitian.
 * Creates the link if it doesn't exist (upsert).
 *
 * @param {string} patientId - Patient UUID
 * @param {string} dietitianId - Dietitian (user) UUID
 * @returns {Promise<Object>} The PatientDietitian record
 */
async function ensurePatientDietitianLink(patientId, dietitianId) {
  const [link] = await db.PatientDietitian.findOrCreate({
    where: {
      patient_id: patientId,
      dietitian_id: dietitianId
    },
    defaults: {
      patient_id: patientId,
      dietitian_id: dietitianId
    }
  });
  return link;
}

module.exports = {
  getScopedDietitianIds,
  getScopedPatientIds,
  applyPatientScope,
  applyDietitianScope,
  canAccessPatient,
  canAccessVisit,
  ensurePatientDietitianLink
};
