/**
 * Journal Controller (Dietitian-facing)
 * Endpoints for dietitians to view patient journal entries and add comments
 */

const db = require('../../../models');
const { Op } = db.Sequelize;
const { canAccessPatient } = require('../helpers/scopeHelper');

/**
 * GET /api/patients/:patientId/journal — View patient's journal (excludes private entries)
 */
exports.getPatientJournal = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate, entry_type, mood, page = 1, limit = 50 } = req.query;

    // Check patient exists
    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // RBAC: verify dietitian has access to this patient
    const hasAccess = await canAccessPatient(req.user, patient);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied to this patient' });
    }

    const where = {
      patient_id: patientId,
      is_private: false // Dietitians cannot see private entries
    };

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
      include: [
        {
          model: db.JournalComment,
          as: 'comments',
          include: [{
            model: db.User,
            as: 'author',
            attributes: ['id', 'first_name', 'last_name']
          }],
          order: [['created_at', 'ASC']]
        },
        {
          model: db.User,
          as: 'createdBy',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
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
 * POST /api/patients/:patientId/journal — Create a journal entry for a patient (dietitian note)
 */
exports.createJournalEntry = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { entry_date, entry_type, title, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const hasAccess = await canAccessPatient(req.user, patient);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied to this patient' });
    }

    const entry = await db.JournalEntry.create({
      patient_id: patientId,
      entry_date: entry_date || new Date().toISOString().split('T')[0],
      entry_type: entry_type || 'note',
      title: title?.trim() || null,
      content: content.trim(),
      is_private: false,
      created_by_user_id: req.user.id
    });

    const created = await db.JournalEntry.findByPk(entry.id, {
      include: [
        {
          model: db.User,
          as: 'createdBy',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: db.JournalComment,
          as: 'comments'
        }
      ]
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/patients/:patientId/journal/:entryId — Update own journal entry
 */
exports.updateJournalEntry = async (req, res, next) => {
  try {
    const { patientId, entryId } = req.params;
    const { entry_date, entry_type, title, content } = req.body;

    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const hasAccess = await canAccessPatient(req.user, patient);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied to this patient' });
    }

    const entry = await db.JournalEntry.findOne({
      where: { id: entryId, patient_id: patientId }
    });
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    // Only the author can update (or ADMIN)
    const roleName = req.user.role?.name || req.user.role;
    if (entry.created_by_user_id !== req.user.id && roleName !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'You can only edit your own notes' });
    }

    if (content !== undefined) entry.content = content.trim();
    if (title !== undefined) entry.title = title.trim() || null;
    if (entry_type) entry.entry_type = entry_type;
    if (entry_date) entry.entry_date = entry_date;
    await entry.save();

    const updated = await db.JournalEntry.findByPk(entry.id, {
      include: [
        { model: db.User, as: 'createdBy', attributes: ['id', 'first_name', 'last_name'] },
        { model: db.JournalComment, as: 'comments', include: [{ model: db.User, as: 'author', attributes: ['id', 'first_name', 'last_name'] }] }
      ]
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/patients/:patientId/journal/:entryId — Delete own journal entry
 */
exports.deleteJournalEntry = async (req, res, next) => {
  try {
    const { patientId, entryId } = req.params;

    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const hasAccess = await canAccessPatient(req.user, patient);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied to this patient' });
    }

    const entry = await db.JournalEntry.findOne({
      where: { id: entryId, patient_id: patientId }
    });
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    // Only the author can delete (or ADMIN)
    const roleName = req.user.role?.name || req.user.role;
    if (entry.created_by_user_id !== req.user.id && roleName !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'You can only delete your own notes' });
    }

    await entry.destroy();

    res.json({ success: true, message: 'Journal entry deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/patients/:patientId/journal/:entryId/comments — Add comment to entry
 */
exports.addComment = async (req, res, next) => {
  try {
    const { patientId, entryId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    // Check patient exists
    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // RBAC: verify access
    const hasAccess = await canAccessPatient(req.user, patient);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied to this patient' });
    }

    // Verify entry exists and belongs to this patient, and is not private
    const entry = await db.JournalEntry.findOne({
      where: { id: entryId, patient_id: patientId, is_private: false }
    });
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    const comment = await db.JournalComment.create({
      journal_entry_id: entryId,
      user_id: req.user.id,
      content: content.trim()
    });

    // Reload with author info
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
 * DELETE /api/patients/:patientId/journal/comments/:commentId — Delete own comment
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const { patientId, commentId } = req.params;

    // Check patient exists
    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // RBAC: verify access
    const hasAccess = await canAccessPatient(req.user, patient);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied to this patient' });
    }

    const comment = await db.JournalComment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Only the author can delete their own comment (or ADMIN)
    const roleName = req.user.role?.name || req.user.role;
    if (comment.user_id !== req.user.id && roleName !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'You can only delete your own comments' });
    }

    await comment.destroy();

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
};
