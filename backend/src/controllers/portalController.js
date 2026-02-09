/**
 * Portal Controller
 * Handles patient portal endpoints - all scoped to req.patient
 */

const db = require('../../../models');
const bcrypt = require('bcryptjs');
const { Op } = db.Sequelize;

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
        include: [{
          model: db.MeasureTranslation,
          as: 'translations',
          where: { language_code: lang, entity_type: 'measure_definition' },
          required: false
        }]
      }],
      order: [['measured_at', 'DESC']],
      limit: 500
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

    res.json({
      success: true,
      data: { measures: translatedMeasures, definitions: translatedDefinitions }
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
      attributes: ['id', 'visit_date', 'visit_type', 'status', 'visit_summary', 'created_at'],
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
    const access = await db.RecipePatientAccess.findAll({
      where: { patient_id: req.patient.id },
      include: [{
        model: db.Recipe,
        as: 'recipe',
        attributes: ['id', 'title', 'description', 'prep_time_minutes', 'cook_time_minutes', 'servings', 'difficulty', 'image_url', 'source_url'],
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

    res.json({ success: true, data: access });
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

    // Verify access
    const access = await db.RecipePatientAccess.findOne({
      where: { recipe_id: id, patient_id: req.patient.id }
    });

    if (!access) {
      return res.status(404).json({ success: false, error: 'Recipe not found or not shared with you' });
    }

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

    res.json({
      success: true,
      data: {
        ...recipe.toJSON(),
        shared_notes: access.notes,
        shared_at: access.created_at
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

    res.status(201).json({ success: true, data: entry });
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

    await entry.destroy();

    res.json({ success: true, message: 'Journal entry deleted' });
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
