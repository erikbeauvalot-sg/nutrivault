/**
 * Visit Type Controller
 * Handles HTTP requests for visit type operations
 */

const db = require('../../../models');
const { VisitType } = db;

/**
 * GET /api/visit-types
 * Get all visit types
 */
const getAllVisitTypes = async (req, res) => {
  try {
    const { is_active, search } = req.query;

    const where = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true' || is_active === '1';
    }
    if (search) {
      where.name = {
        [db.Sequelize.Op.like]: `%${search}%`
      };
    }

    const visitTypes = await VisitType.findAll({
      where,
      order: [['display_order', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: visitTypes
    });
  } catch (error) {
    console.error('[VisitTypeController] Error getting all visit types:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get visit types'
    });
  }
};

/**
 * GET /api/visit-types/:id
 * Get visit type by ID
 */
const getVisitTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const visitType = await VisitType.findByPk(id);

    if (!visitType) {
      return res.status(404).json({
        success: false,
        error: 'Visit type not found'
      });
    }

    res.json({
      success: true,
      data: visitType
    });
  } catch (error) {
    console.error('[VisitTypeController] Error getting visit type by ID:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get visit type'
    });
  }
};

/**
 * POST /api/visit-types
 * Create new visit type
 */
const createVisitType = async (req, res) => {
  try {
    const { name, description, display_order, is_active, color, duration_minutes, default_price } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Visit type name is required'
      });
    }

    // Check for duplicate name
    const existing = await VisitType.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A visit type with this name already exists'
      });
    }

    const visitType = await VisitType.create({
      name,
      description,
      display_order: display_order || 0,
      is_active: is_active !== false,
      color,
      duration_minutes: duration_minutes || null,
      default_price: default_price || null
    });

    res.status(201).json({
      success: true,
      message: 'Visit type created successfully',
      data: visitType
    });
  } catch (error) {
    console.error('[VisitTypeController] Error creating visit type:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create visit type'
    });
  }
};

/**
 * PUT /api/visit-types/:id
 * Update visit type
 */
const updateVisitType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, display_order, is_active, color, duration_minutes, default_price } = req.body;

    const visitType = await VisitType.findByPk(id);
    if (!visitType) {
      return res.status(404).json({
        success: false,
        error: 'Visit type not found'
      });
    }

    // Check for duplicate name if name is being changed
    if (name && name !== visitType.name) {
      const existing = await VisitType.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'A visit type with this name already exists'
        });
      }
    }

    await visitType.update({
      name: name !== undefined ? name : visitType.name,
      description: description !== undefined ? description : visitType.description,
      display_order: display_order !== undefined ? display_order : visitType.display_order,
      is_active: is_active !== undefined ? is_active : visitType.is_active,
      color: color !== undefined ? color : visitType.color,
      duration_minutes: duration_minutes !== undefined ? duration_minutes : visitType.duration_minutes,
      default_price: default_price !== undefined ? default_price : visitType.default_price
    });

    res.json({
      success: true,
      message: 'Visit type updated successfully',
      data: visitType
    });
  } catch (error) {
    console.error('[VisitTypeController] Error updating visit type:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update visit type'
    });
  }
};

/**
 * DELETE /api/visit-types/:id
 * Delete visit type
 */
const deleteVisitType = async (req, res) => {
  try {
    const { id } = req.params;

    const visitType = await VisitType.findByPk(id);
    if (!visitType) {
      return res.status(404).json({
        success: false,
        error: 'Visit type not found'
      });
    }

    await visitType.destroy();

    res.json({
      success: true,
      message: 'Visit type deleted successfully'
    });
  } catch (error) {
    console.error('[VisitTypeController] Error deleting visit type:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete visit type'
    });
  }
};

/**
 * PUT /api/visit-types/reorder
 * Reorder visit types
 */
const reorderVisitTypes = async (req, res) => {
  try {
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        error: 'Order must be an array of { id, display_order } objects'
      });
    }

    // Update all visit types in a transaction
    await db.sequelize.transaction(async (t) => {
      for (const item of order) {
        await VisitType.update(
          { display_order: item.display_order },
          { where: { id: item.id }, transaction: t }
        );
      }
    });

    // Fetch updated list
    const visitTypes = await VisitType.findAll({
      order: [['display_order', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      message: 'Visit types reordered successfully',
      data: visitTypes
    });
  } catch (error) {
    console.error('[VisitTypeController] Error reordering visit types:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to reorder visit types'
    });
  }
};

module.exports = {
  getAllVisitTypes,
  getVisitTypeById,
  createVisitType,
  updateVisitType,
  deleteVisitType,
  reorderVisitTypes
};
