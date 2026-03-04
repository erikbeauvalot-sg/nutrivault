/**
 * Meal Plan Controller
 */

const mealPlanService = require('../services/mealPlan.service');

/**
 * GET /api/meal-plans
 */
async function getAllMealPlans(req, res) {
  try {
    const { page = 1, limit = 20, patient_id, status, search } = req.query;
    const result = await mealPlanService.getMealPlans(req.user, {
      page: parseInt(page),
      limit: parseInt(limit),
      patient_id,
      status,
      search
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/meal-plans/:id
 */
async function getMealPlanById(req, res) {
  try {
    const mealPlan = await mealPlanService.getMealPlanById(req.user, req.params.id);
    res.json({ success: true, data: mealPlan });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/meal-plans
 */
async function createMealPlan(req, res) {
  try {
    const mealPlan = await mealPlanService.createMealPlan(req.user, req.body);
    res.status(201).json({ success: true, data: mealPlan });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/meal-plans/:id
 */
async function updateMealPlan(req, res) {
  try {
    const mealPlan = await mealPlanService.updateMealPlan(req.user, req.params.id, req.body);
    res.json({ success: true, data: mealPlan });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/meal-plans/:id
 */
async function deleteMealPlan(req, res) {
  try {
    await mealPlanService.deleteMealPlan(req.user, req.params.id);
    res.json({ success: true, message: 'Meal plan deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/meal-plans/:id/days
 * Replace the full days/meals/items structure.
 */
async function replaceDays(req, res) {
  try {
    const mealPlan = await mealPlanService.replaceDays(req.user, req.params.id, req.body.days || []);
    res.json({ success: true, data: mealPlan });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getAllMealPlans,
  getMealPlanById,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  replaceDays
};
