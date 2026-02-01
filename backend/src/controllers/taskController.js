/**
 * Task Controller
 * Handles task-related API endpoints
 */

const taskService = require('../services/task.service');

/**
 * Get all tasks
 * GET /api/tasks
 */
const getTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      patient_id,
      due_before,
      due_after,
      include_completed
    } = req.query;

    const filters = {
      status,
      priority,
      patient_id,
      due_before,
      due_after,
      include_completed: include_completed === 'true',
      assigned_to: req.user.id // Only show tasks assigned to current user
    };

    const tasks = await taskService.getTasks(filters);

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }
};

/**
 * Get a single task
 * GET /api/tasks/:id
 */
const getTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await taskService.getTaskById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
};

/**
 * Create a new task
 * POST /api/tasks
 */
const createTask = async (req, res) => {
  try {
    const { title, description, due_date, priority, patient_id, assigned_to } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    const task = await taskService.createTask(
      {
        title: title.trim(),
        description,
        due_date,
        priority: priority || 'normal',
        patient_id,
        assigned_to
      },
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
};

/**
 * Update a task
 * PUT /api/tasks/:id
 */
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, priority, status, patient_id, assigned_to } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (patient_id !== undefined) updateData.patient_id = patient_id;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    const task = await taskService.updateTask(id, updateData);

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    if (error.message === 'Task not found') {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }
};

/**
 * Complete a task
 * PUT /api/tasks/:id/complete
 */
const completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await taskService.completeTask(id);

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error completing task:', error);
    if (error.message === 'Task not found') {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to complete task'
    });
  }
};

/**
 * Delete a task
 * DELETE /api/tasks/:id
 */
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    await taskService.deleteTask(id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    if (error.message === 'Task not found') {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
};

/**
 * Get task statistics
 * GET /api/tasks/stats
 */
const getTaskStats = async (req, res) => {
  try {
    const stats = await taskService.getTaskStats(req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task statistics'
    });
  }
};

/**
 * Get tasks due soon
 * GET /api/tasks/due-soon
 */
const getTasksDueSoon = async (req, res) => {
  try {
    const tasks = await taskService.getTasksDueSoon(req.user.id);

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks due soon:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks due soon'
    });
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getTaskStats,
  getTasksDueSoon
};
