/**
 * SidebarSection Service Tests
 */
const { v4: uuidv4 } = require('uuid');
const testDb = require('../setup/testDb');

let db;
let sidebarSectionService;

beforeAll(async () => {
  db = await testDb.init();
  await testDb.seedBaseData();
  sidebarSectionService = require('../../src/services/sidebarSection.service');
});

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  await testDb.reset();
  await testDb.seedBaseData();
  // SidebarSection/SidebarCategory are not in testDb.reset() list
  await db.SidebarCategory.destroy({ where: {}, force: true });
  await db.SidebarSection.destroy({ where: {}, force: true });
});

// ─────────────────────────────────────────
// getAllSections
// ─────────────────────────────────────────
describe('getAllSections', () => {
  it('returns empty array when no sections exist', async () => {
    const result = await sidebarSectionService.getAllSections();
    expect(result).toEqual([]);
  });

  it('returns sections ordered by display_order ASC', async () => {
    await db.SidebarSection.create({ id: uuidv4(), key: 'b-section', label: 'B', display_order: 2 });
    await db.SidebarSection.create({ id: uuidv4(), key: 'a-section', label: 'A', display_order: 1 });
    await db.SidebarSection.create({ id: uuidv4(), key: 'c-section', label: 'C', display_order: 3 });

    const result = await sidebarSectionService.getAllSections();
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe('a-section');
    expect(result[1].key).toBe('b-section');
    expect(result[2].key).toBe('c-section');
  });
});

// ─────────────────────────────────────────
// createSection
// ─────────────────────────────────────────
describe('createSection', () => {
  it('creates a section with a slugified key', async () => {
    const section = await sidebarSectionService.createSection({ label: 'My Section' });
    expect(section.key).toBe('my-section');
    expect(section.label).toBe('My Section');
  });

  it('strips French accents from key', async () => {
    const section = await sidebarSectionService.createSection({ label: 'Général Suivi' });
    expect(section.key).toBe('general-suivi');
  });

  it('assigns display_order = 1 for the first section', async () => {
    const section = await sidebarSectionService.createSection({ label: 'First' });
    expect(section.display_order).toBe(1);
  });

  it('auto-increments display_order for subsequent sections', async () => {
    const s1 = await sidebarSectionService.createSection({ label: 'Alpha' });
    const s2 = await sidebarSectionService.createSection({ label: 'Beta' });
    expect(s2.display_order).toBe(s1.display_order + 1);
  });

  it('sets is_default_open to true by default', async () => {
    const section = await sidebarSectionService.createSection({ label: 'Test' });
    expect(section.is_default_open).toBe(true);
  });

  it('respects is_default_open: false', async () => {
    const section = await sidebarSectionService.createSection({ label: 'Closed', is_default_open: false });
    expect(section.is_default_open).toBe(false);
  });

  it('uses default icon when none provided', async () => {
    const section = await sidebarSectionService.createSection({ label: 'NoIcon' });
    expect(section.icon).toBeDefined();
  });

  it('uses custom icon when provided', async () => {
    const section = await sidebarSectionService.createSection({ label: 'WithIcon', icon: '🌟' });
    expect(section.icon).toBe('🌟');
  });

  it('throws error when label is missing', async () => {
    await expect(sidebarSectionService.createSection({})).rejects.toThrow('label is required');
  });

  it('throws error when label is empty string', async () => {
    await expect(sidebarSectionService.createSection({ label: '' })).rejects.toThrow('label is required');
  });

  it('throws error when label is whitespace only', async () => {
    await expect(sidebarSectionService.createSection({ label: '   ' })).rejects.toThrow('label is required');
  });

  it('handles duplicate key with suffix', async () => {
    const s1 = await sidebarSectionService.createSection({ label: 'Nutrition' });
    const s2 = await sidebarSectionService.createSection({ label: 'Nutrition' });
    expect(s1.key).toBe('nutrition');
    expect(s2.key).toBe('nutrition-1');
  });
});

// ─────────────────────────────────────────
// updateSection
// ─────────────────────────────────────────
describe('updateSection', () => {
  it('updates label', async () => {
    const section = await sidebarSectionService.createSection({ label: 'Old Name' });
    const updated = await sidebarSectionService.updateSection(section.id, { label: 'New Name' });
    expect(updated.label).toBe('New Name');
  });

  it('updates icon', async () => {
    const section = await sidebarSectionService.createSection({ label: 'Test' });
    const updated = await sidebarSectionService.updateSection(section.id, { icon: '⚡' });
    expect(updated.icon).toBe('⚡');
  });

  it('updates is_default_open', async () => {
    const section = await sidebarSectionService.createSection({ label: 'Toggle', is_default_open: true });
    const updated = await sidebarSectionService.updateSection(section.id, { is_default_open: false });
    expect(updated.is_default_open).toBe(false);
  });

  it('key is immutable (ignored on update)', async () => {
    const section = await sidebarSectionService.createSection({ label: 'Fixed Key' });
    const originalKey = section.key;
    await sidebarSectionService.updateSection(section.id, { key: 'new-key', label: 'Updated' });
    await section.reload();
    expect(section.key).toBe(originalKey);
  });

  it('throws Section not found for invalid id', async () => {
    await expect(sidebarSectionService.updateSection(uuidv4(), { label: 'X' }))
      .rejects.toThrow('Section not found');
  });
});

// ─────────────────────────────────────────
// deleteSection
// ─────────────────────────────────────────
describe('deleteSection', () => {
  it('deletes a custom section with no categories', async () => {
    const section = await sidebarSectionService.createSection({ label: 'Custom' });
    await sidebarSectionService.deleteSection(section.id);
    const found = await db.SidebarSection.findByPk(section.id);
    expect(found).toBeNull();
  });

  it('throws Section not found for invalid id', async () => {
    await expect(sidebarSectionService.deleteSection(uuidv4()))
      .rejects.toThrow('Section not found');
  });

  it('prevents deleting built-in "main" section', async () => {
    const main = await db.SidebarSection.create({ id: uuidv4(), key: 'main', label: 'Main', display_order: 1 });
    const error = await sidebarSectionService.deleteSection(main.id).catch(e => e);
    expect(error.code).toBe('BUILTIN');
    expect(error.message).toMatch(/built-in/i);
  });

  it('prevents deleting built-in "settings" section', async () => {
    const settings = await db.SidebarSection.create({ id: uuidv4(), key: 'settings', label: 'Settings', display_order: 2 });
    const error = await sidebarSectionService.deleteSection(settings.id).catch(e => e);
    expect(error.code).toBe('BUILTIN');
  });

  it('throws HAS_CATEGORIES when categories are assigned to section', async () => {
    const section = await sidebarSectionService.createSection({ label: 'Custom Section' });
    // Create a category in this section
    await db.SidebarCategory.create({
      id: uuidv4(), key: 'test-cat', label: 'Test Cat', section: section.key, display_order: 1
    });
    const error = await sidebarSectionService.deleteSection(section.id).catch(e => e);
    expect(error.code).toBe('HAS_CATEGORIES');
    expect(error.count).toBe(1);
  });
});

// ─────────────────────────────────────────
// reorderSections
// ─────────────────────────────────────────
describe('reorderSections', () => {
  it('reorders sections correctly', async () => {
    const s1 = await sidebarSectionService.createSection({ label: 'First' });
    const s2 = await sidebarSectionService.createSection({ label: 'Second' });
    const s3 = await sidebarSectionService.createSection({ label: 'Third' });

    // Reverse order: s3, s1, s2
    await sidebarSectionService.reorderSections([s3.id, s1.id, s2.id]);

    await s3.reload(); await s1.reload(); await s2.reload();
    expect(s3.display_order).toBe(1);
    expect(s1.display_order).toBe(2);
    expect(s2.display_order).toBe(3);
  });

  it('returns all sections after reorder', async () => {
    const s1 = await sidebarSectionService.createSection({ label: 'A' });
    const s2 = await sidebarSectionService.createSection({ label: 'B' });
    const result = await sidebarSectionService.reorderSections([s2.id, s1.id]);
    expect(result).toHaveLength(2);
  });

  it('handles empty array without error', async () => {
    await expect(sidebarSectionService.reorderSections([])).resolves.not.toThrow();
  });
});
