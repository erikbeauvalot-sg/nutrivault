/**
 * Patient Custom Field Service Tests
 * Tests for patientCustomField.service.js business logic
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { patients: patientFixtures } = require('../fixtures');

let db;
let patientCustomFieldService;

describe('Patient Custom Field Service', () => {
  let adminAuth, dietitianAuth;
  let testPatient;
  let testCategory, testDefinition;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    patientCustomFieldService = require('../../src/services/patientCustomField.service');
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();
    patientCustomFieldService.clearCalculatedFieldsCache();

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();

    // Create test patient with M2M link
    testPatient = await db.Patient.create({
      ...patientFixtures.validPatient,
      assigned_dietitian_id: dietitianAuth.user.id
    });
    await db.PatientDietitian.create({
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id
    });

    // Create test category (patient-level)
    testCategory = await db.CustomFieldCategory.create({
      name: 'Medical Info',
      description: 'Medical information',
      entity_types: ['patient'],
      display_order: 1,
      is_active: true
    });

    // Create test field definition
    testDefinition = await db.CustomFieldDefinition.create({
      category_id: testCategory.id,
      field_name: 'blood_type',
      field_label: 'Blood Type',
      field_type: 'text',
      is_required: false,
      is_active: true,
      display_order: 1
    });
  });

  // ========================================
  // getPatientCustomFields
  // ========================================
  describe('getPatientCustomFields', () => {
    it('should return categories with field definitions', async () => {
      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);

      const category = result.find(c => c.id === testCategory.id);
      expect(category).toBeDefined();
      expect(category.name).toBe('Medical Info');
      expect(category.fields.length).toBeGreaterThanOrEqual(1);
    });

    it('should include field values when they exist', async () => {
      // Set a value first
      const fieldValue = await db.PatientCustomFieldValue.create({
        patient_id: testPatient.id,
        field_definition_id: testDefinition.id,
        value_text: 'AB+',
        updated_by: adminAuth.user.id
      });

      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      const category = result.find(c => c.id === testCategory.id);
      const field = category.fields.find(f => f.definition_id === testDefinition.id);
      expect(field.value).toBe('AB+');
      expect(field.value_id).toBe(fieldValue.id);
    });

    it('should return null for fields without values', async () => {
      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      const category = result.find(c => c.id === testCategory.id);
      const field = category.fields.find(f => f.definition_id === testDefinition.id);
      expect(field.value).toBeNull();
      expect(field.value_id).toBeNull();
    });

    it('should deny access for unauthorized user', async () => {
      // Create unrelated dietitian with no patient access
      const otherDietitian = await testAuth.createDietitian();

      await expect(
        patientCustomFieldService.getPatientCustomFields(
          otherDietitian.user, testPatient.id
        )
      ).rejects.toThrow('Access denied');
    });

    it('should not include inactive categories', async () => {
      const inactiveCategory = await db.CustomFieldCategory.create({
        name: 'Inactive Cat',
        description: 'Inactive',
        entity_types: ['patient'],
        display_order: 99,
        is_active: false
      });

      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      expect(result.some(c => c.id === inactiveCategory.id)).toBe(false);
    });

    it('should not include inactive field definitions', async () => {
      const inactiveDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'inactive_field',
        field_label: 'Inactive Field',
        field_type: 'text',
        is_active: false,
        display_order: 99
      });

      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      const category = result.find(c => c.id === testCategory.id);
      expect(category.fields.some(f => f.definition_id === inactiveDef.id)).toBe(false);
    });

    it('should include category metadata', async () => {
      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      const category = result.find(c => c.id === testCategory.id);
      expect(category).toHaveProperty('color');
      expect(category).toHaveProperty('display_layout');
      expect(category).toHaveProperty('entity_types');
    });

    it('should auto-calculate fields with missing values on page load', async () => {
      const heightDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'height',
        field_label: 'Height (cm)',
        field_type: 'number',
        is_active: true,
        display_order: 10
      });
      const weightDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'weight',
        field_label: 'Weight (kg)',
        field_type: 'number',
        is_active: true,
        display_order: 11
      });

      const calcDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'total',
        field_label: 'Total',
        field_type: 'calculated',
        is_calculated: true,
        is_active: true,
        formula: '{height} + {weight}',
        dependencies: ['height', 'weight'],
        display_order: 12
      });

      await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, heightDef.id, 170
      );
      await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, weightDef.id, 70
      );

      patientCustomFieldService.clearCalculatedFieldsCache();
      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      const category = result.find(c => c.id === testCategory.id);
      const field = category.fields.find(f => f.definition_id === calcDef.id);
      expect(field.value).toBe(240);
    });

    it('should include visit-only category values from latest visit', async () => {
      const visitOnlyCategory = await db.CustomFieldCategory.create({
        name: 'Visit Only Data',
        entity_types: ['visit'],
        display_order: 10,
        is_active: true
      });

      const visitOnlyDef = await db.CustomFieldDefinition.create({
        category_id: visitOnlyCategory.id,
        field_name: 'visit_only_field',
        field_label: 'Visit Only Field',
        field_type: 'number',
        is_active: true,
        display_order: 1
      });

      const visit = await db.Visit.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: '2024-06-01',
        visit_type: 'followup',
        status: 'COMPLETED'
      });

      await db.VisitCustomFieldValue.create({
        visit_id: visit.id,
        field_definition_id: visitOnlyDef.id,
        value_number: 42,
        updated_by: adminAuth.user.id
      });

      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      const cat = result.find(c => c.id === visitOnlyCategory.id);
      expect(cat).toBeDefined();
      const field = cat.fields.find(f => f.definition_id === visitOnlyDef.id);
      expect(field.value).toBe(42);
    });

    it('should pass English translation language', async () => {
      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id, 'en'
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should auto-calc formula with measure references on page load', async () => {
      const measureDef = await db.MeasureDefinition.create({
        name: 'body_weight',
        display_name: 'Body Weight',
        measure_type: 'numeric',
        unit: 'kg',
        category: 'anthropometric',
        is_active: true
      });

      await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 75,
        measured_at: new Date(),
        recorded_by: adminAuth.user.id
      });

      const calcDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'weight_doubled',
        field_label: 'Weight Doubled',
        field_type: 'calculated',
        is_calculated: true,
        formula: '{measure:body_weight} * 2',
        dependencies: ['measure:body_weight'],
        is_active: true,
        display_order: 20
      });

      patientCustomFieldService.clearCalculatedFieldsCache();
      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      const category = result.find(c => c.id === testCategory.id);
      const field = category.fields.find(f => f.definition_id === calcDef.id);
      expect(field.value).toBe(150);
    });

    it('should handle text and boolean measure values and duplicate measures', async () => {
      // Create text measure definition
      const textMeasureDef = await db.MeasureDefinition.create({
        name: 'text_score',
        display_name: 'Text Score',
        measure_type: 'text',
        unit: '',
        category: 'other',
        is_active: true
      });

      // Create boolean measure definition
      const boolMeasureDef = await db.MeasureDefinition.create({
        name: 'is_active_flag',
        display_name: 'Active Flag',
        measure_type: 'boolean',
        unit: '',
        category: 'other',
        is_active: true
      });

      // Create numeric measure with duplicate records (line 55)
      const numMeasureDef = await db.MeasureDefinition.create({
        name: 'dup_measure',
        display_name: 'Dup Measure',
        measure_type: 'numeric',
        unit: 'kg',
        category: 'anthropometric',
        is_active: true
      });

      // Two measures for same definition (older first) — covers line 55 (skip duplicate)
      await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: numMeasureDef.id,
        numeric_value: 50,
        measured_at: new Date('2024-01-01'),
        recorded_by: adminAuth.user.id
      });
      await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: numMeasureDef.id,
        numeric_value: 60,
        measured_at: new Date('2024-06-01'),
        recorded_by: adminAuth.user.id
      });

      // Text measure with parseable number (line 66-69)
      await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: textMeasureDef.id,
        text_value: '42.5',
        measured_at: new Date(),
        recorded_by: adminAuth.user.id
      });

      // Boolean measure (line 70-71)
      await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: boolMeasureDef.id,
        boolean_value: true,
        measured_at: new Date(),
        recorded_by: adminAuth.user.id
      });

      // Create calculated field referencing measures
      const calcDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'multi_measure_calc',
        field_label: 'Multi Measure',
        field_type: 'calculated',
        is_calculated: true,
        formula: '{measure:dup_measure} + {measure:text_score} + {measure:is_active_flag}',
        dependencies: ['measure:dup_measure', 'measure:text_score', 'measure:is_active_flag'],
        is_active: true,
        display_order: 25
      });

      patientCustomFieldService.clearCalculatedFieldsCache();
      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      const category = result.find(c => c.id === testCategory.id);
      const field = category.fields.find(f => f.definition_id === calcDef.id);
      // 60 (latest dup_measure) + 42.5 (text_score) + 1 (boolean true) = 103.5
      expect(field.value).toBe(103.5);
    });

    it('should recalculate volatile today() formula on page load', async () => {
      const todayDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'current_day',
        field_label: 'Current Day',
        field_type: 'calculated',
        is_calculated: true,
        formula: 'today()',
        dependencies: [],
        is_active: true,
        display_order: 20
      });

      // First call creates the value
      patientCustomFieldService.clearCalculatedFieldsCache();
      await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      // Second call should recalculate volatile function
      patientCustomFieldService.clearCalculatedFieldsCache();
      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      const category = result.find(c => c.id === testCategory.id);
      const field = category.fields.find(f => f.definition_id === todayDef.id);
      expect(field.value).not.toBeNull();
    });

    it('should skip auto-calc when dependencies are missing', async () => {
      await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'missing_dep_calc',
        field_label: 'Missing Dep',
        field_type: 'calculated',
        is_calculated: true,
        formula: '{nonexistent_field} + 1',
        dependencies: ['nonexistent_field'],
        is_active: true,
        display_order: 20
      });

      patientCustomFieldService.clearCalculatedFieldsCache();
      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      const category = result.find(c => c.id === testCategory.id);
      const field = category.fields.find(f => f.field_name === 'missing_dep_calc');
      expect(field.value).toBeNull();
    });

    it('should handle non-parseable validation_rules gracefully', async () => {
      await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'invalid_rules',
        field_label: 'Invalid Rules',
        field_type: 'text',
        is_active: true,
        display_order: 20,
        validation_rules: 'not valid json'
      });

      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );

      const category = result.find(c => c.id === testCategory.id);
      const field = category.fields.find(f => f.field_name === 'invalid_rules');
      expect(field).toBeDefined();
      expect(field.validation_rules).toBe('not valid json');
    });

  });

  // ========================================
  // setPatientCustomField
  // ========================================
  describe('setPatientCustomField', () => {
    it('should create a new field value', async () => {
      const result = await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, testDefinition.id, 'O+'
      );

      expect(result).toBeDefined();
      expect(result.value_text).toBe('O+');
    });

    it('should update an existing field value', async () => {
      // Create initial value
      await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, testDefinition.id, 'O+'
      );

      // Update it
      const result = await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, testDefinition.id, 'AB-'
      );

      expect(result.value_text).toBe('AB-');

      // Should be only one value record
      const count = await db.PatientCustomFieldValue.count({
        where: {
          patient_id: testPatient.id,
          field_definition_id: testDefinition.id
        }
      });
      expect(count).toBe(1);
    });

    it('should deny access for unauthorized user', async () => {
      const otherDietitian = await testAuth.createDietitian();

      await expect(
        patientCustomFieldService.setPatientCustomField(
          otherDietitian.user, testPatient.id, testDefinition.id, 'AB+'
        )
      ).rejects.toThrow('Access denied');
    });

    it('should reject inactive field definition', async () => {
      await testDefinition.update({ is_active: false });

      await expect(
        patientCustomFieldService.setPatientCustomField(
          adminAuth.user, testPatient.id, testDefinition.id, 'AB+'
        )
      ).rejects.toThrow('Field definition not found or inactive');
    });

    it('should reject non-existent field definition', async () => {
      await expect(
        patientCustomFieldService.setPatientCustomField(
          adminAuth.user, testPatient.id, '00000000-0000-0000-0000-000000000000', 'AB+'
        )
      ).rejects.toThrow('Field definition not found or inactive');
    });

    it('should handle number field type', async () => {
      const numberDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'water_intake',
        field_label: 'Water Intake (L)',
        field_type: 'number',
        is_active: true,
        display_order: 2
      });

      const result = await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, numberDef.id, 2.5
      );

      expect(result).toBeDefined();
      expect(parseFloat(result.value_number)).toBe(2.5);
    });

    it('should handle boolean field type', async () => {
      const boolDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'is_smoker',
        field_label: 'Smoker',
        field_type: 'boolean',
        is_active: true,
        display_order: 3
      });

      const result = await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, boolDef.id, true
      );

      expect(result).toBeDefined();
      expect(result.value_boolean).toBe(true);
    });

    it('should reject value that fails field validation', async () => {
      const requiredDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'required_field',
        field_label: 'Required Field',
        field_type: 'text',
        is_required: true,
        is_active: true,
        display_order: 4
      });

      await expect(
        patientCustomFieldService.setPatientCustomField(
          adminAuth.user, testPatient.id, requiredDef.id, ''
        )
      ).rejects.toThrow();
    });

    it('should recalculate dependent fields with measure references', async () => {
      const measureDef = await db.MeasureDefinition.create({
        name: 'patient_height',
        display_name: 'Patient Height',
        measure_type: 'numeric',
        unit: 'cm',
        category: 'anthropometric',
        is_active: true
      });

      await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 170,
        measured_at: new Date(),
        recorded_by: adminAuth.user.id
      });

      const inputDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'multiplier',
        field_label: 'Multiplier',
        field_type: 'number',
        is_active: true,
        display_order: 10
      });

      const calcDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'height_times_mult',
        field_label: 'Height x Multiplier',
        field_type: 'calculated',
        is_calculated: true,
        formula: '{measure:patient_height} * {multiplier}',
        dependencies: ['measure:patient_height', 'multiplier'],
        is_active: true,
        display_order: 11
      });

      patientCustomFieldService.clearCalculatedFieldsCache();

      // Setting multiplier should trigger recalculation with measure ref
      await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, inputDef.id, 2
      );

      const calcValue = await db.PatientCustomFieldValue.findOne({
        where: { patient_id: testPatient.id, field_definition_id: calcDef.id }
      });
      expect(calcValue).not.toBeNull();
      expect(parseFloat(calcValue.value_number)).toBe(340); // 170 * 2
    });

    it('should handle circular dependency in calculated fields', async () => {
      const triggerDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'trigger_field',
        field_label: 'Trigger',
        field_type: 'number',
        is_active: true,
        display_order: 9
      });

      // Both circular fields also depend on trigger_field so they enter the recalc path
      await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'circ_a',
        field_label: 'Circular A',
        field_type: 'calculated',
        is_calculated: true,
        formula: '{trigger_field} + {circ_b}',
        dependencies: ['trigger_field', 'circ_b'],
        is_active: true,
        display_order: 10
      });

      await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'circ_b',
        field_label: 'Circular B',
        field_type: 'calculated',
        is_calculated: true,
        formula: '{trigger_field} + {circ_a}',
        dependencies: ['trigger_field', 'circ_a'],
        is_active: true,
        display_order: 11
      });

      patientCustomFieldService.clearCalculatedFieldsCache();

      // Should not crash despite circular dependency — triggers topological sort
      await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, triggerDef.id, 5
      );

      patientCustomFieldService.clearCalculatedFieldsCache();
      const result = await patientCustomFieldService.getPatientCustomFields(
        adminAuth.user, testPatient.id
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('should recalculate dependent calculated fields via topological sort', async () => {
      const baseDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'base_val',
        field_label: 'Base Value',
        field_type: 'number',
        is_active: true,
        display_order: 10
      });

      const calcLevel1 = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'calc_level_1',
        field_label: 'Level 1',
        field_type: 'calculated',
        is_calculated: true,
        formula: '{base_val} * 2',
        dependencies: ['base_val'],
        is_active: true,
        display_order: 11
      });

      patientCustomFieldService.clearCalculatedFieldsCache();

      await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, baseDef.id, 5
      );

      // Level 1 should be calculated: 5*2 = 10
      const val1 = await db.PatientCustomFieldValue.findOne({
        where: { patient_id: testPatient.id, field_definition_id: calcLevel1.id }
      });
      expect(val1).not.toBeNull();
      expect(parseFloat(val1.value_number)).toBe(10);
    });
  });

  // ========================================
  // bulkUpdatePatientFields
  // ========================================
  describe('bulkUpdatePatientFields', () => {
    let numberDef;

    beforeEach(async () => {
      numberDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'water_intake',
        field_label: 'Water Intake',
        field_type: 'number',
        is_active: true,
        display_order: 2
      });
    });

    it('should update multiple fields at once', async () => {
      const fields = [
        { definition_id: testDefinition.id, value: 'AB+' },
        { definition_id: numberDef.id, value: 3.0 }
      ];

      const result = await patientCustomFieldService.bulkUpdatePatientFields(
        adminAuth.user, testPatient.id, fields
      );

      expect(result.message).toContain('2');
      expect(result.results.length).toBe(2);
      result.results.forEach(r => {
        expect(r.status).toBe('created');
      });
    });

    it('should update existing and create new in same batch', async () => {
      // Create one existing value
      await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, testDefinition.id, 'O+'
      );

      const fields = [
        { definition_id: testDefinition.id, value: 'AB+' },
        { definition_id: numberDef.id, value: 2.0 }
      ];

      const result = await patientCustomFieldService.bulkUpdatePatientFields(
        adminAuth.user, testPatient.id, fields
      );

      expect(result.results.length).toBe(2);
      const updated = result.results.find(r => r.definition_id === testDefinition.id);
      const created = result.results.find(r => r.definition_id === numberDef.id);
      expect(updated.status).toBe('updated');
      expect(created.status).toBe('created');
    });

    it('should deny access for unauthorized user', async () => {
      const otherDietitian = await testAuth.createDietitian();

      await expect(
        patientCustomFieldService.bulkUpdatePatientFields(
          otherDietitian.user, testPatient.id, [{ definition_id: testDefinition.id, value: 'test' }]
        )
      ).rejects.toThrow('Access denied');
    });

    it('should rollback on error (transactional)', async () => {
      const fields = [
        { definition_id: testDefinition.id, value: 'AB+' },
        { definition_id: '00000000-0000-0000-0000-000000000000', value: 'invalid' }
      ];

      await expect(
        patientCustomFieldService.bulkUpdatePatientFields(
          adminAuth.user, testPatient.id, fields
        )
      ).rejects.toThrow();

      // First field should NOT have been saved due to rollback
      const values = await db.PatientCustomFieldValue.count({
        where: { patient_id: testPatient.id }
      });
      expect(values).toBe(0);
    });

    it('should reject value that fails field validation in bulk', async () => {
      const requiredDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'required_bulk',
        field_label: 'Required Bulk',
        field_type: 'text',
        is_required: true,
        is_active: true,
        display_order: 3
      });

      const fields = [
        { definition_id: requiredDef.id, value: '' }
      ];

      await expect(
        patientCustomFieldService.bulkUpdatePatientFields(
          adminAuth.user, testPatient.id, fields
        )
      ).rejects.toThrow();
    });

    it('should trigger recalculation of dependent fields after bulk update', async () => {
      const inputA = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'bulk_a',
        field_label: 'Bulk A',
        field_type: 'number',
        is_active: true,
        display_order: 10
      });

      const inputB = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'bulk_b',
        field_label: 'Bulk B',
        field_type: 'number',
        is_active: true,
        display_order: 11
      });

      const calcDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'bulk_sum',
        field_label: 'Bulk Sum',
        field_type: 'calculated',
        is_calculated: true,
        formula: '{bulk_a} + {bulk_b}',
        dependencies: ['bulk_a', 'bulk_b'],
        is_active: true,
        display_order: 12
      });

      patientCustomFieldService.clearCalculatedFieldsCache();

      const fields = [
        { definition_id: inputA.id, value: 10 },
        { definition_id: inputB.id, value: 20 }
      ];

      const result = await patientCustomFieldService.bulkUpdatePatientFields(
        adminAuth.user, testPatient.id, fields
      );

      expect(result.results.length).toBe(2);

      // Calculated field should be auto-created
      const calcValue = await db.PatientCustomFieldValue.findOne({
        where: { patient_id: testPatient.id, field_definition_id: calcDef.id }
      });
      expect(calcValue).not.toBeNull();
      expect(parseFloat(calcValue.value_number)).toBe(30);
    });
  });

  // ========================================
  // deletePatientCustomField
  // ========================================
  describe('deletePatientCustomField', () => {
    let fieldValue;

    beforeEach(async () => {
      fieldValue = await db.PatientCustomFieldValue.create({
        patient_id: testPatient.id,
        field_definition_id: testDefinition.id,
        value_text: 'AB+',
        updated_by: adminAuth.user.id
      });
    });

    it('should delete a field value', async () => {
      const result = await patientCustomFieldService.deletePatientCustomField(
        adminAuth.user, testPatient.id, fieldValue.id
      );

      expect(result.message).toContain('deleted');

      const deleted = await db.PatientCustomFieldValue.findByPk(fieldValue.id);
      expect(deleted).toBeNull();
    });

    it('should deny access for unauthorized user', async () => {
      const otherDietitian = await testAuth.createDietitian();

      await expect(
        patientCustomFieldService.deletePatientCustomField(
          otherDietitian.user, testPatient.id, fieldValue.id
        )
      ).rejects.toThrow('Access denied');
    });

    it('should throw for non-existent field value', async () => {
      await expect(
        patientCustomFieldService.deletePatientCustomField(
          adminAuth.user, testPatient.id, '00000000-0000-0000-0000-000000000000'
        )
      ).rejects.toThrow('Custom field value not found');
    });

    it('should throw for field value belonging to different patient', async () => {
      // Create another patient
      const otherPatient = await db.Patient.create({
        first_name: 'Other',
        last_name: 'Patient'
      });

      await expect(
        patientCustomFieldService.deletePatientCustomField(
          adminAuth.user, otherPatient.id, fieldValue.id
        )
      ).rejects.toThrow('Custom field value not found');
    });
  });

  // ========================================
  // recalculateAllValuesForField
  // ========================================
  describe('recalculateAllValuesForField', () => {
    it('should reject non-calculated field', async () => {
      await expect(
        patientCustomFieldService.recalculateAllValuesForField(
          testDefinition.id, adminAuth.user
        )
      ).rejects.toThrow('not a calculated field');
    });

    it('should reject non-existent field', async () => {
      await expect(
        patientCustomFieldService.recalculateAllValuesForField(
          '00000000-0000-0000-0000-000000000000', adminAuth.user
        )
      ).rejects.toThrow('Field not found');
    });

    it('should recalculate existing values for calculated field', async () => {
      // Create two dependency fields
      const aFieldDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'val_a',
        field_label: 'Value A',
        field_type: 'number',
        is_active: true,
        display_order: 10
      });
      const bFieldDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'val_b',
        field_label: 'Value B',
        field_type: 'number',
        is_active: true,
        display_order: 11
      });

      // Create calculated field with simple formula: a + b
      const calcDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'sum_calc',
        field_label: 'Sum',
        field_type: 'calculated',
        is_active: true,
        is_calculated: true,
        formula: '{val_a} + {val_b}',
        dependencies: ['val_a', 'val_b'],
        display_order: 12
      });

      // Set values for patient using the service
      await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, aFieldDef.id, 10
      );
      await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, bFieldDef.id, 20
      );

      // Corrupt the auto-calculated value to a wrong number
      await db.PatientCustomFieldValue.update(
        { value_number: 999 },
        { where: { patient_id: testPatient.id, field_definition_id: calcDef.id } }
      );

      // Clear cache to ensure fresh data
      patientCustomFieldService.clearCalculatedFieldsCache();

      const result = await patientCustomFieldService.recalculateAllValuesForField(
        calcDef.id, adminAuth.user
      );

      expect(result.success).toBe(true);
      expect(result.recalculated).toBe(1);

      // Verify the value was recalculated correctly
      const updatedValue = await db.PatientCustomFieldValue.findOne({
        where: {
          patient_id: testPatient.id,
          field_definition_id: calcDef.id
        }
      });
      expect(parseFloat(updatedValue.value_number)).toBe(30); // 10 + 20
    });

    it('should handle recalculation with measure references', async () => {
      const measureDef = await db.MeasureDefinition.create({
        name: 'recalc_weight',
        display_name: 'Recalc Weight',
        measure_type: 'numeric',
        unit: 'kg',
        category: 'anthropometric',
        is_active: true
      });

      await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 80,
        measured_at: new Date(),
        recorded_by: adminAuth.user.id
      });

      const calcDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'measure_calc',
        field_label: 'Measure Calc',
        field_type: 'calculated',
        is_active: true,
        is_calculated: true,
        formula: '{measure:recalc_weight} * 2',
        dependencies: ['measure:recalc_weight'],
        display_order: 10
      });

      // Create existing value for this patient
      await db.PatientCustomFieldValue.create({
        patient_id: testPatient.id,
        field_definition_id: calcDef.id,
        value_number: 999,
        updated_by: adminAuth.user.id
      });

      patientCustomFieldService.clearCalculatedFieldsCache();

      const result = await patientCustomFieldService.recalculateAllValuesForField(
        calcDef.id, adminAuth.user
      );

      expect(result.success).toBe(true);
      expect(result.recalculated).toBe(1);

      const updatedValue = await db.PatientCustomFieldValue.findOne({
        where: { patient_id: testPatient.id, field_definition_id: calcDef.id }
      });
      expect(parseFloat(updatedValue.value_number)).toBe(160); // 80 * 2
    });

    it('should count errors for patients with missing dependencies', async () => {
      const calcDef = await db.CustomFieldDefinition.create({
        category_id: testCategory.id,
        field_name: 'error_calc',
        field_label: 'Error Calc',
        field_type: 'calculated',
        is_active: true,
        is_calculated: true,
        formula: '{missing_dep_x} + 1',
        dependencies: ['missing_dep_x'],
        display_order: 10
      });

      // Create existing value that can't be recalculated (missing dep)
      await db.PatientCustomFieldValue.create({
        patient_id: testPatient.id,
        field_definition_id: calcDef.id,
        value_number: 999,
        updated_by: adminAuth.user.id
      });

      patientCustomFieldService.clearCalculatedFieldsCache();

      const result = await patientCustomFieldService.recalculateAllValuesForField(
        calcDef.id, adminAuth.user
      );

      expect(result.success).toBe(true);
      expect(result.errors).toBeGreaterThanOrEqual(1);
    });
  });

  // ========================================
  // clearCalculatedFieldsCache
  // ========================================
  describe('clearCalculatedFieldsCache', () => {
    it('should clear cache without errors', () => {
      expect(() => {
        patientCustomFieldService.clearCalculatedFieldsCache();
      }).not.toThrow();
    });
  });

  // ========================================
  // getVisitFieldHistory
  // ========================================
  describe('getVisitFieldHistory', () => {
    let visitCategory, visitFieldDef;

    beforeEach(async () => {
      visitCategory = await db.CustomFieldCategory.create({
        name: 'Visit Vitals',
        description: 'Vital signs per visit',
        entity_types: ['visit'],
        display_order: 2,
        is_active: true
      });

      visitFieldDef = await db.CustomFieldDefinition.create({
        category_id: visitCategory.id,
        field_name: 'visit_weight',
        field_label: 'Weight at Visit',
        field_type: 'number',
        is_active: true,
        display_order: 1
      });
    });

    it('should return history structure with fields and visits', async () => {
      // Create visits
      const visit1 = await db.Visit.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: '2024-01-01',
        visit_type: 'initial',
        status: 'COMPLETED'
      });

      const result = await patientCustomFieldService.getVisitFieldHistory(
        adminAuth.user, testPatient.id, visitCategory.id
      );

      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('fields');
      expect(result).toHaveProperty('visits');
      expect(result.category.name).toBe('Visit Vitals');
      expect(result.fields.length).toBe(1);
      expect(result.visits.length).toBe(1);
    });

    it('should deny access for unauthorized user', async () => {
      const otherDietitian = await testAuth.createDietitian();

      await expect(
        patientCustomFieldService.getVisitFieldHistory(
          otherDietitian.user, testPatient.id, visitCategory.id
        )
      ).rejects.toThrow('Access denied');
    });

    it('should reject non-existent category', async () => {
      await expect(
        patientCustomFieldService.getVisitFieldHistory(
          adminAuth.user, testPatient.id, '00000000-0000-0000-0000-000000000000'
        )
      ).rejects.toThrow('Category not found');
    });

    it('should reject non-visit category', async () => {
      await expect(
        patientCustomFieldService.getVisitFieldHistory(
          adminAuth.user, testPatient.id, testCategory.id
        )
      ).rejects.toThrow('not a visit-level category');
    });

    it('should return empty visits array when no visits exist', async () => {
      // Create a new patient with no visits
      const newPatient = await db.Patient.create({
        first_name: 'No',
        last_name: 'Visits'
      });

      const result = await patientCustomFieldService.getVisitFieldHistory(
        adminAuth.user, newPatient.id, visitCategory.id
      );

      expect(result.visits).toEqual([]);
      expect(result.fields.length).toBe(1);
    });

    it('should include visit values in history', async () => {
      const visit1 = await db.Visit.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: '2024-01-01',
        visit_type: 'initial',
        status: 'COMPLETED'
      });

      await db.VisitCustomFieldValue.create({
        visit_id: visit1.id,
        field_definition_id: visitFieldDef.id,
        value_number: 75.5,
        updated_by: adminAuth.user.id
      });

      const result = await patientCustomFieldService.getVisitFieldHistory(
        adminAuth.user, testPatient.id, visitCategory.id
      );

      expect(result.visits[0].values[visitFieldDef.id]).toBe(75.5);
    });

    it('should return empty fields when no definitions exist', async () => {
      const emptyCategory = await db.CustomFieldCategory.create({
        name: 'Empty Visit Category',
        entity_types: ['visit'],
        display_order: 99,
        is_active: true
      });

      const result = await patientCustomFieldService.getVisitFieldHistory(
        adminAuth.user, testPatient.id, emptyCategory.id
      );

      expect(result.fields).toEqual([]);
      expect(result.visits).toEqual([]);
    });

    it('should apply English translations to category and fields', async () => {
      const visit1 = await db.Visit.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: '2024-01-01',
        visit_type: 'initial',
        status: 'COMPLETED'
      });

      const result = await patientCustomFieldService.getVisitFieldHistory(
        adminAuth.user, testPatient.id, visitCategory.id, 'en'
      );

      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('fields');
      expect(result.visits.length).toBe(1);
    });

  });
});
