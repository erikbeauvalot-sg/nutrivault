/**
 * Visit Custom Field Service Tests
 * Tests for visitCustomField.service.js business logic
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { patients: patientFixtures, visits: visitFixtures } = require('../fixtures');

let db;
let visitCustomFieldService;

describe('Visit Custom Field Service', () => {
  let adminAuth, dietitianAuth;
  let testPatient, testVisit;
  let visitCategory, visitFieldDef;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    visitCustomFieldService = require('../../src/services/visitCustomField.service');
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

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

    // Create test visit
    testVisit = await db.Visit.create({
      ...visitFixtures.validVisit,
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id
    });

    // Create visit-only category
    visitCategory = await db.CustomFieldCategory.create({
      name: 'Visit Vitals',
      description: 'Vital signs per visit',
      entity_types: ['visit'],
      display_order: 1,
      is_active: true
    });

    // Create visit field definition
    visitFieldDef = await db.CustomFieldDefinition.create({
      category_id: visitCategory.id,
      field_name: 'visit_weight',
      field_label: 'Weight at Visit',
      field_type: 'number',
      is_required: false,
      is_active: true,
      display_order: 1
    });
  });

  // ========================================
  // getVisitCustomFields
  // ========================================
  describe('getVisitCustomFields', () => {
    it('should return categories with field definitions', async () => {
      const result = await visitCustomFieldService.getVisitCustomFields(
        adminAuth.user, testVisit.id
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);

      const category = result.find(c => c.id === visitCategory.id);
      expect(category).toBeDefined();
      expect(category.name).toBe('Visit Vitals');
      expect(category.fields.length).toBeGreaterThanOrEqual(1);
    });

    it('should include field values when they exist', async () => {
      await db.VisitCustomFieldValue.create({
        visit_id: testVisit.id,
        field_definition_id: visitFieldDef.id,
        value_number: 75.5,
        updated_by: adminAuth.user.id
      });

      const result = await visitCustomFieldService.getVisitCustomFields(
        adminAuth.user, testVisit.id
      );

      const category = result.find(c => c.id === visitCategory.id);
      const field = category.fields.find(f => f.definition_id === visitFieldDef.id);
      expect(field.value).toBe(75.5);
    });

    it('should return null values for fields without data', async () => {
      const result = await visitCustomFieldService.getVisitCustomFields(
        adminAuth.user, testVisit.id
      );

      const category = result.find(c => c.id === visitCategory.id);
      const field = category.fields.find(f => f.definition_id === visitFieldDef.id);
      expect(field.value).toBeNull();
      expect(field.value_id).toBeNull();
    });

    it('should deny access for unauthorized user', async () => {
      const otherDietitian = await testAuth.createDietitian();

      await expect(
        visitCustomFieldService.getVisitCustomFields(
          otherDietitian.user, testVisit.id
        )
      ).rejects.toThrow('Access denied');
    });

    it('should handle non-existent visit', async () => {
      await expect(
        visitCustomFieldService.getVisitCustomFields(
          adminAuth.user, '00000000-0000-0000-0000-000000000000'
        )
      ).rejects.toThrow('Access denied');
    });

    it('should include category metadata in response', async () => {
      const result = await visitCustomFieldService.getVisitCustomFields(
        adminAuth.user, testVisit.id
      );

      const category = result.find(c => c.id === visitCategory.id);
      expect(category).toHaveProperty('color');
      expect(category).toHaveProperty('display_layout');
      expect(category).toHaveProperty('visit_types');
    });

    it('should apply English translations when language is en', async () => {
      const result = await visitCustomFieldService.getVisitCustomFields(
        adminAuth.user, testVisit.id, 'en'
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);

      const category = result.find(c => c.id === visitCategory.id);
      expect(category).toBeDefined();
      expect(category.fields.length).toBeGreaterThanOrEqual(1);
    });

    it('should include shared patient-level fields if category has both entity types', async () => {
      // Create a shared category (patient + visit)
      const sharedCategory = await db.CustomFieldCategory.create({
        name: 'Shared Info',
        entity_types: ['patient', 'visit'],
        display_order: 2,
        is_active: true
      });

      const sharedDef = await db.CustomFieldDefinition.create({
        category_id: sharedCategory.id,
        field_name: 'allergies_shared',
        field_label: 'Allergies',
        field_type: 'text',
        is_active: true,
        display_order: 1
      });

      // Set patient-level value using service (which uses setValue correctly)
      const patientCustomFieldService = require('../../src/services/patientCustomField.service');
      await patientCustomFieldService.setPatientCustomField(
        adminAuth.user, testPatient.id, sharedDef.id, 'Peanuts'
      );

      const result = await visitCustomFieldService.getVisitCustomFields(
        adminAuth.user, testVisit.id
      );

      const shared = result.find(c => c.id === sharedCategory.id);
      expect(shared).toBeDefined();
      const field = shared.fields.find(f => f.definition_id === sharedDef.id);
      expect(field.value).toBe('Peanuts');
    });
  });

  // ========================================
  // setVisitCustomField
  // ========================================
  describe('setVisitCustomField', () => {
    it('should create a new visit field value', async () => {
      const result = await visitCustomFieldService.setVisitCustomField(
        adminAuth.user, testVisit.id, visitFieldDef.id, 75.5
      );

      expect(result).toBeDefined();
      expect(parseFloat(result.value_number)).toBe(75.5);
    });

    it('should update an existing field value', async () => {
      await visitCustomFieldService.setVisitCustomField(
        adminAuth.user, testVisit.id, visitFieldDef.id, 75.5
      );

      const result = await visitCustomFieldService.setVisitCustomField(
        adminAuth.user, testVisit.id, visitFieldDef.id, 76.0
      );

      expect(parseFloat(result.value_number)).toBe(76.0);

      // Only one value record should exist
      const count = await db.VisitCustomFieldValue.count({
        where: {
          visit_id: testVisit.id,
          field_definition_id: visitFieldDef.id
        }
      });
      expect(count).toBe(1);
    });

    it('should deny access for unauthorized user', async () => {
      const otherDietitian = await testAuth.createDietitian();

      await expect(
        visitCustomFieldService.setVisitCustomField(
          otherDietitian.user, testVisit.id, visitFieldDef.id, 75
        )
      ).rejects.toThrow('Access denied');
    });

    it('should reject inactive field definition', async () => {
      await visitFieldDef.update({ is_active: false });

      await expect(
        visitCustomFieldService.setVisitCustomField(
          adminAuth.user, testVisit.id, visitFieldDef.id, 75
        )
      ).rejects.toThrow('Field definition not found or inactive');
    });

    it('should reject non-existent field definition', async () => {
      await expect(
        visitCustomFieldService.setVisitCustomField(
          adminAuth.user, testVisit.id, '00000000-0000-0000-0000-000000000000', 75
        )
      ).rejects.toThrow('Field definition not found or inactive');
    });

    it('should reject non-existent visit', async () => {
      await expect(
        visitCustomFieldService.setVisitCustomField(
          adminAuth.user, '00000000-0000-0000-0000-000000000000', visitFieldDef.id, 75
        )
      ).rejects.toThrow('Access denied');
    });

    it('should store patient-level field in patient table when category is shared', async () => {
      const sharedCategory = await db.CustomFieldCategory.create({
        name: 'Shared Data',
        entity_types: ['patient', 'visit'],
        display_order: 3,
        is_active: true
      });

      const sharedDef = await db.CustomFieldDefinition.create({
        category_id: sharedCategory.id,
        field_name: 'shared_field',
        field_label: 'Shared Field',
        field_type: 'text',
        is_active: true,
        display_order: 1
      });

      await visitCustomFieldService.setVisitCustomField(
        adminAuth.user, testVisit.id, sharedDef.id, 'shared value'
      );

      // Should be stored in PatientCustomFieldValue, not VisitCustomFieldValue
      const patientValue = await db.PatientCustomFieldValue.findOne({
        where: {
          patient_id: testPatient.id,
          field_definition_id: sharedDef.id
        }
      });
      expect(patientValue).not.toBeNull();
      expect(patientValue.value_text).toBe('shared value');

      // Should NOT be in VisitCustomFieldValue
      const visitValue = await db.VisitCustomFieldValue.findOne({
        where: {
          visit_id: testVisit.id,
          field_definition_id: sharedDef.id
        }
      });
      expect(visitValue).toBeNull();
    });

    it('should handle text field type', async () => {
      const textDef = await db.CustomFieldDefinition.create({
        category_id: visitCategory.id,
        field_name: 'visit_notes_cf',
        field_label: 'Visit Notes',
        field_type: 'text',
        is_active: true,
        display_order: 2
      });

      const result = await visitCustomFieldService.setVisitCustomField(
        adminAuth.user, testVisit.id, textDef.id, 'some notes'
      );

      expect(result.value_text).toBe('some notes');
    });

    it('should reject value that fails field validation', async () => {
      const requiredDef = await db.CustomFieldDefinition.create({
        category_id: visitCategory.id,
        field_name: 'required_visit_field',
        field_label: 'Required Field',
        field_type: 'text',
        is_required: true,
        is_active: true,
        display_order: 3
      });

      await expect(
        visitCustomFieldService.setVisitCustomField(
          adminAuth.user, testVisit.id, requiredDef.id, ''
        )
      ).rejects.toThrow();
    });

    it('should trigger recalculation of dependent calculated fields', async () => {
      const inputDef = await db.CustomFieldDefinition.create({
        category_id: visitCategory.id,
        field_name: 'visit_height',
        field_label: 'Height',
        field_type: 'number',
        is_active: true,
        display_order: 2
      });

      const calcDef = await db.CustomFieldDefinition.create({
        category_id: visitCategory.id,
        field_name: 'visit_height_doubled',
        field_label: 'Height x2',
        field_type: 'calculated',
        is_calculated: true,
        formula: '{visit_height} * 2',
        dependencies: ['visit_height'],
        is_active: true,
        display_order: 3
      });

      await visitCustomFieldService.setVisitCustomField(
        adminAuth.user, testVisit.id, inputDef.id, 170
      );

      const calcValue = await db.VisitCustomFieldValue.findOne({
        where: { visit_id: testVisit.id, field_definition_id: calcDef.id }
      });
      expect(calcValue).not.toBeNull();
      expect(parseFloat(calcValue.value_number)).toBe(340);
    });

    it('should skip calculation when dependencies are missing', async () => {
      const inputDef = await db.CustomFieldDefinition.create({
        category_id: visitCategory.id,
        field_name: 'visit_trigger',
        field_label: 'Trigger',
        field_type: 'number',
        is_active: true,
        display_order: 2
      });

      await db.CustomFieldDefinition.create({
        category_id: visitCategory.id,
        field_name: 'visit_partial_calc',
        field_label: 'Partial Calc',
        field_type: 'calculated',
        is_calculated: true,
        formula: '{visit_trigger} + {missing_field}',
        dependencies: ['visit_trigger', 'missing_field'],
        is_active: true,
        display_order: 3
      });

      await visitCustomFieldService.setVisitCustomField(
        adminAuth.user, testVisit.id, inputDef.id, 100
      );

      // Only the trigger field should be saved (no calc because missing dep)
      const count = await db.VisitCustomFieldValue.count({
        where: { visit_id: testVisit.id }
      });
      expect(count).toBe(1);
    });

    it('should update existing calculated field on recalculation', async () => {
      const inputDef = await db.CustomFieldDefinition.create({
        category_id: visitCategory.id,
        field_name: 'visit_base',
        field_label: 'Base',
        field_type: 'number',
        is_active: true,
        display_order: 2
      });

      const calcDef = await db.CustomFieldDefinition.create({
        category_id: visitCategory.id,
        field_name: 'visit_base_x3',
        field_label: 'Base x3',
        field_type: 'calculated',
        is_calculated: true,
        formula: '{visit_base} * 3',
        dependencies: ['visit_base'],
        is_active: true,
        display_order: 3
      });

      // First set
      await visitCustomFieldService.setVisitCustomField(
        adminAuth.user, testVisit.id, inputDef.id, 10
      );

      // Update — should recalculate
      await visitCustomFieldService.setVisitCustomField(
        adminAuth.user, testVisit.id, inputDef.id, 20
      );

      const calcValue = await db.VisitCustomFieldValue.findOne({
        where: { visit_id: testVisit.id, field_definition_id: calcDef.id }
      });
      expect(parseFloat(calcValue.value_number)).toBe(60);
    });
  });

  // ========================================
  // bulkUpdateVisitFields
  // ========================================
  describe('bulkUpdateVisitFields', () => {
    let textFieldDef;

    beforeEach(async () => {
      textFieldDef = await db.CustomFieldDefinition.create({
        category_id: visitCategory.id,
        field_name: 'visit_bp',
        field_label: 'Blood Pressure',
        field_type: 'text',
        is_active: true,
        display_order: 2
      });
    });

    it('should update multiple fields at once', async () => {
      const fields = [
        { definition_id: visitFieldDef.id, value: 75.5 },
        { definition_id: textFieldDef.id, value: '120/80' }
      ];

      const result = await visitCustomFieldService.bulkUpdateVisitFields(
        adminAuth.user, testVisit.id, fields
      );

      expect(result.message).toContain('2');
      expect(result.results.length).toBe(2);
    });

    it('should create new and update existing in same batch', async () => {
      // Create one existing value
      await db.VisitCustomFieldValue.create({
        visit_id: testVisit.id,
        field_definition_id: visitFieldDef.id,
        value_number: 70,
        updated_by: adminAuth.user.id
      });

      const fields = [
        { definition_id: visitFieldDef.id, value: 75.5 },
        { definition_id: textFieldDef.id, value: '120/80' }
      ];

      const result = await visitCustomFieldService.bulkUpdateVisitFields(
        adminAuth.user, testVisit.id, fields
      );

      const updated = result.results.find(r => r.definition_id === visitFieldDef.id);
      const created = result.results.find(r => r.definition_id === textFieldDef.id);
      expect(updated.status).toBe('updated');
      expect(created.status).toBe('created');
    });

    it('should deny access for unauthorized user', async () => {
      const otherDietitian = await testAuth.createDietitian();

      await expect(
        visitCustomFieldService.bulkUpdateVisitFields(
          otherDietitian.user, testVisit.id, [{ definition_id: visitFieldDef.id, value: 75 }]
        )
      ).rejects.toThrow('Access denied');
    });

    it('should reject non-existent visit', async () => {
      await expect(
        visitCustomFieldService.bulkUpdateVisitFields(
          adminAuth.user, '00000000-0000-0000-0000-000000000000',
          [{ definition_id: visitFieldDef.id, value: 75 }]
        )
      ).rejects.toThrow();
    });

    it('should rollback on error (transactional)', async () => {
      const fields = [
        { definition_id: visitFieldDef.id, value: 75.5 },
        { definition_id: '00000000-0000-0000-0000-000000000000', value: 'invalid' }
      ];

      await expect(
        visitCustomFieldService.bulkUpdateVisitFields(
          adminAuth.user, testVisit.id, fields
        )
      ).rejects.toThrow();

      // First field should NOT have been saved
      const count = await db.VisitCustomFieldValue.count({
        where: { visit_id: testVisit.id }
      });
      expect(count).toBe(0);
    });

    it('should indicate storage level in results', async () => {
      const fields = [
        { definition_id: visitFieldDef.id, value: 75.5 }
      ];

      const result = await visitCustomFieldService.bulkUpdateVisitFields(
        adminAuth.user, testVisit.id, fields
      );

      expect(result.results[0].level).toBe('visit');
    });

    it('should reject value that fails field validation in bulk', async () => {
      const requiredDef = await db.CustomFieldDefinition.create({
        category_id: visitCategory.id,
        field_name: 'required_bulk_visit',
        field_label: 'Required Bulk',
        field_type: 'text',
        is_required: true,
        is_active: true,
        display_order: 3
      });

      await expect(
        visitCustomFieldService.bulkUpdateVisitFields(
          adminAuth.user, testVisit.id, [{ definition_id: requiredDef.id, value: '' }]
        )
      ).rejects.toThrow();
    });

    it('should store patient-level fields in patient table during bulk update', async () => {
      const sharedCategory = await db.CustomFieldCategory.create({
        name: 'Bulk Shared',
        entity_types: ['patient', 'visit'],
        display_order: 5,
        is_active: true
      });

      const sharedDef = await db.CustomFieldDefinition.create({
        category_id: sharedCategory.id,
        field_name: 'bulk_shared_field',
        field_label: 'Bulk Shared Field',
        field_type: 'text',
        is_active: true,
        display_order: 1
      });

      const fields = [
        { definition_id: visitFieldDef.id, value: 80 },
        { definition_id: sharedDef.id, value: 'patient level value' }
      ];

      const result = await visitCustomFieldService.bulkUpdateVisitFields(
        adminAuth.user, testVisit.id, fields
      );

      expect(result.results.length).toBe(2);

      // Check the visit-level field
      const visitResult = result.results.find(r => r.definition_id === visitFieldDef.id);
      expect(visitResult.level).toBe('visit');

      // Check the patient-level field
      const patientResult = result.results.find(r => r.definition_id === sharedDef.id);
      expect(patientResult.level).toBe('patient');

      // Verify patient-level value was stored in PatientCustomFieldValue
      const patientValue = await db.PatientCustomFieldValue.findOne({
        where: { patient_id: testPatient.id, field_definition_id: sharedDef.id }
      });
      expect(patientValue).not.toBeNull();
      expect(patientValue.value_text).toBe('patient level value');
    });

    it('should update existing patient-level field in bulk', async () => {
      const sharedCategory = await db.CustomFieldCategory.create({
        name: 'Bulk Shared Update',
        entity_types: ['patient', 'visit'],
        display_order: 6,
        is_active: true
      });

      const sharedDef = await db.CustomFieldDefinition.create({
        category_id: sharedCategory.id,
        field_name: 'bulk_shared_update',
        field_label: 'Bulk Shared Update',
        field_type: 'text',
        is_active: true,
        display_order: 1
      });

      // Create existing patient-level value
      await db.PatientCustomFieldValue.create({
        patient_id: testPatient.id,
        field_definition_id: sharedDef.id,
        value_text: 'old value',
        updated_by: adminAuth.user.id
      });

      const result = await visitCustomFieldService.bulkUpdateVisitFields(
        adminAuth.user, testVisit.id, [{ definition_id: sharedDef.id, value: 'new value' }]
      );

      expect(result.results[0].status).toBe('updated');
      expect(result.results[0].level).toBe('patient');

      const patientValue = await db.PatientCustomFieldValue.findOne({
        where: { patient_id: testPatient.id, field_definition_id: sharedDef.id }
      });
      expect(patientValue.value_text).toBe('new value');
    });
  });

  // ========================================
  // deleteVisitCustomField
  // ========================================
  describe('deleteVisitCustomField', () => {
    let fieldValue;

    beforeEach(async () => {
      fieldValue = await db.VisitCustomFieldValue.create({
        visit_id: testVisit.id,
        field_definition_id: visitFieldDef.id,
        value_number: 75.5,
        updated_by: adminAuth.user.id
      });
    });

    it('should delete a visit field value', async () => {
      const result = await visitCustomFieldService.deleteVisitCustomField(
        adminAuth.user, testVisit.id, fieldValue.id
      );

      expect(result.message).toContain('deleted');

      const deleted = await db.VisitCustomFieldValue.findByPk(fieldValue.id);
      expect(deleted).toBeNull();
    });

    it('should deny access for unauthorized user', async () => {
      const otherDietitian = await testAuth.createDietitian();

      await expect(
        visitCustomFieldService.deleteVisitCustomField(
          otherDietitian.user, testVisit.id, fieldValue.id
        )
      ).rejects.toThrow('Access denied');
    });

    it('should throw for non-existent field value', async () => {
      await expect(
        visitCustomFieldService.deleteVisitCustomField(
          adminAuth.user, testVisit.id, '00000000-0000-0000-0000-000000000000'
        )
      ).rejects.toThrow('Custom field value not found');
    });

    it('should throw for field value belonging to different visit', async () => {
      const otherVisit = await db.Visit.create({
        ...visitFixtures.validVisit,
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: '2024-06-01'
      });

      await expect(
        visitCustomFieldService.deleteVisitCustomField(
          adminAuth.user, otherVisit.id, fieldValue.id
        )
      ).rejects.toThrow('Custom field value not found');
    });
  });
});
