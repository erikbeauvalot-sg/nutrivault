/**
 * Task Service
 * Manages tasks for the practice
 */

const db = require('../../../models');
const { Op } = db.Sequelize;
const { getScopedPatientIds, getScopedDietitianIds } = require('../helpers/scopeHelper');

/**
 * Get all tasks with optional filters, scoped by user role
 */
const getTasks = async (user, filters = {}) => {
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

  // RBAC: Scope tasks by user role
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds !== null) {
    if (dietitianIds.length === 0) return [];
    const patientIds = await getScopedPatientIds(user);
    // Tasks assigned to the user, created by the user, or linked to their patients
    const scopeConditions = [
      { assigned_to: { [Op.in]: dietitianIds } },
      { created_by: { [Op.in]: dietitianIds } }
    ];
    if (patientIds && patientIds.length > 0) {
      scopeConditions.push({ patient_id: { [Op.in]: patientIds } });
    }
    where[Op.and] = where[Op.and] || [];
    where[Op.and].push({ [Op.or]: scopeConditions });
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
const getTaskById = async (id, user) => {
  const task = await db.Task.findOne({
    where: { id, is_active: true },
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'assigned_dietitian_id']
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

  if (!task) return null;

  // RBAC: Check access
  if (user) {
    const dietitianIds = await getScopedDietitianIds(user);
    if (dietitianIds !== null) {
      const isAssigned = dietitianIds.includes(task.assigned_to);
      const isCreator = dietitianIds.includes(task.created_by);
      let isPatientLinked = false;
      if (task.patient) {
        const link = await db.PatientDietitian.findOne({
          where: { patient_id: task.patient.id, dietitian_id: { [db.Sequelize.Op.in]: dietitianIds } }
        });
        isPatientLinked = !!link;
      }
      if (!isAssigned && !isCreator && !isPatientLinked) {
        return null;
      }
    }
  }

  return task;
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
const updateTask = async (id, data, user) => {
  const task = await getTaskById(id, user);

  if (!task) {
    throw new Error('Task not found');
  }

  await task.update(data);
  return getTaskById(task.id, user);
};

/**
 * Mark a task as completed
 */
const completeTask = async (id, user) => {
  const task = await getTaskById(id, user);

  if (!task) {
    throw new Error('Task not found');
  }

  await task.update({
    status: 'completed',
    completed_at: new Date()
  });

  return getTaskById(task.id, user);
};

/**
 * Soft delete a task
 */
const deleteTask = async (id, user) => {
  const task = await getTaskById(id, user);

  if (!task) {
    throw new Error('Task not found');
  }

  await task.update({ is_active: false });
  return true;
};

/**
 * Get task statistics, scoped by user
 */
const getTaskStats = async (user) => {
  const where = { is_active: true };

  // RBAC: Scope by user
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds !== null) {
    if (dietitianIds.length === 0) {
      return { pending: 0, inProgress: 0, completedToday: 0, overdue: 0, urgent: 0, total: 0 };
    }
    const patientIds = await getScopedPatientIds(user);
    const scopeConditions = [
      { assigned_to: { [Op.in]: dietitianIds } },
      { created_by: { [Op.in]: dietitianIds } }
    ];
    if (patientIds && patientIds.length > 0) {
      scopeConditions.push({ patient_id: { [Op.in]: patientIds } });
    }
    where[Op.or] = scopeConditions;
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
 * Get tasks due soon (within the next 3 days), scoped by user
 */
const getTasksDueSoon = async (user) => {
  const where = {
    is_active: true,
    status: { [Op.in]: ['pending', 'in_progress'] },
    due_date: {
      [Op.gte]: new Date(),
      [Op.lte]: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    }
  };

  // RBAC: Scope by user
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds !== null) {
    if (dietitianIds.length === 0) return [];
    const patientIds = await getScopedPatientIds(user);
    const scopeConditions = [
      { assigned_to: { [Op.in]: dietitianIds } },
      { created_by: { [Op.in]: dietitianIds } }
    ];
    if (patientIds && patientIds.length > 0) {
      scopeConditions.push({ patient_id: { [Op.in]: patientIds } });
    }
    where[Op.and] = [{ [Op.or]: scopeConditions }];
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
