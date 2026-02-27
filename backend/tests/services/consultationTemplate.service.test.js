/**
 * Consultation Template Service Tests
 * Tests for consultationTemplate.service.js business logic
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let db;
let consultationTemplateService;

describe('Consultation Template Service', () => {
  let adminAuth, dietitianAuth, dietitian2Auth;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    consultationTemplateService = require('../../src/services/consultationTemplate.service');
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
    dietitian2Auth = await testAuth.createDietitian();

    // ConsultationTemplate and ConsultationTemplateItem are NOT in testDb.reset() list
    // Clean them manually here to ensure a fresh state
    await db.ConsultationTemplateItem.destroy({ where: {}, force: true });
    await db.ConsultationTemplate.destroy({ where: {}, force: true });
  });

  // ========================================
  // Helper: build a template in the DB
  // ========================================
  async function createTemplateInDb(overrides = {}, userId = null) {
    const owner = userId || dietitianAuth.user.id;
    const template = await db.ConsultationTemplate.create({
      name: overrides.name || 'Test Template',
      description: overrides.description || 'A test template',
      template_type: overrides.template_type || 'general',
      visibility: overrides.visibility || 'private',
      is_default: overrides.is_default || false,
      created_by: owner,
      tags: overrides.tags || [],
      color: overrides.color || null
    });
    return template;
  }

  async function addItemToTemplate(templateId, overrides = {}) {
    return db.ConsultationTemplateItem.create({
      template_id: templateId,
      item_type: overrides.item_type || 'instruction',
      reference_id: overrides.reference_id || null,
      display_order: overrides.display_order !== undefined ? overrides.display_order : 0,
      is_required: overrides.is_required || false,
      instruction_title: overrides.instruction_title || 'Welcome',
      instruction_content: overrides.instruction_content || 'Greet the patient',
      layout_override: null
    });
  }

  // ================================================================
  // createTemplate
  // ================================================================
  describe('createTemplate', () => {
    it('should create a template with name and basic fields', async () => {
      const result = await consultationTemplateService.createTemplate(
        {
          name: 'Initial Consultation',
          description: 'Standard first visit template',
          template_type: 'consultation',
          visibility: 'private'
        },
        dietitianAuth.user.id
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Initial Consultation');
      expect(result.description).toBe('Standard first visit template');
      expect(result.template_type).toBe('consultation');
      expect(result.visibility).toBe('private');
      expect(result.created_by).toBe(dietitianAuth.user.id);
    });

    it('should default visibility to "private" when not provided', async () => {
      const result = await consultationTemplateService.createTemplate(
        { name: 'Minimal Template' },
        dietitianAuth.user.id
      );

      expect(result.visibility).toBe('private');
    });

    it('should default template_type to "general" when not provided', async () => {
      const result = await consultationTemplateService.createTemplate(
        { name: 'Minimal Template' },
        dietitianAuth.user.id
      );

      expect(result.template_type).toBe('general');
    });

    it('should create a template with instruction items', async () => {
      const result = await consultationTemplateService.createTemplate(
        {
          name: 'Template With Items',
          items: [
            {
              item_type: 'instruction',
              instruction_title: 'Welcome',
              instruction_content: 'Greet the patient warmly',
              display_order: 0
            }
          ]
        },
        dietitianAuth.user.id
      );

      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(1);
      expect(result.items[0].item_type).toBe('instruction');
      expect(result.items[0].instruction_title).toBe('Welcome');
      expect(result.items[0].instruction_content).toBe('Greet the patient warmly');
      expect(result.items[0].display_order).toBe(0);
    });

    it('should create a template with multiple item types', async () => {
      const result = await consultationTemplateService.createTemplate(
        {
          name: 'Multi-Item Template',
          items: [
            {
              item_type: 'instruction',
              instruction_title: 'Intro',
              instruction_content: 'Start here',
              display_order: 0
            },
            {
              item_type: 'category',
              reference_id: null,
              display_order: 1
            },
            {
              item_type: 'measure',
              reference_id: null,
              display_order: 2
            }
          ]
        },
        dietitianAuth.user.id
      );

      expect(result.items.length).toBe(3);
      const types = result.items.map(i => i.item_type);
      expect(types).toContain('instruction');
      expect(types).toContain('category');
      expect(types).toContain('measure');
    });

    it('should preserve display_order of items', async () => {
      const result = await consultationTemplateService.createTemplate(
        {
          name: 'Ordered Template',
          items: [
            { item_type: 'instruction', instruction_title: 'Third', display_order: 2 },
            { item_type: 'instruction', instruction_title: 'First', display_order: 0 },
            { item_type: 'instruction', instruction_title: 'Second', display_order: 1 }
          ]
        },
        dietitianAuth.user.id
      );

      // items are returned ordered by display_order ASC
      expect(result.items[0].display_order).toBe(0);
      expect(result.items[1].display_order).toBe(1);
      expect(result.items[2].display_order).toBe(2);
    });

    it('should return template with items and creator', async () => {
      const result = await consultationTemplateService.createTemplate(
        {
          name: 'Full Template',
          items: [
            { item_type: 'instruction', instruction_title: 'Note', display_order: 0 }
          ]
        },
        dietitianAuth.user.id
      );

      expect(result.creator).toBeDefined();
      expect(result.creator.id).toBe(dietitianAuth.user.id);
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should set is_default to false by default', async () => {
      const result = await consultationTemplateService.createTemplate(
        { name: 'Default Check' },
        dietitianAuth.user.id
      );

      expect(result.is_default).toBe(false);
    });

    it('should rollback transaction on error when item creation fails', async () => {
      // NOTE: SQLite does not enforce isIn (ENUM-style) validation at the DB level.
      // To trigger a real DB-level error we violate NOT NULL: item_type is NOT NULL
      // but we pass null explicitly, which SQLite does enforce.
      await expect(
        consultationTemplateService.createTemplate(
          {
            name: 'Will Fail',
            items: [{ item_type: null, display_order: 0 }]
          },
          dietitianAuth.user.id
        )
      ).rejects.toThrow();

      // Template should NOT exist in database due to rollback
      const count = await db.ConsultationTemplate.count({ where: { name: 'Will Fail' } });
      expect(count).toBe(0);
    });
  });

  // ================================================================
  // getTemplates
  // ================================================================
  describe('getTemplates', () => {
    beforeEach(async () => {
      // dietitianAuth owns a private template
      await createTemplateInDb(
        { name: 'Dietitian1 Private', visibility: 'private', template_type: 'general' },
        dietitianAuth.user.id
      );
      // dietitianAuth owns a shared template
      await createTemplateInDb(
        { name: 'Dietitian1 Shared', visibility: 'shared', template_type: 'consultation' },
        dietitianAuth.user.id
      );
      // dietitian2Auth owns a private template
      await createTemplateInDb(
        { name: 'Dietitian2 Private', visibility: 'private', template_type: 'general' },
        dietitian2Auth.user.id
      );
      // dietitian2Auth owns a shared template
      await createTemplateInDb(
        { name: 'Dietitian2 Shared', visibility: 'shared', template_type: 'followup' },
        dietitian2Auth.user.id
      );
    });

    it('should return all templates for admin', async () => {
      const results = await consultationTemplateService.getTemplates(adminAuth.user);

      expect(results.length).toBe(4);
    });

    it('should return own templates for dietitian', async () => {
      const results = await consultationTemplateService.getTemplates(dietitianAuth.user);

      const names = results.map(t => t.name);
      expect(names).toContain('Dietitian1 Private');
      expect(names).toContain('Dietitian1 Shared');
    });

    it('should return shared templates from other dietitians', async () => {
      const results = await consultationTemplateService.getTemplates(dietitianAuth.user);

      const names = results.map(t => t.name);
      expect(names).toContain('Dietitian2 Shared');
    });

    it('should NOT return private templates from other dietitians', async () => {
      const results = await consultationTemplateService.getTemplates(dietitianAuth.user);

      const names = results.map(t => t.name);
      expect(names).not.toContain('Dietitian2 Private');
    });

    it('should filter by template_type', async () => {
      const results = await consultationTemplateService.getTemplates(adminAuth.user, {
        template_type: 'consultation'
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Dietitian1 Shared');
    });

    it('should filter by search (name contains)', async () => {
      const results = await consultationTemplateService.getTemplates(adminAuth.user, {
        search: 'Shared'
      });

      expect(results.length).toBe(2);
      results.forEach(t => expect(t.name).toMatch(/Shared/));
    });

    it('should filter by search (case-insensitive partial match)', async () => {
      const results = await consultationTemplateService.getTemplates(adminAuth.user, {
        search: 'dietitian1'
      });

      // SQLite LIKE is case-insensitive for ASCII
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should return items with each template', async () => {
      const template = await createTemplateInDb({ name: 'With Items' }, adminAuth.user.id);
      await addItemToTemplate(template.id, { instruction_title: 'Step 1' });

      const results = await consultationTemplateService.getTemplates(adminAuth.user, {
        search: 'With Items'
      });

      expect(results.length).toBe(1);
      expect(results[0].items).toBeDefined();
      expect(Array.isArray(results[0].items)).toBe(true);
    });

    it('should only return active templates by default', async () => {
      // Soft-delete one template
      await db.ConsultationTemplate.update(
        { is_active: false },
        { where: { name: 'Dietitian1 Private' } }
      );

      const results = await consultationTemplateService.getTemplates(adminAuth.user);

      const names = results.map(t => t.name);
      expect(names).not.toContain('Dietitian1 Private');
    });
  });

  // ================================================================
  // getTemplateById
  // ================================================================
  describe('getTemplateById', () => {
    let ownTemplate, sharedTemplate, otherPrivateTemplate;

    beforeEach(async () => {
      ownTemplate = await createTemplateInDb(
        { name: 'Own Template', visibility: 'private' },
        dietitianAuth.user.id
      );
      await addItemToTemplate(ownTemplate.id, { instruction_title: 'Step 1', display_order: 0 });

      sharedTemplate = await createTemplateInDb(
        { name: 'Shared Template', visibility: 'shared' },
        dietitian2Auth.user.id
      );

      otherPrivateTemplate = await createTemplateInDb(
        { name: 'Other Private', visibility: 'private' },
        dietitian2Auth.user.id
      );
    });

    it('should return template with items', async () => {
      const result = await consultationTemplateService.getTemplateById(
        ownTemplate.id,
        dietitianAuth.user
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(ownTemplate.id);
      expect(result.name).toBe('Own Template');
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should return template with enriched items', async () => {
      const result = await consultationTemplateService.getTemplateById(
        ownTemplate.id,
        dietitianAuth.user
      );

      expect(result.items.length).toBe(1);
      expect(result.items[0].item_type).toBe('instruction');
      expect(result.items[0].instruction_title).toBe('Step 1');
    });

    it('should include creator information', async () => {
      const result = await consultationTemplateService.getTemplateById(
        ownTemplate.id,
        dietitianAuth.user
      );

      expect(result.creator).toBeDefined();
      expect(result.creator.id).toBe(dietitianAuth.user.id);
    });

    it('should throw "Template not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationTemplateService.getTemplateById(fakeId, adminAuth.user)
      ).rejects.toThrow('Template not found');
    });

    it('should allow admin to access any template', async () => {
      const result = await consultationTemplateService.getTemplateById(
        otherPrivateTemplate.id,
        adminAuth.user
      );

      expect(result.id).toBe(otherPrivateTemplate.id);
    });

    it('should allow dietitian to access own template', async () => {
      const result = await consultationTemplateService.getTemplateById(
        ownTemplate.id,
        dietitianAuth.user
      );

      expect(result.id).toBe(ownTemplate.id);
    });

    it('should allow dietitian to access shared template from another user', async () => {
      const result = await consultationTemplateService.getTemplateById(
        sharedTemplate.id,
        dietitianAuth.user
      );

      expect(result.id).toBe(sharedTemplate.id);
    });

    it('should throw permission error when dietitian tries to access private template of another dietitian', async () => {
      await expect(
        consultationTemplateService.getTemplateById(
          otherPrivateTemplate.id,
          dietitianAuth.user
        )
      ).rejects.toThrow('You do not have permission to view this template');
    });
  });

  // ================================================================
  // updateTemplate
  // ================================================================
  describe('updateTemplate', () => {
    let ownTemplate, otherTemplate;

    beforeEach(async () => {
      ownTemplate = await createTemplateInDb(
        { name: 'Original Name', description: 'Original description', template_type: 'general' },
        dietitianAuth.user.id
      );
      await addItemToTemplate(ownTemplate.id, { instruction_title: 'Old Item', display_order: 0 });

      otherTemplate = await createTemplateInDb(
        { name: 'Other Template', visibility: 'private' },
        dietitian2Auth.user.id
      );
    });

    it('should allow admin to update any template', async () => {
      const result = await consultationTemplateService.updateTemplate(
        otherTemplate.id,
        { name: 'Admin Updated Name' },
        adminAuth.user
      );

      expect(result.name).toBe('Admin Updated Name');
    });

    it('should allow owner to update own template', async () => {
      const result = await consultationTemplateService.updateTemplate(
        ownTemplate.id,
        { name: 'Updated Name' },
        dietitianAuth.user
      );

      expect(result.name).toBe('Updated Name');
    });

    it('should update name and description', async () => {
      const result = await consultationTemplateService.updateTemplate(
        ownTemplate.id,
        { name: 'New Name', description: 'New description' },
        dietitianAuth.user
      );

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New description');
    });

    it('should update template_type and visibility', async () => {
      const result = await consultationTemplateService.updateTemplate(
        ownTemplate.id,
        { template_type: 'followup', visibility: 'shared' },
        dietitianAuth.user
      );

      expect(result.template_type).toBe('followup');
      expect(result.visibility).toBe('shared');
    });

    it('should replace items when items array is provided', async () => {
      const newItems = [
        { item_type: 'instruction', instruction_title: 'New Item 1', display_order: 0 },
        { item_type: 'instruction', instruction_title: 'New Item 2', display_order: 1 }
      ];

      const result = await consultationTemplateService.updateTemplate(
        ownTemplate.id,
        { items: newItems },
        dietitianAuth.user
      );

      expect(result.items.length).toBe(2);
      const titles = result.items.map(i => i.instruction_title);
      expect(titles).toContain('New Item 1');
      expect(titles).toContain('New Item 2');
      // Old item should be gone
      expect(titles).not.toContain('Old Item');
    });

    it('should clear all items when empty items array is provided', async () => {
      const result = await consultationTemplateService.updateTemplate(
        ownTemplate.id,
        { items: [] },
        dietitianAuth.user
      );

      expect(result.items.length).toBe(0);
    });

    it('should NOT replace items when items is not provided', async () => {
      const result = await consultationTemplateService.updateTemplate(
        ownTemplate.id,
        { name: 'Name Only Update' },
        dietitianAuth.user
      );

      // Items should be untouched
      expect(result.items.length).toBe(1);
      expect(result.items[0].instruction_title).toBe('Old Item');
    });

    it('should throw "Template not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationTemplateService.updateTemplate(fakeId, { name: 'X' }, adminAuth.user)
      ).rejects.toThrow('Template not found');
    });

    it('should throw permission error when non-owner dietitian tries to update', async () => {
      await expect(
        consultationTemplateService.updateTemplate(
          otherTemplate.id,
          { name: 'Hacked' },
          dietitianAuth.user
        )
      ).rejects.toThrow('You do not have permission to update this template');
    });
  });

  // ================================================================
  // deleteTemplate
  // ================================================================
  describe('deleteTemplate', () => {
    let ownTemplate, otherTemplate;

    beforeEach(async () => {
      ownTemplate = await createTemplateInDb(
        { name: 'To Delete', visibility: 'private' },
        dietitianAuth.user.id
      );

      otherTemplate = await createTemplateInDb(
        { name: 'Other Delete Target', visibility: 'private' },
        dietitian2Auth.user.id
      );
    });

    it('should allow admin to delete any template', async () => {
      const result = await consultationTemplateService.deleteTemplate(
        otherTemplate.id,
        adminAuth.user
      );

      expect(result.success).toBe(true);

      const found = await db.ConsultationTemplate.findByPk(otherTemplate.id);
      expect(found).toBeNull();
    });

    it('should allow owner to delete own template when no notes exist', async () => {
      const result = await consultationTemplateService.deleteTemplate(
        ownTemplate.id,
        dietitianAuth.user
      );

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/deleted/i);

      const found = await db.ConsultationTemplate.findByPk(ownTemplate.id);
      expect(found).toBeNull();
    });

    it('should soft-delete (set is_active=false) when ConsultationNote exists for template', async () => {
      // Need a patient and a ConsultationNote referencing the template
      const patient = await db.Patient.create({
        first_name: 'Test',
        last_name: 'Patient',
        email: `patient_${Date.now()}@test.com`,
        is_active: true
      });

      await db.ConsultationNote.create({
        patient_id: patient.id,
        template_id: ownTemplate.id,
        dietitian_id: dietitianAuth.user.id,
        status: 'draft'
      });

      const result = await consultationTemplateService.deleteTemplate(
        ownTemplate.id,
        dietitianAuth.user
      );

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/deactivated/i);

      // Template should still exist but be inactive
      const found = await db.ConsultationTemplate.findByPk(ownTemplate.id);
      expect(found).not.toBeNull();
      expect(found.is_active).toBe(false);
    });

    it('should throw "Template not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationTemplateService.deleteTemplate(fakeId, adminAuth.user)
      ).rejects.toThrow('Template not found');
    });

    it('should throw permission error when non-owner dietitian tries to delete', async () => {
      await expect(
        consultationTemplateService.deleteTemplate(
          otherTemplate.id,
          dietitianAuth.user
        )
      ).rejects.toThrow('You do not have permission to delete this template');
    });
  });

  // ================================================================
  // duplicateTemplate
  // ================================================================
  describe('duplicateTemplate', () => {
    let originalTemplate;

    beforeEach(async () => {
      originalTemplate = await createTemplateInDb(
        {
          name: 'Original',
          description: 'Original description',
          template_type: 'consultation',
          visibility: 'shared',
          is_default: false,
          color: '#aabbcc'
        },
        dietitianAuth.user.id
      );
      await addItemToTemplate(originalTemplate.id, {
        item_type: 'instruction',
        instruction_title: 'Step 1',
        instruction_content: 'Do this first',
        display_order: 0
      });
      await addItemToTemplate(originalTemplate.id, {
        item_type: 'instruction',
        instruction_title: 'Step 2',
        instruction_content: 'Do this second',
        display_order: 1
      });
    });

    it('should create a copy with all items', async () => {
      const result = await consultationTemplateService.duplicateTemplate(
        originalTemplate.id,
        null,
        dietitian2Auth.user.id
      );

      expect(result).toBeDefined();
      expect(result.items.length).toBe(2);
    });

    it('should use default name "{original} (Copy)" when no name is provided', async () => {
      const result = await consultationTemplateService.duplicateTemplate(
        originalTemplate.id,
        null,
        dietitianAuth.user.id
      );

      expect(result.name).toBe('Original (Copy)');
    });

    it('should use custom name when provided', async () => {
      const result = await consultationTemplateService.duplicateTemplate(
        originalTemplate.id,
        'My Custom Copy',
        dietitianAuth.user.id
      );

      expect(result.name).toBe('My Custom Copy');
    });

    it('should set visibility to "private" on the duplicate', async () => {
      const result = await consultationTemplateService.duplicateTemplate(
        originalTemplate.id,
        null,
        dietitian2Auth.user.id
      );

      // Original is shared, but clone should be private
      expect(result.visibility).toBe('private');
    });

    it('should set is_default to false on the duplicate', async () => {
      // First make the original default
      await originalTemplate.update({ is_default: true });

      const result = await consultationTemplateService.duplicateTemplate(
        originalTemplate.id,
        null,
        dietitianAuth.user.id
      );

      expect(result.is_default).toBe(false);
    });

    it('should assign duplicate to the requesting user', async () => {
      const result = await consultationTemplateService.duplicateTemplate(
        originalTemplate.id,
        null,
        dietitian2Auth.user.id
      );

      expect(result.created_by).toBe(dietitian2Auth.user.id);
    });

    it('should copy all item fields from original', async () => {
      const result = await consultationTemplateService.duplicateTemplate(
        originalTemplate.id,
        null,
        dietitianAuth.user.id
      );

      const titles = result.items.map(i => i.instruction_title);
      expect(titles).toContain('Step 1');
      expect(titles).toContain('Step 2');
    });

    it('should preserve description, template_type, and color from original', async () => {
      const result = await consultationTemplateService.duplicateTemplate(
        originalTemplate.id,
        null,
        dietitianAuth.user.id
      );

      expect(result.description).toBe('Original description');
      expect(result.template_type).toBe('consultation');
      expect(result.color).toBe('#aabbcc');
    });

    it('should throw "Template not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationTemplateService.duplicateTemplate(fakeId, null, dietitianAuth.user.id)
      ).rejects.toThrow('Template not found');
    });

    it('should create a truly independent copy (changes to copy do not affect original)', async () => {
      const copy = await consultationTemplateService.duplicateTemplate(
        originalTemplate.id,
        null,
        dietitianAuth.user.id
      );

      // Update copy name — original should be unchanged
      await db.ConsultationTemplate.update(
        { name: 'Changed Copy Name' },
        { where: { id: copy.id } }
      );

      const original = await db.ConsultationTemplate.findByPk(originalTemplate.id);
      expect(original.name).toBe('Original');
    });
  });

  // ================================================================
  // addItem / removeItem
  // ================================================================
  describe('addItem', () => {
    let template;

    beforeEach(async () => {
      template = await createTemplateInDb(
        { name: 'Template For Items', visibility: 'private' },
        dietitianAuth.user.id
      );
    });

    it('should add an item to a template', async () => {
      const result = await consultationTemplateService.addItem(
        template.id,
        {
          item_type: 'instruction',
          instruction_title: 'New Step',
          instruction_content: 'Do something',
          display_order: 0
        },
        dietitianAuth.user
      );

      expect(result).toBeDefined();
      expect(result.item_type).toBe('instruction');
      expect(result.instruction_title).toBe('New Step');
      expect(result.template_id).toBe(template.id);
    });

    it('should automatically set display_order after existing items', async () => {
      // Add first item at order 0
      await consultationTemplateService.addItem(
        template.id,
        { item_type: 'instruction', instruction_title: 'First', display_order: 0 },
        dietitianAuth.user
      );

      // Add second item without specifying display_order
      const second = await consultationTemplateService.addItem(
        template.id,
        { item_type: 'instruction', instruction_title: 'Second' },
        dietitianAuth.user
      );

      // Should auto-append after the max (0), so display_order = 1
      expect(second.display_order).toBe(1);
    });

    it('should throw "Template not found" when template does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationTemplateService.addItem(
          fakeId,
          { item_type: 'instruction', instruction_title: 'X' },
          dietitianAuth.user
        )
      ).rejects.toThrow('Template not found');
    });

    it('should throw permission error when non-owner dietitian tries to add item', async () => {
      await expect(
        consultationTemplateService.addItem(
          template.id,
          { item_type: 'instruction', instruction_title: 'X' },
          dietitian2Auth.user
        )
      ).rejects.toThrow('You do not have permission to update this template');
    });

    it('should allow admin to add item to any template', async () => {
      const result = await consultationTemplateService.addItem(
        template.id,
        { item_type: 'instruction', instruction_title: 'Admin Added', display_order: 0 },
        adminAuth.user
      );

      expect(result.instruction_title).toBe('Admin Added');
    });
  });

  describe('removeItem', () => {
    let template, existingItem;

    beforeEach(async () => {
      template = await createTemplateInDb(
        { name: 'Template To Remove From', visibility: 'private' },
        dietitianAuth.user.id
      );
      existingItem = await addItemToTemplate(template.id, {
        instruction_title: 'To Be Removed',
        display_order: 0
      });
    });

    it('should remove an item from a template', async () => {
      const result = await consultationTemplateService.removeItem(
        existingItem.id,
        dietitianAuth.user
      );

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/removed/i);

      const found = await db.ConsultationTemplateItem.findByPk(existingItem.id);
      expect(found).toBeNull();
    });

    it('should throw "Item not found" when item does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationTemplateService.removeItem(fakeId, dietitianAuth.user)
      ).rejects.toThrow('Item not found');
    });

    it('should throw permission error when non-owner tries to remove item', async () => {
      await expect(
        consultationTemplateService.removeItem(existingItem.id, dietitian2Auth.user)
      ).rejects.toThrow('You do not have permission to delete this item');
    });

    it('should allow admin to remove item from any template', async () => {
      const result = await consultationTemplateService.removeItem(
        existingItem.id,
        adminAuth.user
      );

      expect(result.success).toBe(true);
    });
  });

  // ================================================================
  // enrichTemplateItems (helper)
  // ================================================================
  describe('enrichTemplateItems', () => {
    it('should return empty array for null input', async () => {
      const result = await consultationTemplateService.enrichTemplateItems(null);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty array input', async () => {
      const result = await consultationTemplateService.enrichTemplateItems([]);

      expect(result).toEqual([]);
    });

    it('should return instruction items as-is (no reference_id enrichment)', async () => {
      const template = await createTemplateInDb({}, dietitianAuth.user.id);
      const item = await addItemToTemplate(template.id, {
        item_type: 'instruction',
        instruction_title: 'Some Instruction',
        instruction_content: 'Details here',
        display_order: 0
      });

      const result = await consultationTemplateService.enrichTemplateItems([item]);

      expect(result.length).toBe(1);
      expect(result[0].item_type).toBe('instruction');
      expect(result[0].instruction_title).toBe('Some Instruction');
      // No category or measure key added
      expect(result[0].category).toBeUndefined();
      expect(result[0].measure).toBeUndefined();
    });

    it('should pass through category items without reference_id without crashing', async () => {
      const template = await createTemplateInDb({}, dietitianAuth.user.id);
      const item = await addItemToTemplate(template.id, {
        item_type: 'category',
        reference_id: null,
        instruction_title: null,
        display_order: 0
      });

      // reference_id is null so no DB lookup is performed
      const result = await consultationTemplateService.enrichTemplateItems([item]);

      expect(result.length).toBe(1);
      expect(result[0].item_type).toBe('category');
    });

    it('should pass through measure items without reference_id without crashing', async () => {
      const template = await createTemplateInDb({}, dietitianAuth.user.id);
      const item = await addItemToTemplate(template.id, {
        item_type: 'measure',
        reference_id: null,
        instruction_title: null,
        display_order: 0
      });

      const result = await consultationTemplateService.enrichTemplateItems([item]);

      expect(result.length).toBe(1);
      expect(result[0].item_type).toBe('measure');
    });

    it('should set category to null when reference_id does not match a real category', async () => {
      const template = await createTemplateInDb({}, dietitianAuth.user.id);
      const item = await db.ConsultationTemplateItem.create({
        template_id: template.id,
        item_type: 'category',
        reference_id: '00000000-0000-0000-0000-000000000099',
        display_order: 0,
        is_required: false
      });

      const result = await consultationTemplateService.enrichTemplateItems([item]);

      expect(result[0].category).toBeNull();
    });

    it('should set measure to null when reference_id does not match a real measure', async () => {
      const template = await createTemplateInDb({}, dietitianAuth.user.id);
      const item = await db.ConsultationTemplateItem.create({
        template_id: template.id,
        item_type: 'measure',
        reference_id: '00000000-0000-0000-0000-000000000099',
        display_order: 0,
        is_required: false
      });

      const result = await consultationTemplateService.enrichTemplateItems([item]);

      expect(result[0].measure).toBeNull();
    });

    it('should handle plain objects (not Sequelize instances) via spread fallback', async () => {
      const plainItem = {
        item_type: 'instruction',
        reference_id: null,
        instruction_title: 'Plain',
        instruction_content: 'No toJSON method',
        display_order: 0
      };

      const result = await consultationTemplateService.enrichTemplateItems([plainItem]);

      expect(result.length).toBe(1);
      expect(result[0].instruction_title).toBe('Plain');
    });
  });

  // ================================================================
  // reorderItems
  // ================================================================
  describe('reorderItems', () => {
    let template, item1, item2, item3;

    beforeEach(async () => {
      template = await createTemplateInDb(
        { name: 'Reorder Template' },
        dietitianAuth.user.id
      );
      item1 = await addItemToTemplate(template.id, { instruction_title: 'A', display_order: 0 });
      item2 = await addItemToTemplate(template.id, { instruction_title: 'B', display_order: 1 });
      item3 = await addItemToTemplate(template.id, { instruction_title: 'C', display_order: 2 });
    });

    it('should reorder items and return success', async () => {
      const result = await consultationTemplateService.reorderItems(
        template.id,
        [item3.id, item1.id, item2.id],
        dietitianAuth.user
      );

      expect(result.success).toBe(true);

      const updatedItem3 = await db.ConsultationTemplateItem.findByPk(item3.id);
      const updatedItem1 = await db.ConsultationTemplateItem.findByPk(item1.id);
      const updatedItem2 = await db.ConsultationTemplateItem.findByPk(item2.id);

      expect(updatedItem3.display_order).toBe(0);
      expect(updatedItem1.display_order).toBe(1);
      expect(updatedItem2.display_order).toBe(2);
    });

    it('should throw "Template not found" for invalid template id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        consultationTemplateService.reorderItems(fakeId, [item1.id], dietitianAuth.user)
      ).rejects.toThrow('Template not found');
    });

    it('should throw permission error when non-owner tries to reorder', async () => {
      await expect(
        consultationTemplateService.reorderItems(
          template.id,
          [item1.id, item2.id, item3.id],
          dietitian2Auth.user
        )
      ).rejects.toThrow('You do not have permission to update this template');
    });

    it('should allow admin to reorder items on any template', async () => {
      const result = await consultationTemplateService.reorderItems(
        template.id,
        [item2.id, item3.id, item1.id],
        adminAuth.user
      );

      expect(result.success).toBe(true);
    });
  });
});
