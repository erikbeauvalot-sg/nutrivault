/**
 * Recipe Sharing Service
 *
 * Business logic for sharing recipes with patients.
 */

const db = require('../../../models');
const Recipe = db.Recipe;
const RecipePatientAccess = db.RecipePatientAccess;
const Patient = db.Patient;
const User = db.User;
const RecipeCategory = db.RecipeCategory;
const auditService = require('./audit.service');
const emailService = require('./email.service');
const { Op } = db.Sequelize;

/**
 * Share a recipe with a patient
 *
 * @param {string} recipeId - Recipe UUID
 * @param {string} patientId - Patient UUID
 * @param {Object} options - Sharing options (notes)
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Created access record
 */
async function shareRecipe(recipeId, patientId, options = {}, user, requestMetadata = {}) {
  try {
    // Verify recipe exists and is published
    const recipe = await Recipe.findOne({
      where: { id: recipeId, is_active: true }
    });

    if (!recipe) {
      const error = new Error('Recipe not found');
      error.statusCode = 404;
      throw error;
    }

    if (recipe.status !== 'published') {
      const error = new Error('Only published recipes can be shared');
      error.statusCode = 400;
      throw error;
    }

    // Verify patient exists
    const patient = await Patient.findOne({
      where: { id: patientId, is_active: true }
    });

    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if already shared (upsert)
    let access = await RecipePatientAccess.findOne({
      where: { recipe_id: recipeId, patient_id: patientId }
    });

    if (access) {
      // Reactivate if was deactivated
      access.is_active = true;
      access.notes = options.notes || access.notes;
      access.shared_by = user.id;
      access.shared_at = new Date();
      await access.save();
    } else {
      // Create new access
      access = await RecipePatientAccess.create({
        recipe_id: recipeId,
        patient_id: patientId,
        shared_by: user.id,
        notes: options.notes,
        shared_at: new Date()
      });
    }

    // Reload with associations
    await access.reload({
      include: [
        {
          model: Recipe,
          as: 'recipe',
          attributes: ['id', 'title', 'slug', 'status']
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'sharedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'recipe_patient_access',
      resource_id: access.id,
      changes: {
        recipe_id: recipeId,
        patient_id: patientId,
        notes: options.notes
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 201
    });

    // Send email notification to patient if they have an email
    if (patient.email) {
      try {
        await emailService.sendRecipeShareEmail(
          recipe,
          patient,
          user,
          options.notes
        );
      } catch (emailError) {
        // Log email error but don't fail the sharing operation
        console.error('Error sending recipe share email:', emailError);
      }
    }

    return access;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Get shares for a recipe
 *
 * @param {string} recipeId - Recipe UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Array>} List of shares
 */
async function getRecipeShares(recipeId, user, requestMetadata = {}) {
  try {
    const shares = await RecipePatientAccess.findAll({
      where: { recipe_id: recipeId, is_active: true },
      order: [['shared_at', 'DESC']],
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'sharedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    return shares;
  } catch (error) {
    throw error;
  }
}

/**
 * Get recipes shared with a patient
 *
 * @param {string} patientId - Patient UUID
 * @param {Object} user - Authenticated user
 * @param {Object} filters - Filter options
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Shared recipes with pagination
 */
async function getPatientRecipes(patientId, user, filters = {}, requestMetadata = {}) {
  try {
    const whereClause = { patient_id: patientId, is_active: true };

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await RecipePatientAccess.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['shared_at', 'DESC']],
      include: [
        {
          model: Recipe,
          as: 'recipe',
          where: { is_active: true },
          include: [
            {
              model: RecipeCategory,
              as: 'category',
              attributes: ['id', 'name', 'icon', 'color']
            }
          ]
        },
        {
          model: User,
          as: 'sharedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'recipe_patient_access',
      resource_id: patientId,
      changes: { count },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return {
      shares: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Revoke recipe access for a patient
 *
 * @param {string} accessId - Access record UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Result
 */
async function revokeAccess(accessId, user, requestMetadata = {}) {
  try {
    const access = await RecipePatientAccess.findOne({
      where: { id: accessId, is_active: true }
    });

    if (!access) {
      const error = new Error('Access record not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeState = access.toJSON();

    // Soft delete
    access.is_active = false;
    await access.save();

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'recipe_patient_access',
      resource_id: accessId,
      changes: { before: beforeState },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return { success: true, message: 'Access revoked successfully' };
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Update sharing notes
 *
 * @param {string} accessId - Access record UUID
 * @param {string} notes - New notes
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Updated access record
 */
async function updateShareNotes(accessId, notes, user, requestMetadata = {}) {
  try {
    const access = await RecipePatientAccess.findOne({
      where: { id: accessId, is_active: true }
    });

    if (!access) {
      const error = new Error('Access record not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeState = access.toJSON();

    access.notes = notes;
    await access.save();

    await access.reload({
      include: [
        {
          model: Recipe,
          as: 'recipe',
          attributes: ['id', 'title', 'slug']
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: User,
          as: 'sharedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'recipe_patient_access',
      resource_id: accessId,
      changes: { before: beforeState, after: access.toJSON() },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return access;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Resend share email for an existing share
 *
 * @param {string} accessId - Access record UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Result
 */
async function resendShareEmail(accessId, user, requestMetadata = {}) {
  try {
    // Find the access record with all required associations
    const access = await RecipePatientAccess.findOne({
      where: { id: accessId, is_active: true },
      include: [
        {
          model: Recipe,
          as: 'recipe',
          where: { is_active: true }
        },
        {
          model: Patient,
          as: 'patient',
          where: { is_active: true }
        }
      ]
    });

    if (!access) {
      const error = new Error('Share record not found');
      error.statusCode = 404;
      throw error;
    }

    if (!access.patient.email) {
      const error = new Error('Patient does not have an email address');
      error.statusCode = 400;
      throw error;
    }

    // Send the email
    await emailService.sendRecipeShareEmail(
      access.recipe,
      access.patient,
      user,
      access.notes
    );

    // Log the resend action
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'recipe_patient_access',
      resource_id: accessId,
      changes: {
        action: 'resend_email',
        patient_id: access.patient.id,
        recipe_id: access.recipe.id
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return {
      success: true,
      message: 'Email sent successfully',
      patient_email: access.patient.email
    };
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

module.exports = {
  shareRecipe,
  getRecipeShares,
  getPatientRecipes,
  revokeAccess,
  updateShareNotes,
  resendShareEmail
};
