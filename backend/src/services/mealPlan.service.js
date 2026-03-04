/**
 * Meal Plan Service
 * CRUD operations for personalized meal plans.
 */

const { Op } = require('sequelize');
const db = require('../../../models');
const { getScopedPatientIds } = require('../helpers/scopeHelper');

/**
 * Get all meal plans accessible by the user (with pagination & filters).
 */
async function getMealPlans(user, { page = 1, limit = 20, patient_id, status, search } = {}) {
  const where = { is_active: true };

  // RBAC scoping: dietitians only see their own patients
  const scopedPatientIds = await getScopedPatientIds(user);
  if (scopedPatientIds !== null) {
    where.patient_id = { [Op.in]: scopedPatientIds };
  }

  if (patient_id) {
    where.patient_id = patient_id;
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    where.title = { [Op.like]: `%${search}%` };
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await db.MealPlan.findAndCountAll({
    where,
    include: [
      { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { model: db.User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  return {
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
}

/**
 * Get a single meal plan by ID with all days, meals, and items.
 */
async function getMealPlanById(user, id) {
  const scopedPatientIds = await getScopedPatientIds(user);

  const where = { id, is_active: true };
  if (scopedPatientIds !== null) {
    where.patient_id = { [Op.in]: scopedPatientIds };
  }

  const mealPlan = await db.MealPlan.findOne({
    where,
    include: [
      { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { model: db.User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
      {
        model: db.MealPlanDay,
        as: 'days',
        separate: true,
        order: [['day_number', 'ASC']],
        include: [
          {
            model: db.MealPlanMeal,
            as: 'meals',
            separate: true,
            order: [['display_order', 'ASC']],
            include: [
              {
                model: db.MealPlanItem,
                as: 'items',
                separate: true,
                order: [['display_order', 'ASC']],
                include: [
                  { model: db.Recipe, as: 'recipe', attributes: ['id', 'title', 'slug', 'image_url'], required: false }
                ]
              }
            ]
          }
        ]
      }
    ]
  });

  if (!mealPlan) {
    const error = new Error('Meal plan not found');
    error.status = 404;
    throw error;
  }

  return mealPlan;
}

/**
 * Create a new meal plan (with optional initial days/meals structure).
 */
async function createMealPlan(user, data) {
  const {
    patient_id, title, description, status = 'draft',
    goals = [], dietary_restrictions = [],
    notes, duration_weeks, start_date, end_date,
    days = []
  } = data;

  // Verify patient is accessible
  const scopedPatientIds = await getScopedPatientIds(user);
  if (scopedPatientIds !== null && !scopedPatientIds.includes(patient_id)) {
    const error = new Error('Patient not found or not accessible');
    error.status = 404;
    throw error;
  }

  const patient = await db.Patient.findByPk(patient_id);
  if (!patient) {
    const error = new Error('Patient not found');
    error.status = 404;
    throw error;
  }

  const mealPlan = await db.MealPlan.create({
    patient_id,
    created_by: user.id,
    title,
    description,
    status,
    goals,
    dietary_restrictions,
    notes,
    duration_weeks,
    start_date,
    end_date,
    is_active: true
  });

  // Create initial days if provided
  if (days.length > 0) {
    await _upsertDays(mealPlan.id, days);
  }

  return getMealPlanById(user, mealPlan.id);
}

/**
 * Update a meal plan's metadata.
 */
async function updateMealPlan(user, id, data) {
  const mealPlan = await _findAccessible(user, id);

  const allowed = [
    'title', 'description', 'status', 'goals', 'dietary_restrictions',
    'notes', 'duration_weeks', 'start_date', 'end_date'
  ];
  const updates = {};
  for (const key of allowed) {
    if (data[key] !== undefined) {
      updates[key] = data[key];
    }
  }

  await mealPlan.update(updates);
  return getMealPlanById(user, id);
}

/**
 * Soft-delete a meal plan.
 */
async function deleteMealPlan(user, id) {
  const mealPlan = await _findAccessible(user, id);
  await mealPlan.update({ is_active: false });
}

/**
 * Replace the full day structure of a meal plan (upsert).
 * Accepts an array of day objects with nested meals and items.
 */
async function replaceDays(user, mealPlanId, days) {
  await _findAccessible(user, mealPlanId);

  // Delete existing days (cascades to meals and items)
  await db.MealPlanDay.destroy({ where: { meal_plan_id: mealPlanId } });

  if (days.length > 0) {
    await _upsertDays(mealPlanId, days);
  }

  return getMealPlanById(user, mealPlanId);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function _findAccessible(user, id) {
  const scopedPatientIds = await getScopedPatientIds(user);
  const where = { id, is_active: true };
  if (scopedPatientIds !== null) {
    where.patient_id = { [Op.in]: scopedPatientIds };
  }
  const mealPlan = await db.MealPlan.findOne({ where });
  if (!mealPlan) {
    const error = new Error('Meal plan not found');
    error.status = 404;
    throw error;
  }
  return mealPlan;
}

async function _upsertDays(mealPlanId, days) {
  for (const dayData of days) {
    const day = await db.MealPlanDay.create({
      meal_plan_id: mealPlanId,
      day_number: dayData.day_number,
      label: dayData.label || null,
      notes: dayData.notes || null
    });

    const meals = dayData.meals || [];
    for (let mealIdx = 0; mealIdx < meals.length; mealIdx++) {
      const mealData = meals[mealIdx];
      const meal = await db.MealPlanMeal.create({
        meal_plan_day_id: day.id,
        meal_type: mealData.meal_type || 'other',
        label: mealData.label || null,
        notes: mealData.notes || null,
        display_order: mealIdx
      });

      const items = mealData.items || [];
      for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const itemData = items[itemIdx];
        await db.MealPlanItem.create({
          meal_plan_meal_id: meal.id,
          recipe_id: itemData.recipe_id || null,
          name: itemData.name,
          quantity: itemData.quantity || null,
          unit: itemData.unit || null,
          notes: itemData.notes || null,
          display_order: itemIdx
        });
      }
    }
  }
}

module.exports = {
  getMealPlans,
  getMealPlanById,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  replaceDays
};
