/**
 * Meal Plans Integration Tests
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { createTestApp } = require('../setup/testServer');

let app;
let db;
let adminAuth;
let dietitianAuth;
let patient;

beforeAll(async () => {
  db = await testDb.init();
  app = createTestApp();
});

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  await testDb.reset();
  await testDb.seedBaseData();

  adminAuth = await testAuth.createAdmin();
  dietitianAuth = await testAuth.createDietitian();

  // Create a patient linked to the dietitian
  patient = await db.Patient.create({
    first_name: 'Jane',
    last_name: 'Patient',
    email: `patient_${Date.now()}@test.com`,
    birth_date: '1990-01-01'
  });

  // Link patient to dietitian
  await db.PatientDietitian.create({
    patient_id: patient.id,
    dietitian_id: dietitianAuth.user.id
  });
});

// ─── GET /api/meal-plans ──────────────────────────────────────────────────────

describe('GET /api/meal-plans', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/meal-plans');
    expect(res.status).toBe(401);
  });

  it('admin gets empty list', async () => {
    const res = await request(app)
      .get('/api/meal-plans')
      .set('Authorization', adminAuth.authHeader);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('dietitian sees only their patients meal plans', async () => {
    // Create plan for dietitian's patient
    await db.MealPlan.create({
      patient_id: patient.id,
      created_by: dietitianAuth.user.id,
      title: 'Plan A',
      status: 'draft',
      is_active: true
    });

    // Create another patient NOT linked to this dietitian
    const otherPatient = await db.Patient.create({
      first_name: 'Other',
      last_name: 'Patient',
      email: `other_${Date.now()}@test.com`,
      birth_date: '1985-05-15'
    });
    const otherAdmin = await testAuth.createAdmin();
    await db.MealPlan.create({
      patient_id: otherPatient.id,
      created_by: otherAdmin.user.id,
      title: 'Plan B (other)',
      status: 'draft',
      is_active: true
    });

    const res = await request(app)
      .get('/api/meal-plans')
      .set('Authorization', dietitianAuth.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Plan A');
  });

  it('filters by status', async () => {
    await db.MealPlan.create({
      patient_id: patient.id,
      created_by: adminAuth.user.id,
      title: 'Draft plan',
      status: 'draft',
      is_active: true
    });
    await db.MealPlan.create({
      patient_id: patient.id,
      created_by: adminAuth.user.id,
      title: 'Active plan',
      status: 'active',
      is_active: true
    });

    const res = await request(app)
      .get('/api/meal-plans?status=active')
      .set('Authorization', adminAuth.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Active plan');
  });

  it('searches by title', async () => {
    await db.MealPlan.create({
      patient_id: patient.id,
      created_by: adminAuth.user.id,
      title: 'Mediterranean diet plan',
      status: 'draft',
      is_active: true
    });
    await db.MealPlan.create({
      patient_id: patient.id,
      created_by: adminAuth.user.id,
      title: 'Low carb plan',
      status: 'draft',
      is_active: true
    });

    const res = await request(app)
      .get('/api/meal-plans?search=Mediterranean')
      .set('Authorization', adminAuth.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Mediterranean diet plan');
  });
});

// ─── POST /api/meal-plans ─────────────────────────────────────────────────────

describe('POST /api/meal-plans', () => {
  it('creates a meal plan', async () => {
    const payload = {
      patient_id: patient.id,
      title: 'Nouveau plan',
      description: 'Plan for weight loss',
      status: 'draft',
      goals: ['weight_loss', 'balanced_diet'],
      dietary_restrictions: ['gluten_free'],
      duration_weeks: 4
    };

    const res = await request(app)
      .post('/api/meal-plans')
      .set('Authorization', adminAuth.authHeader)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Nouveau plan');
    expect(res.body.data.goals).toEqual(['weight_loss', 'balanced_diet']);
    expect(res.body.data.dietary_restrictions).toEqual(['gluten_free']);
    expect(res.body.data.duration_weeks).toBe(4);
    expect(res.body.data.patient.id).toBe(patient.id);
  });

  it('creates a meal plan with days structure', async () => {
    const payload = {
      patient_id: patient.id,
      title: 'Plan avec jours',
      days: [
        {
          day_number: 1,
          label: 'Jour 1',
          meals: [
            {
              meal_type: 'breakfast',
              label: 'Petit-déjeuner',
              items: [
                { name: 'Avoine', quantity: '80', unit: 'g' },
                { name: 'Banane', quantity: '1', unit: 'pièce' }
              ]
            },
            {
              meal_type: 'lunch',
              items: [
                { name: 'Salade niçoise', quantity: '1', unit: 'portion' }
              ]
            }
          ]
        },
        {
          day_number: 2,
          meals: [
            {
              meal_type: 'breakfast',
              items: [{ name: 'Yaourt nature', quantity: '150', unit: 'g' }]
            }
          ]
        }
      ]
    };

    const res = await request(app)
      .post('/api/meal-plans')
      .set('Authorization', adminAuth.authHeader)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.days).toHaveLength(2);
    expect(res.body.data.days[0].meals).toHaveLength(2);
    expect(res.body.data.days[0].meals[0].items).toHaveLength(2);
    expect(res.body.data.days[0].meals[0].items[0].name).toBe('Avoine');
  });

  it('returns 400 without patient_id', async () => {
    const res = await request(app)
      .post('/api/meal-plans')
      .set('Authorization', adminAuth.authHeader)
      .send({ title: 'No patient' });
    expect(res.status).toBe(400);
  });

  it('returns 400 without title', async () => {
    const res = await request(app)
      .post('/api/meal-plans')
      .set('Authorization', adminAuth.authHeader)
      .send({ patient_id: patient.id });
    expect(res.status).toBe(400);
  });

  it('returns 404 for inaccessible patient (dietitian)', async () => {
    const otherPatient = await db.Patient.create({
      first_name: 'Unlinked',
      last_name: 'Patient',
      email: `unlinked_${Date.now()}@test.com`,
      birth_date: '1980-01-01'
    });

    const res = await request(app)
      .post('/api/meal-plans')
      .set('Authorization', dietitianAuth.authHeader)
      .send({ patient_id: otherPatient.id, title: 'Forbidden plan' });

    expect(res.status).toBe(404);
  });
});

// ─── GET /api/meal-plans/:id ─────────────────────────────────────────────────

describe('GET /api/meal-plans/:id', () => {
  let mealPlan;

  beforeEach(async () => {
    mealPlan = await db.MealPlan.create({
      patient_id: patient.id,
      created_by: adminAuth.user.id,
      title: 'Test plan',
      status: 'draft',
      is_active: true,
      goals: ['balance']
    });
  });

  it('returns a meal plan by ID', async () => {
    const res = await request(app)
      .get(`/api/meal-plans/${mealPlan.id}`)
      .set('Authorization', adminAuth.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(mealPlan.id);
    expect(res.body.data.title).toBe('Test plan');
    expect(Array.isArray(res.body.data.days)).toBe(true);
  });

  it('returns 404 for non-existent plan', async () => {
    const res = await request(app)
      .get('/api/meal-plans/00000000-0000-0000-0000-000000000000')
      .set('Authorization', adminAuth.authHeader);
    expect(res.status).toBe(404);
  });

  it('returns 404 if dietitian does not own the patient', async () => {
    const otherPatient = await db.Patient.create({
      first_name: 'Unlinked',
      last_name: 'Patient',
      email: `unlinked2_${Date.now()}@test.com`,
      birth_date: '1980-01-01'
    });
    const otherPlan = await db.MealPlan.create({
      patient_id: otherPatient.id,
      created_by: adminAuth.user.id,
      title: 'Forbidden',
      status: 'draft',
      is_active: true
    });

    const res = await request(app)
      .get(`/api/meal-plans/${otherPlan.id}`)
      .set('Authorization', dietitianAuth.authHeader);
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/meal-plans/:id ─────────────────────────────────────────────────

describe('PUT /api/meal-plans/:id', () => {
  let mealPlan;

  beforeEach(async () => {
    mealPlan = await db.MealPlan.create({
      patient_id: patient.id,
      created_by: adminAuth.user.id,
      title: 'Original title',
      status: 'draft',
      is_active: true
    });
  });

  it('updates a meal plan', async () => {
    const res = await request(app)
      .put(`/api/meal-plans/${mealPlan.id}`)
      .set('Authorization', adminAuth.authHeader)
      .send({ title: 'Updated title', status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated title');
    expect(res.body.data.status).toBe('active');
  });

  it('returns 404 for non-existent plan', async () => {
    const res = await request(app)
      .put('/api/meal-plans/00000000-0000-0000-0000-000000000000')
      .set('Authorization', adminAuth.authHeader)
      .send({ title: 'Does not exist' });
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/meal-plans/:id/days ────────────────────────────────────────────

describe('PUT /api/meal-plans/:id/days', () => {
  let mealPlan;

  beforeEach(async () => {
    mealPlan = await db.MealPlan.create({
      patient_id: patient.id,
      created_by: adminAuth.user.id,
      title: 'Plan with days',
      status: 'draft',
      is_active: true
    });
  });

  it('replaces all days', async () => {
    const days = [
      {
        day_number: 1,
        label: 'Lundi',
        meals: [
          {
            meal_type: 'breakfast',
            items: [
              { name: 'Pain complet', quantity: '2', unit: 'tranches' }
            ]
          }
        ]
      },
      {
        day_number: 2,
        label: 'Mardi',
        meals: []
      }
    ];

    const res = await request(app)
      .put(`/api/meal-plans/${mealPlan.id}/days`)
      .set('Authorization', adminAuth.authHeader)
      .send({ days });

    expect(res.status).toBe(200);
    expect(res.body.data.days).toHaveLength(2);
    expect(res.body.data.days[0].label).toBe('Lundi');
    expect(res.body.data.days[0].meals[0].items[0].name).toBe('Pain complet');
  });

  it('clears all days when sending empty array', async () => {
    // Add a day first
    const day = await db.MealPlanDay.create({
      meal_plan_id: mealPlan.id,
      day_number: 1,
      label: 'Old day'
    });
    await db.MealPlanMeal.create({
      meal_plan_day_id: day.id,
      meal_type: 'breakfast',
      display_order: 0
    });

    const res = await request(app)
      .put(`/api/meal-plans/${mealPlan.id}/days`)
      .set('Authorization', adminAuth.authHeader)
      .send({ days: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.days).toHaveLength(0);
  });
});

// ─── DELETE /api/meal-plans/:id ───────────────────────────────────────────────

describe('DELETE /api/meal-plans/:id', () => {
  it('soft-deletes a meal plan', async () => {
    const mealPlan = await db.MealPlan.create({
      patient_id: patient.id,
      created_by: adminAuth.user.id,
      title: 'To delete',
      status: 'draft',
      is_active: true
    });

    const res = await request(app)
      .delete(`/api/meal-plans/${mealPlan.id}`)
      .set('Authorization', adminAuth.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it's no longer visible
    const getRes = await request(app)
      .get(`/api/meal-plans/${mealPlan.id}`)
      .set('Authorization', adminAuth.authHeader);
    expect(getRes.status).toBe(404);

    // Verify the record still exists in DB (soft delete)
    const raw = await db.MealPlan.findByPk(mealPlan.id);
    expect(raw).not.toBeNull();
    expect(raw.is_active).toBe(false);
  });

  it('returns 404 for non-existent plan', async () => {
    const res = await request(app)
      .delete('/api/meal-plans/00000000-0000-0000-0000-000000000000')
      .set('Authorization', adminAuth.authHeader);
    expect(res.status).toBe(404);
  });
});
