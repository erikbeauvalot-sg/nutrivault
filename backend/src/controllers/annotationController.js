/**
 * Annotation Controller
 *
 * Handles CRUD operations for measure annotations
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts (Phase 3)
 */

const db = require('../../../models');
const MeasureAnnotation = db.MeasureAnnotation;
const Patient = db.Patient;
const MeasureDefinition = db.MeasureDefinition;
const User = db.User;
const auditService = require('../services/audit.service');
const { Op } = require('sequelize');

/**
 * GET /api/patients/:patientId/annotations
 * Get all annotations for a patient
 */
async function getAnnotations(req, res) {
  try {
    const { patientId } = req.params;
    const { measure_definition_id, start_date, end_date } = req.query;

    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    const where = { patient_id: patientId };

    // Filter by measure definition
    if (measure_definition_id) {
      where[Op.or] = [
        { measure_definition_id },
        { measure_definition_id: null } // Include global annotations
      ];
    }

    // Filter by date range
    if (start_date || end_date) {
      where.event_date = {};
      if (start_date) {
        where.event_date[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        where.event_date[Op.lte] = new Date(end_date);
      }
    }

    const annotations = await MeasureAnnotation.findAll({
      where,
      include: [
        {
          model: MeasureDefinition,
          as: 'measureDefinition',
          attributes: ['id', 'name', 'display_name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ],
      order: [['event_date', 'DESC']]
    });

    // Audit log
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'READ',
      resource_type: 'annotations',
      resource_id: patientId,
      details: { count: annotations.length },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: annotations,
      count: annotations.length
    });
  } catch (error) {
    console.error('Error in getAnnotations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch annotations'
    });
  }
}

/**
 * POST /api/patients/:patientId/annotations
 * Create a new annotation
 */
async function createAnnotation(req, res) {
  try {
    const { patientId } = req.params;
    const { measure_definition_id, event_date, event_type, title, description, color } = req.body;

    // Validate required fields
    if (!event_date || !title) {
      return res.status(400).json({
        success: false,
        error: 'event_date and title are required'
      });
    }

    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Verify measure definition if provided
    if (measure_definition_id) {
      const measureDef = await MeasureDefinition.findByPk(measure_definition_id);
      if (!measureDef) {
        return res.status(404).json({
          success: false,
          error: 'Measure definition not found'
        });
      }
    }

    // Create annotation
    const annotation = await MeasureAnnotation.create({
      patient_id: patientId,
      measure_definition_id: measure_definition_id || null,
      event_date: new Date(event_date),
      event_type: event_type || 'other',
      title,
      description: description || null,
      color: color || '#FF5733',
      created_by: req.user.id
    });

    // Audit log
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'CREATE',
      resource_type: 'annotation',
      resource_id: annotation.id,
      details: {
        patient_id: patientId,
        event_date,
        title
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Fetch created annotation with associations
    const created = await MeasureAnnotation.findByPk(annotation.id, {
      include: [
        {
          model: MeasureDefinition,
          as: 'measureDefinition',
          attributes: ['id', 'name', 'display_name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: created,
      message: 'Annotation created successfully'
    });
  } catch (error) {
    console.error('Error in createAnnotation:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to create annotation'
    });
  }
}

/**
 * PUT /api/annotations/:id
 * Update an annotation
 */
async function updateAnnotation(req, res) {
  try {
    const { id } = req.params;
    const { event_date, event_type, title, description, color } = req.body;

    const annotation = await MeasureAnnotation.findByPk(id);

    if (!annotation) {
      return res.status(404).json({
        success: false,
        error: 'Annotation not found'
      });
    }

    // Update fields
    if (event_date) annotation.event_date = new Date(event_date);
    if (event_type) annotation.event_type = event_type;
    if (title) annotation.title = title;
    if (description !== undefined) annotation.description = description;
    if (color) annotation.color = color;

    await annotation.save();

    // Audit log
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'UPDATE',
      resource_type: 'annotation',
      resource_id: id,
      details: { updated_fields: req.body },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Fetch updated annotation with associations
    const updated = await MeasureAnnotation.findByPk(id, {
      include: [
        {
          model: MeasureDefinition,
          as: 'measureDefinition',
          attributes: ['id', 'name', 'display_name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    res.json({
      success: true,
      data: updated,
      message: 'Annotation updated successfully'
    });
  } catch (error) {
    console.error('Error in updateAnnotation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update annotation'
    });
  }
}

/**
 * DELETE /api/annotations/:id
 * Delete (soft delete) an annotation
 */
async function deleteAnnotation(req, res) {
  try {
    const { id } = req.params;

    const annotation = await MeasureAnnotation.findByPk(id);

    if (!annotation) {
      return res.status(404).json({
        success: false,
        error: 'Annotation not found'
      });
    }

    // Soft delete
    await annotation.destroy();

    // Audit log
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'DELETE',
      resource_type: 'annotation',
      resource_id: id,
      details: {
        patient_id: annotation.patient_id,
        title: annotation.title
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Annotation deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteAnnotation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete annotation'
    });
  }
}

module.exports = {
  getAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation
};
