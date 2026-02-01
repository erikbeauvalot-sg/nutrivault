/**
 * Task Service
 * Manages tasks for the practice
 */

const db = require('../../../models');
const { Op } = db.Sequelize;

/**
 * Get all tasks with optional filters
 */
const getTasks = async (filters = {}) => {
  const {
    status,
    priority,
    assigned_to,
    patient_id,
    due_before,
    due_after,
    include_completed = false
  } = filters;

  const where = { is_active: true };

  if (status) {
    where.status = status;
  } else if (!include_completed) {
    where.status = { [Op.in]: ['pending', 'in_progress'] };
  }

  if (priority) {
    where.priority = priority;
  }

  if (assigned_to) {
    where.assigned_to = assigned_to;
  }

  if (patient_id) {
    where.patient_id = patient_id;
  }

  if (due_before) {
    where.due_date = { ...where.due_date, [Op.lte]: due_before };
  }

  if (due_after) {
    where.due_date = { ...where.due_date, [Op.gte]: due_after };
  }

  const tasks = await db.Task.findAll({
    where,
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name']
      },
      {
        model: db.User,
        as: 'assignee',
        attributes: ['id', 'username', 'first_name', 'last_name']
      },
      {
        model: db.User,
        as: 'creator',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ],
    order: [
      ['priority', 'DESC'], // urgent first
      ['due_date', 'ASC'],
      ['created_at', 'DESC']
    ]
  });

  return tasks;
};

/**
 * Get a single task by ID
 */
const getTaskById = async (id) => {
  return db.Task.findOne({
    where: { id, is_active: true },
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name']
      },
      {
        model: db.User,
        as: 'assignee',
        attributes: ['id', 'username', 'first_name', 'last_name']
      },
      {
        model: db.User,
        as: 'creator',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ]
  });
};

/**
 * Create a new task
 */
const createTask = async (data, userId) => {
  const task = await db.Task.create({
    ...data,
    created_by: userId,
    assigned_to: data.assigned_to || userId // Default to creator if not assigned
  });

  return getTaskById(task.id);
};

/**
 * Update a task
 */
const updateTask = async (id, data) => {
  const task = await db.Task.findOne({
    where: { id, is_active: true }
  });

  if (!task) {
    throw new Error('Task not found');
  }

  await task.update(data);
  return getTaskById(task.id);
};

/**
 * Mark a task as completed
 */
const completeTask = async (id) => {
  const task = await db.Task.findOne({
    where: { id, is_active: true }
  });

  if (!task) {
    throw new Error('Task not found');
  }

  await task.update({
    status: 'completed',
    completed_at: new Date()
  });

  return getTaskById(task.id);
};

/**
 * Soft delete a task
 */
const deleteTask = async (id) => {
  const task = await db.Task.findOne({
    where: { id, is_active: true }
  });

  if (!task) {
    throw new Error('Task not found');
  }

  await task.update({ is_active: false });
  return true;
};

/**
 * Get task statistics
 */
const getTaskStats = async (userId = null) => {
  const where = { is_active: true };
  if (userId) {
    where.assigned_to = userId;
  }

  const pending = await db.Task.count({
    where: { ...where, status: 'pending' }
  });

  const inProgress = await db.Task.count({
    where: { ...where, status: 'in_progress' }
  });

  const completedToday = await db.Task.count({
    where: {
      ...where,
      status: 'completed',
      completed_at: {
        [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }
  });

  const overdue = await db.Task.count({
    where: {
      ...where,
      status: { [Op.in]: ['pending', 'in_progress'] },
      due_date: { [Op.lt]: new Date() }
    }
  });

  const urgent = await db.Task.count({
    where: {
      ...where,
      status: { [Op.in]: ['pending', 'in_progress'] },
      priority: 'urgent'
    }
  });

  return {
    pending,
    inProgress,
    completedToday,
    overdue,
    urgent,
    total: pending + inProgress
  };
};

/**
 * Get tasks due soon (within the next 3 days)
 */
const getTasksDueSoon = async (userId = null) => {
  const where = {
    is_active: true,
    status: { [Op.in]: ['pending', 'in_progress'] },
    due_date: {
      [Op.gte]: new Date(),
      [Op.lte]: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    }
  };

  if (userId) {
    where.assigned_to = userId;
  }

  return db.Task.findAll({
    where,
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name']
      }
    ],
    order: [['due_date', 'ASC']],
    limit: 10
  });
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getTaskStats,
  getTasksDueSoon
};
