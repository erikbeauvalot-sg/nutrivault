/**
 * Portal Scope Middleware
 * Resolves req.user → req.patient for portal routes
 * Ensures the patient can only access their own data
 */

const db = require('../../../models');

/**
 * Middleware: Resolve the authenticated user's patient record
 * Sets req.patient for use in portal controllers
 */
function resolvePatient() {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check that user has PATIENT role
      const roleName = req.user.role?.name;
      if (roleName !== 'PATIENT') {
        return res.status(403).json({ success: false, error: 'Portal access requires PATIENT role' });
      }

      // Find the patient record linked to this user
      const patient = await db.Patient.findOne({
        where: { user_id: req.user.id }
      });

      if (!patient) {
        return res.status(404).json({ success: false, error: 'No patient record linked to this account' });
      }

      if (!patient.is_active) {
        return res.status(403).json({ success: false, error: 'Patient record is inactive' });
      }

      req.patient = patient;
      next();
    } catch (error) {
      console.error('Portal scope error:', error);
      return res.status(500).json({ success: false, error: 'Failed to resolve patient record' });
    }
  };
}

module.exports = { resolvePatient };
