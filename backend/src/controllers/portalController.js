/**
 * Portal Controller
 * Handles patient portal endpoints - all scoped to req.patient
 */

const db = require('../../../models');
const bcrypt = require('bcryptjs');
const { Op } = db.Sequelize;
const path = require('path');
const fs = require('fs').promises;
const { generateFilePath, ensureUploadDirectory, UPLOAD_DIR } = require('../services/document.service');

/**
 * Check if a feature flag is enabled (env var = 'true')
 */
const isFeatureEnabled = (name) => process.env[name] === 'true';

/**
 * GET /api/portal/features — Portal feature flags
 */
exports.getFeatures = async (req, res) => {
  res.json({
    success: true,
    data: {
      patientBooking: isFeatureEnabled('FEATURE_PATIENT_BOOKING')
    }
  });
};

/**
 * GET /api/portal/me — Patient profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const patient = await db.Patient.findByPk(req.patient.id, {
      attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'language_preference', 'portal_activated_at'],
      include: [{
        model: db.User,
        as: 'portalUser',
        attributes: ['id', 'theme_id', 'last_login', 'language_preference']
      }]
    });

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/portal/me — Update profile (phone, language)
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { phone, language_preference } = req.body;
    const updateData = {};

    if (phone !== undefined) updateData.phone = phone;
    if (language_preference !== undefined) updateData.language_preference = language_preference;

    await db.Patient.update(updateData, { where: { id: req.patient.id } });

    // Also update user language if changed
    if (language_preference && req.patient.user_id) {
      await db.User.update(
        { language_preference },
        { where: { id: req.patient.user_id } }
      );
    }

    const updated = await db.Patient.findByPk(req.patient.id, {
      attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'language_preference']
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/portal/password — Change password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    }

    const user = await db.User.findByPk(req.user.id);
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await user.update({ password_hash: passwordHash });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/measures — Patient's measures
 */
exports.getMeasures = async (req, res, next) => {
  try {
    const { startDate, endDate, measure_definition_id } = req.query;

    const where = { patient_id: req.patient.id };

    if (startDate || endDate) {
      where.measured_at = {};
      if (startDate) where.measured_at[Op.gte] = new Date(startDate);
      if (endDate) where.measured_at[Op.lte] = new Date(endDate);
    }

    if (measure_definition_id) {
      where.measure_definition_id = measure_definition_id;
    }

    // Determine patient language for translations
    const lang = req.patient.language_preference || req.user.language_preference || 'fr';

    const measures = await db.PatientMeasure.findAll({
      where,
      include: [{
        model: db.MeasureDefinition,
        as: 'measureDefinition',
        attributes: ['id', 'name', 'display_name', 'unit', 'category', 'measure_type'],
        required: true,
        where: { name: { [Op.notLike]: 'cle_%' } },
        include: [{
          model: db.MeasureTranslation,
          as: 'translations',
          where: { language_code: lang, entity_type: 'measure_definition' },
          required: false
        }]
      }],
      order: [['measured_at', 'DESC']]
    });

    // Apply translations to measure definitions
    const applyTranslations = (def) => {
      if (!def || !def.translations) return def;
      const defJson = def.toJSON ? def.toJSON() : { ...def };
      for (const t of defJson.translations || []) {
        if (t.field_name === 'display_name' && t.translated_value) {
          defJson.display_name = t.translated_value;
        } else if (t.field_name === 'unit' && t.translated_value) {
          defJson.unit = t.translated_value;
        } else if (t.field_name === 'description' && t.translated_value) {
          defJson.description = t.translated_value;
        }
      }
      delete defJson.translations;
      return defJson;
    };

    // Transform measures with translated definitions
    const translatedMeasures = measures.map(m => {
      const mJson = m.toJSON();
      mJson.measureDefinition = applyTranslations(mJson.measureDefinition);
      return mJson;
    });

    // Also get available measure definitions for this patient
    const definitionIds = [...new Set(measures.map(m => m.measure_definition_id))];
    const definitions = await db.MeasureDefinition.findAll({
      where: { id: { [Op.in]: definitionIds } },
      attributes: ['id', 'name', 'display_name', 'unit', 'category', 'measure_type'],
      include: [{
        model: db.MeasureTranslation,
        as: 'translations',
        where: { language_code: lang, entity_type: 'measure_definition' },
        required: false
      }],
      order: [['name', 'ASC']]
    });

    const translatedDefinitions = definitions.map(d => applyTranslations(d));

    // Get all loggable definitions (patient_can_log: true, is_active: true), excluding cle_* measures
    const loggableDefs = await db.MeasureDefinition.findAll({
      where: { patient_can_log: true, is_active: true, name: { [Op.notLike]: 'cle_%' } },
      attributes: ['id', 'name', 'display_name', 'unit', 'category', 'measure_type', 'min_value', 'max_value', 'decimal_places'],
      include: [{
        model: db.MeasureTranslation,
        as: 'translations',
        where: { language_code: lang, entity_type: 'measure_definition' },
        required: false
      }],
      order: [['display_order', 'ASC'], ['display_name', 'ASC']]
    });

    const translatedLoggable = loggableDefs.map(d => applyTranslations(d));

    res.json({
      success: true,
      data: { measures: translatedMeasures, definitions: translatedDefinitions, loggableDefinitions: translatedLoggable }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/visit-types — Active visit types for booking
 */
exports.getVisitTypes = async (req, res, next) => {
  try {
    const visitTypes = await db.VisitType.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'duration_minutes', 'default_price', 'description'],
      order: [['display_order', 'ASC'], ['name', 'ASC']]
    });
    res.json({ success: true, data: visitTypes });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/my-dietitians — Dietitians linked to this patient
 */
exports.getMyDietitians = async (req, res, next) => {
  try {
    const links = await db.PatientDietitian.findAll({
      where: { patient_id: req.patient.id },
      include: [{
        model: db.User,
        as: 'dietitian',
        attributes: ['id', 'first_name', 'last_name', 'username'],
        where: { is_active: true }
      }]
    });
    const dietitians = links.map(l => l.dietitian).filter(Boolean);
    res.json({ success: true, data: dietitians });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/portal/visits — Create a visit request (patient)
 */
exports.createVisitRequest = async (req, res, next) => {
  try {
    const { dietitian_id, visit_date, visit_type, request_message, duration_minutes } = req.body;
    const patientId = req.patient.id;

    // Validate that the dietitian is linked to this patient
    const link = await db.PatientDietitian.findOne({
      where: { patient_id: patientId, dietitian_id }
    });
    if (!link) {
      return res.status(400).json({ success: false, error: 'This dietitian is not assigned to you' });
    }

    // Validate dietitian exists and is active
    const dietitian = await db.User.findByPk(dietitian_id);
    if (!dietitian || !dietitian.is_active) {
      return res.status(400).json({ success: false, error: 'Dietitian not found or inactive' });
    }

    // Create visit with REQUESTED status (forced, never trust body)
    const visit = await db.Visit.create({
      patient_id: patientId,
      dietitian_id,
      visit_date,
      visit_type: visit_type || null,
      status: 'REQUESTED',
      duration_minutes: duration_minutes || null,
      request_message: request_message || null
    });

    const created = await db.Visit.findByPk(visit.id, {
      attributes: ['id', 'visit_date', 'visit_type', 'status', 'request_message', 'duration_minutes', 'created_at'],
      include: [{
        model: db.User,
        as: 'dietitian',
        attributes: ['id', 'first_name', 'last_name']
      }]
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/portal/visits/:id/cancel — Cancel a visit (patient)
 * REQUESTED → cancel always OK
 * SCHEDULED → cancel only if > 24h before visit_date
 */
exports.cancelVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patientId = req.patient.id;

    const visit = await db.Visit.findOne({
      where: { id, patient_id: patientId }
    });

    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visit not found' });
    }

    if (visit.status === 'REQUESTED') {
      // Can always cancel a request
      await visit.update({ status: 'CANCELLED' });
      return res.json({ success: true, data: { id: visit.id, status: 'CANCELLED' } });
    }

    if (visit.status === 'SCHEDULED') {
      // Check 24h rule
      const visitTime = new Date(visit.visit_date).getTime();
      const now = Date.now();
      const hoursUntil = (visitTime - now) / (1000 * 60 * 60);

      if (hoursUntil < 24) {
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel within 24 hours of the appointment'
        });
      }

      await visit.update({ status: 'CANCELLED' });
      return res.json({ success: true, data: { id: visit.id, status: 'CANCELLED' } });
    }

    return res.status(400).json({
      success: false,
      error: `Cannot cancel a visit with status ${visit.status}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/visits — Patient's visit history
 */
exports.getVisits = async (req, res, next) => {
  try {
    const lang = req.patient.language_preference || req.user.language_preference || 'fr';
    const patientId = req.patient.id;

    // 1. Fetch visits
    const visits = await db.Visit.findAll({
      where: { patient_id: patientId },
      attributes: ['id', 'visit_date', 'visit_type', 'status', 'visit_summary', 'request_message', 'created_at'],
      include: [{
        model: db.User,
        as: 'dietitian',
        attributes: ['id', 'first_name', 'last_name']
      }],
      order: [['visit_date', 'DESC']],
      limit: 100
    });

    // 2. Get all portal-enabled field definitions with their category
    const portalFields = await db.CustomFieldDefinition.findAll({
      where: { show_in_portal: true, is_active: true },
      attributes: ['id', 'field_name', 'field_label', 'field_type', 'display_order', 'allow_multiple', 'category_id'],
      include: [{
        model: db.CustomFieldCategory,
        as: 'category',
        attributes: ['id', 'entity_types']
      }],
      order: [['display_order', 'ASC']]
    });

    if (portalFields.length === 0) {
      // No portal fields configured, return visits without custom data
      return res.json({ success: true, data: visits });
    }

    // Separate patient-level vs visit-level fields
    const patientLevelFields = [];
    const visitLevelFields = [];
    portalFields.forEach(f => {
      const entityTypes = f.category?.entity_types || ['patient'];
      if (entityTypes.includes('patient')) {
        patientLevelFields.push(f);
      } else {
        visitLevelFields.push(f);
      }
    });

    // 3. Fetch patient-level values (shared across visits)
    const patientFieldDefIds = patientLevelFields.map(f => f.id);
    let patientValuesMap = {};
    if (patientFieldDefIds.length > 0) {
      const patientVals = await db.PatientCustomFieldValue.findAll({
        where: {
          patient_id: patientId,
          field_definition_id: { [Op.in]: patientFieldDefIds }
        }
      });
      patientVals.forEach(v => {
        patientValuesMap[v.field_definition_id] = v;
      });
    }

    // 4. Fetch visit-level values
    const visitFieldDefIds = visitLevelFields.map(f => f.id);
    let visitValuesMap = {};
    if (visitFieldDefIds.length > 0) {
      const visitIds = visits.map(v => v.id);
      const visitVals = await db.VisitCustomFieldValue.findAll({
        where: {
          visit_id: { [Op.in]: visitIds },
          field_definition_id: { [Op.in]: visitFieldDefIds }
        }
      });
      visitVals.forEach(v => {
        const key = `${v.visit_id}_${v.field_definition_id}`;
        visitValuesMap[key] = v;
      });
    }

    // 5. Fetch translations for field labels
    const allFieldIds = portalFields.map(f => f.id);
    let translationMap = {};
    const translations = await db.CustomFieldTranslation.findAll({
      where: {
        entity_type: 'field_definition',
        entity_id: { [Op.in]: allFieldIds },
        language_code: lang,
        field_name: 'field_label'
      }
    });
    for (const t of translations) {
      if (t.translated_value) {
        translationMap[t.entity_id] = t.translated_value;
      }
    }

    // 6. Helper to extract value from a field value record
    const extractValue = (record, fieldDef) => {
      if (!record) return null;
      const type = fieldDef.field_type;
      if (type === 'number') return record.value_number != null ? record.value_number : null;
      if (type === 'boolean') return record.value_boolean != null ? record.value_boolean : null;
      if ((type === 'select') && fieldDef.allow_multiple && record.value_json) {
        return record.value_json;
      }
      return record.value_text || null;
    };

    // 7. Build response with custom field values per visit
    const result = visits.map(v => {
      const vJson = v.toJSON();
      const customFieldValues = [];

      portalFields.forEach(field => {
        const entityTypes = field.category?.entity_types || ['patient'];
        const isPatientLevel = entityTypes.includes('patient');

        let record;
        if (isPatientLevel) {
          record = patientValuesMap[field.id];
        } else {
          record = visitValuesMap[`${v.id}_${field.id}`];
        }

        const value = extractValue(record, field);
        if (value === null || value === '' || value === undefined) return;

        const label = translationMap[field.id] || field.field_label || field.field_name;

        customFieldValues.push({
          id: record?.id || field.id,
          value_text: typeof value === 'string' ? value : null,
          value_number: typeof value === 'number' ? value : null,
          value_boolean: typeof value === 'boolean' ? value : null,
          value_json: (typeof value === 'object' && value !== null) ? value : null,
          field_definition: {
            id: field.id,
            field_name: field.field_name,
            field_label: label,
            field_type: field.field_type,
            display_order: field.display_order
          }
        });
      });

      vJson.custom_field_values = customFieldValues;
      return vJson;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/documents — Patient's shared documents
 */
exports.getDocuments = async (req, res, next) => {
  try {
    const shares = await db.DocumentShare.findAll({
      where: { patient_id: req.patient.id },
      include: [{
        model: db.Document,
        as: 'document',
        attributes: ['id', 'file_name', 'mime_type', 'file_size', 'category', 'description', 'created_at']
      }, {
        model: db.User,
        as: 'sharedByUser',
        attributes: ['id', 'first_name', 'last_name']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: shares });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/documents/:id/download — Download a shared document
 */
exports.downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify the document is shared with this patient
    const share = await db.DocumentShare.findOne({
      where: { document_id: id, patient_id: req.patient.id },
      include: [{
        model: db.Document,
        as: 'document'
      }]
    });

    if (!share || !share.document) {
      return res.status(404).json({ success: false, error: 'Document not found or not shared with you' });
    }

    const document = share.document;
    const path = require('path');
    const uploadsBasePath = process.env.NODE_ENV === 'production' ? '/app/uploads' : path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsBasePath, document.file_path);

    // Log access
    await db.DocumentAccessLog.create({
      document_share_id: share.id,
      action: 'download',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.download(filePath, document.file_name);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/recipes — Patient's shared recipes
 */
exports.getRecipes = async (req, res, next) => {
  try {
    // Get individually shared recipes
    const access = await db.RecipePatientAccess.findAll({
      where: { patient_id: req.patient.id },
      include: [{
        model: db.Recipe,
        as: 'recipe',
        attributes: ['id', 'title', 'description', 'prep_time_minutes', 'cook_time_minutes', 'servings', 'difficulty', 'image_url', 'source_url', 'visibility'],
        include: [{
          model: db.RecipeCategory,
          as: 'category',
          attributes: ['id', 'name']
        }]
      }, {
        model: db.User,
        as: 'sharedByUser',
        attributes: ['id', 'first_name', 'last_name']
      }],
      order: [['created_at', 'DESC']]
    });

    // Get public recipes not already in the individual shares
    const sharedRecipeIds = access.map(a => a.recipe?.id).filter(Boolean);
    const publicWhere = {
      visibility: 'public',
      status: 'published',
      is_active: true
    };
    if (sharedRecipeIds.length > 0) {
      publicWhere.id = { [db.Sequelize.Op.notIn]: sharedRecipeIds };
    }

    const publicRecipes = await db.Recipe.findAll({
      where: publicWhere,
      attributes: ['id', 'title', 'description', 'prep_time_minutes', 'cook_time_minutes', 'servings', 'difficulty', 'image_url', 'source_url', 'visibility', 'created_at'],
      include: [{
        model: db.RecipeCategory,
        as: 'category',
        attributes: ['id', 'name']
      }, {
        model: db.User,
        as: 'creator',
        attributes: ['id', 'first_name', 'last_name']
      }],
      order: [['created_at', 'DESC']]
    });

    // Merge: individual shares first, then public recipes formatted as pseudo-access objects
    const publicAsAccess = publicRecipes.map(r => ({
      id: `public-${r.id}`,
      recipe: r,
      sharedByUser: r.creator,
      created_at: r.created_at,
      is_public: true
    }));

    const combined = [...access, ...publicAsAccess];
    res.json({ success: true, data: combined });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/recipes/:id — Recipe detail
 */
exports.getRecipeDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify access: individual share OR public recipe
    const access = await db.RecipePatientAccess.findOne({
      where: { recipe_id: id, patient_id: req.patient.id }
    });

    const recipe = await db.Recipe.findByPk(id, {
      include: [
        {
          model: db.RecipeCategory,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: db.RecipeIngredient,
          as: 'ingredients',
          include: [{
            model: db.Ingredient,
            as: 'ingredient',
            attributes: ['id', 'name']
          }]
        }
      ]
    });

    if (!recipe) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    // Allow access if individually shared OR if recipe is public
    const isPublic = recipe.visibility === 'public' && recipe.status === 'published' && recipe.is_active;
    if (!access && !isPublic) {
      return res.status(404).json({ success: false, error: 'Recipe not found or not shared with you' });
    }

    res.json({
      success: true,
      data: {
        ...recipe.toJSON(),
        shared_notes: access ? access.notes : null,
        shared_at: access ? access.created_at : null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/portal/theme — Change theme
 */
exports.updateTheme = async (req, res, next) => {
  try {
    const { theme_id } = req.body;

    // Verify theme exists
    if (theme_id) {
      const theme = await db.Theme.findByPk(theme_id);
      if (!theme) {
        return res.status(400).json({ success: false, error: 'Theme not found' });
      }
    }

    await db.User.update(
      { theme_id: theme_id || null },
      { where: { id: req.user.id } }
    );

    res.json({ success: true, data: { theme_id } });
  } catch (error) {
    next(error);
  }
};

// =============================================
// JOURNAL ENDPOINTS
// =============================================

/**
 * GET /api/portal/journal — List own journal entries
 */
exports.getJournalEntries = async (req, res, next) => {
  try {
    const { startDate, endDate, entry_type, mood, page = 1, limit = 50 } = req.query;

    const where = { patient_id: req.patient.id };

    if (startDate || endDate) {
      where.entry_date = {};
      if (startDate) where.entry_date[Op.gte] = startDate;
      if (endDate) where.entry_date[Op.lte] = endDate;
    }
    if (entry_type) where.entry_type = entry_type;
    if (mood) where.mood = mood;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await db.JournalEntry.findAndCountAll({
      where,
      include: [{
        model: db.JournalComment,
        as: 'comments',
        include: [{
          model: db.User,
          as: 'author',
          attributes: ['id', 'first_name', 'last_name']
        }],
        order: [['created_at', 'ASC']]
      }, {
        model: db.Document,
        as: 'photos',
        where: { is_active: true },
        required: false,
        attributes: ['id', 'file_name', 'file_path', 'file_size', 'mime_type', 'created_at']
      }, {
        model: db.User,
        as: 'createdBy',
        attributes: ['id', 'first_name', 'last_name']
      }],
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/portal/journal — Create a journal entry
 */
exports.createJournalEntry = async (req, res, next) => {
  try {
    const { entry_date, entry_type, title, content, mood, energy_level, tags, is_private } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const entry = await db.JournalEntry.create({
      patient_id: req.patient.id,
      entry_date: entry_date || new Date().toISOString().split('T')[0],
      entry_type: entry_type || 'note',
      title: title || null,
      content: content.trim(),
      mood: mood || null,
      energy_level: energy_level || null,
      tags: tags || null,
      is_private: is_private || false
    });

    const created = await db.JournalEntry.findByPk(entry.id, {
      include: [{
        model: db.Document,
        as: 'photos',
        where: { is_active: true },
        required: false,
        attributes: ['id', 'file_name', 'file_path', 'file_size', 'mime_type', 'created_at']
      }]
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/portal/journal/:id — Update own journal entry
 */
exports.updateJournalEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const entry = await db.JournalEntry.findOne({
      where: { id, patient_id: req.patient.id }
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    if (entry.created_by_user_id) {
      return res.status(403).json({ success: false, error: 'Vous ne pouvez pas modifier les notes de votre diététicien(ne)' });
    }

    const { entry_date, entry_type, title, content, mood, energy_level, tags, is_private } = req.body;

    const updateData = {};
    if (entry_date !== undefined) updateData.entry_date = entry_date;
    if (entry_type !== undefined) updateData.entry_type = entry_type;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (mood !== undefined) updateData.mood = mood;
    if (energy_level !== undefined) updateData.energy_level = energy_level;
    if (tags !== undefined) updateData.tags = tags;
    if (is_private !== undefined) updateData.is_private = is_private;

    await entry.update(updateData);

    const updated = await db.JournalEntry.findByPk(id, {
      include: [{
        model: db.JournalComment,
        as: 'comments',
        include: [{
          model: db.User,
          as: 'author',
          attributes: ['id', 'first_name', 'last_name']
        }]
      }, {
        model: db.Document,
        as: 'photos',
        where: { is_active: true },
        required: false,
        attributes: ['id', 'file_name', 'file_path', 'file_size', 'mime_type', 'created_at']
      }]
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/portal/journal/:id — Soft-delete own journal entry
 */
exports.deleteJournalEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const entry = await db.JournalEntry.findOne({
      where: { id, patient_id: req.patient.id }
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    if (entry.created_by_user_id) {
      return res.status(403).json({ success: false, error: 'Vous ne pouvez pas supprimer les notes de votre diététicien(ne)' });
    }

    await entry.destroy();

    res.json({ success: true, message: 'Journal entry deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/portal/journal/:id/comments — Add comment to a journal entry
 */
exports.addJournalComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const entry = await db.JournalEntry.findOne({
      where: { id, patient_id: req.patient.id }
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    const comment = await db.JournalComment.create({
      journal_entry_id: id,
      user_id: req.patient.user_id,
      content: content.trim()
    });

    const created = await db.JournalComment.findByPk(comment.id, {
      include: [{
        model: db.User,
        as: 'author',
        attributes: ['id', 'first_name', 'last_name']
      }]
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/portal/measures — Log a measure from the patient portal
 */
exports.logMeasure = async (req, res, next) => {
  try {
    const { measure_definition_id, value, measured_at, notes } = req.body;

    // Load the measure definition
    const definition = await db.MeasureDefinition.findByPk(measure_definition_id);
    if (!definition) {
      return res.status(404).json({ success: false, error: 'Measure definition not found' });
    }

    // Verify it's active and patient-loggable
    if (!definition.is_active || !definition.patient_can_log) {
      return res.status(403).json({ success: false, error: 'This measure cannot be logged by patients' });
    }

    // Use the existing patientMeasure service
    const patientMeasureService = require('../services/patientMeasure.service');
    const result = await patientMeasureService.logMeasure(
      req.patient.id,
      { measure_definition_id, value, measured_at, notes },
      req.user
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('must be')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// =============================================
// RADAR CHART (WIND ROSE) ENDPOINTS
// =============================================

/**
 * GET /api/portal/radar — Get radar chart categories + values for the patient
 */
exports.getRadarData = async (req, res, next) => {
  try {
    const patientId = req.patient.id;
    const lang = req.patient.language_preference || req.user.language_preference || 'fr';

    // Get categories with display_layout.type = 'radar' and their field definitions
    const categories = await db.CustomFieldCategory.findAll({
      where: { is_active: true },
      order: [['display_order', 'ASC']],
      include: [{
        model: db.CustomFieldDefinition,
        as: 'field_definitions',
        where: { is_active: true },
        required: false
      }]
    });

    // Filter to only radar categories that apply to patients
    const radarCategories = categories.filter(c => {
      const layout = c.display_layout || {};
      if (layout.type !== 'radar') return false;
      const entityTypes = c.entity_types || ['patient'];
      return entityTypes.includes('patient') || entityTypes.includes('visit');
    });

    if (radarCategories.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get patient custom field values
    const allFieldIds = [];
    radarCategories.forEach(c => {
      (c.field_definitions || []).forEach(f => allFieldIds.push(f.id));
    });

    const patientValues = await db.PatientCustomFieldValue.findAll({
      where: { patient_id: patientId, field_definition_id: { [Op.in]: allFieldIds } }
    });

    const valuesMap = {};
    patientValues.forEach(v => {
      valuesMap[v.field_definition_id] = v;
    });

    // For visit-level categories, load from latest visit
    const visitCategories = radarCategories.filter(c => {
      const et = c.entity_types || ['patient'];
      return !et.includes('patient') && et.includes('visit');
    });

    if (visitCategories.length > 0) {
      const latestVisit = await db.Visit.findOne({
        where: { patient_id: patientId },
        order: [['visit_date', 'DESC']],
        attributes: ['id']
      });

      if (latestVisit) {
        const visitFieldIds = [];
        visitCategories.forEach(c => {
          (c.field_definitions || []).forEach(f => visitFieldIds.push(f.id));
        });

        if (visitFieldIds.length > 0) {
          const visitValues = await db.VisitCustomFieldValue.findAll({
            where: {
              visit_id: latestVisit.id,
              field_definition_id: { [Op.in]: visitFieldIds }
            }
          });
          visitValues.forEach(v => {
            valuesMap[v.field_definition_id] = v;
          });
        }
      }
    }

    // Get translations for field labels
    let translationMap = {};
    if (lang !== 'fr') {
      const translations = await db.CustomFieldTranslation.findAll({
        where: {
          entity_type: 'field_definition',
          entity_id: { [Op.in]: allFieldIds },
          language_code: lang,
          field_name: 'field_label'
        }
      });
      for (const t of translations) {
        if (t.translated_value) translationMap[t.entity_id] = t.translated_value;
      }
    }

    // Resolve embedded fields: fetch latest PatientMeasure values
    const embeddedFields = [];
    radarCategories.forEach(c => {
      (c.field_definitions || []).forEach(def => {
        if (def.field_type === 'embedded') {
          let opts = null;
          try { opts = def.select_options ? JSON.parse(def.select_options) : null; } catch (e) { opts = def.select_options; }
          if (opts && opts.measure_name) {
            embeddedFields.push({ def, measureName: opts.measure_name });
          }
        }
      });
    });

    const embeddedValuesMap = {};
    const embeddedMeasureDefsMap = {};

    if (embeddedFields.length > 0) {
      // Find all referenced measure definitions
      const measureNames = [...new Set(embeddedFields.map(e => e.measureName))];
      const measureDefs = await db.MeasureDefinition.findAll({
        where: { is_active: true }
      });

      const measureDefByName = {};
      for (const md of measureDefs) {
        measureDefByName[md.name?.toLowerCase()] = md;
        if (md.display_name) measureDefByName[md.display_name.toLowerCase()] = md;
      }

      for (const { def, measureName } of embeddedFields) {
        const measureDef = measureDefByName[measureName.toLowerCase()];
        if (!measureDef) continue;

        embeddedMeasureDefsMap[def.id] = measureDef;

        // Get latest measure for this patient
        const latestMeasure = await db.PatientMeasure.findOne({
          where: {
            patient_id: patientId,
            measure_definition_id: measureDef.id
          },
          order: [['recorded_at', 'DESC']],
          limit: 1
        });

        if (latestMeasure) {
          if (measureDef.measure_type === 'numeric' || measureDef.measure_type === 'calculated') {
            embeddedValuesMap[def.id] = latestMeasure.numeric_value;
          } else if (measureDef.measure_type === 'boolean') {
            embeddedValuesMap[def.id] = latestMeasure.boolean_value;
          } else {
            embeddedValuesMap[def.id] = latestMeasure.numeric_value ?? latestMeasure.text_value;
          }
        }
      }
    }

    // Build response
    const result = radarCategories.map(category => {
      const fields = (category.field_definitions || [])
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map(def => {
          let value = null;

          if (def.field_type === 'embedded') {
            // Use resolved embedded value from PatientMeasure
            value = embeddedValuesMap[def.id] !== undefined ? embeddedValuesMap[def.id] : null;
          } else {
            const valueRecord = valuesMap[def.id];
            if (valueRecord) {
              const type = def.field_type;
              if (type === 'number' || type === 'decimal' || type === 'integer') {
                value = valueRecord.value_number != null ? valueRecord.value_number : null;
              } else if (type === 'boolean' || type === 'checkbox') {
                value = valueRecord.value_boolean != null ? valueRecord.value_boolean : null;
              } else if (type === 'select' && def.allow_multiple && valueRecord.value_json) {
                value = valueRecord.value_json;
              } else {
                value = valueRecord.value_text || null;
              }
            }
          }

          let selectOptions = null;
          try {
            selectOptions = def.select_options ? JSON.parse(def.select_options) : null;
          } catch (e) {
            selectOptions = def.select_options;
          }

          let validationRules = null;
          try {
            validationRules = def.validation_rules ? JSON.parse(def.validation_rules) : null;
          } catch (e) {
            validationRules = def.validation_rules;
          }

          // For embedded fields, include measure min/max for normalization
          const measureDef = embeddedMeasureDefsMap[def.id];
          const measureRange = measureDef ? {
            min_value: measureDef.min_value,
            max_value: measureDef.max_value
          } : null;

          return {
            definition_id: def.id,
            field_name: def.field_name,
            field_label: translationMap[def.id] || def.field_label || def.field_name,
            field_type: def.field_type,
            validation_rules: validationRules,
            select_options: selectOptions,
            display_order: def.display_order,
            value,
            ...(measureRange && { measure_range: measureRange })
          };
        });

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color || '#3498db',
        display_layout: category.display_layout || { type: 'radar' },
        fields
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// =============================================
// INVOICE ENDPOINTS
// =============================================

/**
 * GET /api/portal/invoices — Patient's invoices (SENT, PAID, OVERDUE only)
 */
exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await db.Billing.findAll({
      where: {
        patient_id: req.patient.id,
        status: { [Op.in]: ['SENT', 'PAID', 'OVERDUE'] }
      },
      attributes: [
        'id', 'invoice_number', 'invoice_date', 'due_date',
        'service_description', 'amount_total', 'amount_paid',
        'amount_due', 'status', 'payment_method', 'payment_date'
      ],
      include: [{
        model: db.Payment,
        as: 'payments',
        attributes: ['id', 'amount', 'payment_method', 'payment_date', 'status'],
        where: { status: 'PAID' },
        required: false
      }],
      order: [['invoice_date', 'DESC']]
    });

    res.json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portal/invoices/:id/pdf — Download invoice PDF
 */
exports.downloadInvoicePDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify the invoice belongs to this patient and is not DRAFT
    const invoice = await db.Billing.findOne({
      where: {
        id,
        patient_id: req.patient.id,
        status: { [Op.notIn]: ['DRAFT', 'CANCELLED'] }
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Find the dietitian for branding: first assigned dietitian, or first admin
    let userId;
    const patientDietitian = await db.PatientDietitian.findOne({
      where: { patient_id: req.patient.id },
      include: [{ model: db.User, as: 'dietitian', attributes: ['id'] }]
    });

    if (patientDietitian?.dietitian?.id) {
      userId = patientDietitian.dietitian.id;
    } else {
      // Fallback to first admin
      const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
      if (adminRole) {
        const admin = await db.User.findOne({ where: { role_id: adminRole.id, is_active: true } });
        if (admin) userId = admin.id;
      }
    }

    const lang = req.patient.language_preference || 'fr';
    const invoicePDFService = require('../services/invoicePDF.service');
    const pdfDoc = await invoicePDFService.generateInvoicePDF(id, userId, lang);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
    pdfDoc.pipe(res);
  } catch (error) {
    next(error);
  }
};

// =============================================
// JOURNAL PHOTO ENDPOINTS
// =============================================

const MAX_JOURNAL_PHOTOS = 5;

/**
 * POST /api/portal/journal/:id/photos — Upload photos to a journal entry
 */
exports.uploadJournalPhotos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    // Verify entry belongs to patient
    const entry = await db.JournalEntry.findOne({
      where: { id, patient_id: req.patient.id }
    });
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    // Check existing photo count
    const existingCount = await db.Document.count({
      where: { resource_type: 'journal_entry', resource_id: id, is_active: true }
    });

    if (existingCount + files.length > MAX_JOURNAL_PHOTOS) {
      // Clean up temp files
      for (const file of files) {
        try { await fs.unlink(file.path); } catch {}
      }
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_JOURNAL_PHOTOS} photos per entry. Currently ${existingCount}, trying to add ${files.length}.`
      });
    }

    const photos = [];
    for (const file of files) {
      const filePath = generateFilePath('journal_entry', id, file.originalname);
      await ensureUploadDirectory(filePath);
      const fullFilePath = path.join(process.cwd(), UPLOAD_DIR, filePath);

      try {
        await fs.copyFile(file.path, fullFilePath);
        await fs.unlink(file.path);
      } catch (err) {
        try { await fs.unlink(file.path); } catch {}
        throw err;
      }

      const doc = await db.Document.create({
        resource_type: 'journal_entry',
        resource_id: id,
        file_name: file.originalname,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.mimetype,
        uploaded_by: req.user.id
      });

      photos.push({
        id: doc.id,
        file_name: doc.file_name,
        file_path: doc.file_path,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        created_at: doc.created_at
      });
    }

    res.status(201).json({ success: true, data: photos });
  } catch (error) {
    // Clean up any remaining temp files
    if (req.files) {
      for (const file of req.files) {
        try { await fs.unlink(file.path); } catch {}
      }
    }
    next(error);
  }
};

/**
 * DELETE /api/portal/journal/:id/photos/:photoId — Delete a photo from a journal entry
 */
exports.deleteJournalPhoto = async (req, res, next) => {
  try {
    const { id, photoId } = req.params;

    // Verify entry belongs to patient
    const entry = await db.JournalEntry.findOne({
      where: { id, patient_id: req.patient.id }
    });
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    const photo = await db.Document.findOne({
      where: { id: photoId, resource_type: 'journal_entry', resource_id: id, is_active: true }
    });
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }

    await photo.update({ is_active: false });

    res.json({ success: true, message: 'Photo deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/portal/set-password — Set password from invitation token (public)
 */
exports.setPassword = async (req, res, next) => {
  try {
    const portalService = require('../services/portal.service');
    const { token, password } = req.body;

    const result = await portalService.setPasswordFromInvitation(token, password);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('expired') || error.message.includes('Invalid') || error.message.includes('required') || error.message.includes('at least')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};
