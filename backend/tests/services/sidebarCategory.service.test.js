/**
 * SidebarCategory Service Tests
 * Tests for sidebarCategory.service.js — CRUD, slugification, ordering, and guard rails.
 *
 * NOTE: SidebarCategory is NOT included in testDb.reset()'s model list, so we destroy
 * all rows manually inside beforeEach to guarantee a clean slate between tests.
 * SidebarMenuConfig rows must also be cleaned manually for the same reason.
 */

const testDb = require('../setup/testDb');

let db;
let sidebarCategoryService;

// ---------------------------------------------------------------------------
// Helper: create a minimal SidebarCategory directly via the ORM
// ---------------------------------------------------------------------------
async function createCategory(overrides = {}) {
  return db.SidebarCategory.create({
    key: overrides.key || `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: overrides.label || 'Test Category',
    icon: overrides.icon || '📁',
    section: overrides.section || 'main',
    display_order: overrides.display_order !== undefined ? overrides.display_order : 1,
    is_default_open: overrides.is_default_open !== undefined ? overrides.is_default_open : true,
    ...overrides
  });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('SidebarCategory Service', () => {
  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    sidebarCategoryService = require('../../src/services/sidebarCategory.service');
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();

    // Manual cleanup: these models are not in testDb.reset()'s model list
    await db.SidebarMenuConfig.destroy({ where: {}, force: true });
    await db.SidebarCategory.destroy({ where: {}, force: true });
  });

  // =========================================================================
  // getAllCategories
  // =========================================================================
  describe('getAllCategories', () => {
    it('should return an empty array when no categories exist', async () => {
      const result = await sidebarCategoryService.getAllCategories();

      expect(result).toEqual([]);
    });

    it('should return categories ordered by section then display_order', async () => {
      await createCategory({ key: 'settings-b', label: 'Settings B', section: 'settings', display_order: 2 });
      await createCategory({ key: 'main-a', label: 'Main A', section: 'main', display_order: 1 });
      await createCategory({ key: 'settings-a', label: 'Settings A', section: 'settings', display_order: 1 });
      await createCategory({ key: 'main-b', label: 'Main B', section: 'main', display_order: 2 });

      const result = await sidebarCategoryService.getAllCategories();

      // Sections sorted alphabetically: 'main' before 'settings'
      // Within each section: ascending display_order
      expect(result).toHaveLength(4);
      expect(result[0].key).toBe('main-a');
      expect(result[1].key).toBe('main-b');
      expect(result[2].key).toBe('settings-a');
      expect(result[3].key).toBe('settings-b');
    });

    it('should return all categories with expected fields', async () => {
      await createCategory({ key: 'patients', label: 'Patients', icon: '👤', section: 'main', display_order: 1 });

      const result = await sidebarCategoryService.getAllCategories();

      expect(result).toHaveLength(1);
      const cat = result[0];
      expect(cat.key).toBe('patients');
      expect(cat.label).toBe('Patients');
      expect(cat.icon).toBe('👤');
      expect(cat.section).toBe('main');
      expect(cat.display_order).toBe(1);
      expect(typeof cat.is_default_open).toBe('boolean');
    });
  });

  // =========================================================================
  // createCategory
  // =========================================================================
  describe('createCategory', () => {
    it('should create a category and auto-generate a key from the label', async () => {
      const result = await sidebarCategoryService.createCategory({ label: 'My Patients' });

      expect(result.id).toBeDefined();
      expect(result.key).toBe('my-patients');
      expect(result.label).toBe('My Patients');
    });

    it('should slugify a French label with accents correctly', async () => {
      const result = await sidebarCategoryService.createCategory({ label: 'Résultats Labo' });

      expect(result.key).toBe('resultats-labo');
    });

    it('should slugify a label with special characters', async () => {
      const result = await sidebarCategoryService.createCategory({ label: 'Paramètres & Config!' });

      expect(result.key).toBe('parametres-config');
    });

    it('should auto-assign display_order=1 for the first category in a section', async () => {
      const result = await sidebarCategoryService.createCategory({ label: 'First', section: 'main' });

      expect(result.display_order).toBe(1);
    });

    it('should auto-increment display_order for subsequent categories in the same section', async () => {
      await sidebarCategoryService.createCategory({ label: 'First' });
      const second = await sidebarCategoryService.createCategory({ label: 'Second' });
      const third = await sidebarCategoryService.createCategory({ label: 'Third' });

      expect(second.display_order).toBe(2);
      expect(third.display_order).toBe(3);
    });

    it('should track display_order independently per section', async () => {
      const mainFirst = await sidebarCategoryService.createCategory({ label: 'Main One', section: 'main' });
      const settingsFirst = await sidebarCategoryService.createCategory({ label: 'Settings One', section: 'settings' });
      const mainSecond = await sidebarCategoryService.createCategory({ label: 'Main Two', section: 'main' });

      expect(mainFirst.display_order).toBe(1);
      expect(settingsFirst.display_order).toBe(1); // First in 'settings'
      expect(mainSecond.display_order).toBe(2);
    });

    it('should default section to "main" when not provided', async () => {
      const result = await sidebarCategoryService.createCategory({ label: 'No Section' });

      expect(result.section).toBe('main');
    });

    it('should preserve section="settings" when provided', async () => {
      const result = await sidebarCategoryService.createCategory({
        label: 'Preferences',
        section: 'settings'
      });

      expect(result.section).toBe('settings');
    });

    it('should force unknown section values to "main"', async () => {
      const result = await sidebarCategoryService.createCategory({
        label: 'Bad Section',
        section: 'dashboard'
      });

      expect(result.section).toBe('main');
    });

    it('should default is_default_open to true', async () => {
      const result = await sidebarCategoryService.createCategory({ label: 'Open By Default' });

      expect(result.is_default_open).toBe(true);
    });

    it('should respect is_default_open=false when explicitly provided', async () => {
      const result = await sidebarCategoryService.createCategory({
        label: 'Closed Category',
        is_default_open: false
      });

      expect(result.is_default_open).toBe(false);
    });

    it('should use the provided icon', async () => {
      const result = await sidebarCategoryService.createCategory({
        label: 'Charts',
        icon: '📊'
      });

      expect(result.icon).toBe('📊');
    });

    it('should throw an error when label is missing', async () => {
      await expect(
        sidebarCategoryService.createCategory({ icon: '🔧' })
      ).rejects.toThrow('label is required');
    });

    it('should throw an error when label is an empty string', async () => {
      await expect(
        sidebarCategoryService.createCategory({ label: '' })
      ).rejects.toThrow('label is required');
    });

    it('should throw an error when label is only whitespace', async () => {
      await expect(
        sidebarCategoryService.createCategory({ label: '   ' })
      ).rejects.toThrow('label is required');
    });

    it('should handle duplicate key collision by appending -1, -2 suffixes', async () => {
      const first = await sidebarCategoryService.createCategory({ label: 'Nutrition' });
      const second = await sidebarCategoryService.createCategory({ label: 'Nutrition' });
      const third = await sidebarCategoryService.createCategory({ label: 'Nutrition' });

      expect(first.key).toBe('nutrition');
      expect(second.key).toBe('nutrition-1');
      expect(third.key).toBe('nutrition-2');
    });

    it('should trim whitespace from labels', async () => {
      const result = await sidebarCategoryService.createCategory({ label: '  Visits  ' });

      expect(result.label).toBe('Visits');
      expect(result.key).toBe('visits');
    });
  });

  // =========================================================================
  // updateCategory
  // =========================================================================
  describe('updateCategory', () => {
    let existingCategory;

    beforeEach(async () => {
      existingCategory = await createCategory({
        key: 'patients',
        label: 'Patients',
        icon: '👤',
        section: 'main',
        display_order: 1,
        is_default_open: true
      });
    });

    it('should update the label', async () => {
      const result = await sidebarCategoryService.updateCategory(
        existingCategory.id,
        { label: 'My Patients' }
      );

      expect(result.label).toBe('My Patients');
    });

    it('should update the icon', async () => {
      const result = await sidebarCategoryService.updateCategory(
        existingCategory.id,
        { icon: '🏥' }
      );

      expect(result.icon).toBe('🏥');
    });

    it('should update is_default_open from true to false', async () => {
      const result = await sidebarCategoryService.updateCategory(
        existingCategory.id,
        { is_default_open: false }
      );

      expect(result.is_default_open).toBe(false);
    });

    it('should update is_default_open from false to true', async () => {
      await existingCategory.update({ is_default_open: false });

      const result = await sidebarCategoryService.updateCategory(
        existingCategory.id,
        { is_default_open: true }
      );

      expect(result.is_default_open).toBe(true);
    });

    it('should not change the key even if key is passed in data', async () => {
      const result = await sidebarCategoryService.updateCategory(
        existingCategory.id,
        { key: 'hacked-key', label: 'Still Patients' }
      );

      // The key should remain unchanged — it is immutable
      expect(result.key).toBe('patients');
      expect(result.label).toBe('Still Patients');
    });

    it('should allow updating multiple fields at once', async () => {
      const result = await sidebarCategoryService.updateCategory(
        existingCategory.id,
        { label: 'Updated Label', icon: '🔬', is_default_open: false }
      );

      expect(result.label).toBe('Updated Label');
      expect(result.icon).toBe('🔬');
      expect(result.is_default_open).toBe(false);
    });

    it('should trim whitespace from updated label', async () => {
      const result = await sidebarCategoryService.updateCategory(
        existingCategory.id,
        { label: '  Trimmed  ' }
      );

      expect(result.label).toBe('Trimmed');
    });

    it('should throw "Category not found" for an invalid id', async () => {
      await expect(
        sidebarCategoryService.updateCategory(
          '00000000-0000-0000-0000-000000000000',
          { label: 'Ghost' }
        )
      ).rejects.toThrow('Category not found');
    });

    it('should return the updated category instance', async () => {
      const result = await sidebarCategoryService.updateCategory(
        existingCategory.id,
        { label: 'New Label' }
      );

      expect(result.id).toBe(existingCategory.id);
      expect(result.key).toBe(existingCategory.key);
    });
  });

  // =========================================================================
  // deleteCategory
  // =========================================================================
  describe('deleteCategory', () => {
    let existingCategory;

    beforeEach(async () => {
      existingCategory = await createCategory({
        key: 'deletable-cat',
        label: 'Deletable Category',
        section: 'main',
        display_order: 1
      });
    });

    it('should delete a category that has no menu items assigned', async () => {
      await sidebarCategoryService.deleteCategory(existingCategory.id);

      const found = await db.SidebarCategory.findByPk(existingCategory.id);
      expect(found).toBeNull();
    });

    it('should reduce the total count of categories by one after deletion', async () => {
      await createCategory({ key: 'other-cat', label: 'Other', section: 'main', display_order: 2 });

      const before = await sidebarCategoryService.getAllCategories();
      expect(before).toHaveLength(2);

      await sidebarCategoryService.deleteCategory(existingCategory.id);

      const after = await sidebarCategoryService.getAllCategories();
      expect(after).toHaveLength(1);
    });

    it('should throw "Category not found" for an invalid id', async () => {
      await expect(
        sidebarCategoryService.deleteCategory('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Category not found');
    });

    it('should throw an error with code HAS_ITEMS when menu items reference the category', async () => {
      // Create a SidebarMenuConfig item pointing at the category's key
      await db.SidebarMenuConfig.create({
        item_key: 'test-menu-item',
        section: 'main',
        display_order: 1,
        is_visible: true,
        allowed_roles: JSON.stringify(['ADMIN', 'DIETITIAN']),
        category_key: existingCategory.key
      });

      await expect(
        sidebarCategoryService.deleteCategory(existingCategory.id)
      ).rejects.toMatchObject({ code: 'HAS_ITEMS' });
    });

    it('should include the item count in the HAS_ITEMS error', async () => {
      await db.SidebarMenuConfig.create({
        item_key: 'menu-item-1',
        section: 'main',
        display_order: 1,
        is_visible: true,
        allowed_roles: JSON.stringify(['ADMIN']),
        category_key: existingCategory.key
      });
      await db.SidebarMenuConfig.create({
        item_key: 'menu-item-2',
        section: 'main',
        display_order: 2,
        is_visible: true,
        allowed_roles: JSON.stringify(['ADMIN']),
        category_key: existingCategory.key
      });

      let caughtError;
      try {
        await sidebarCategoryService.deleteCategory(existingCategory.id);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError.code).toBe('HAS_ITEMS');
      expect(caughtError.count).toBe(2);
    });

    it('should not delete the category when HAS_ITEMS error is thrown', async () => {
      await db.SidebarMenuConfig.create({
        item_key: 'guarded-item',
        section: 'main',
        display_order: 1,
        is_visible: true,
        allowed_roles: JSON.stringify(['ADMIN']),
        category_key: existingCategory.key
      });

      try {
        await sidebarCategoryService.deleteCategory(existingCategory.id);
      } catch {
        // Expected
      }

      const stillExists = await db.SidebarCategory.findByPk(existingCategory.id);
      expect(stillExists).not.toBeNull();
    });
  });

  // =========================================================================
  // reorderCategories
  // =========================================================================
  describe('reorderCategories', () => {
    let catA, catB, catC;

    beforeEach(async () => {
      catA = await createCategory({ key: 'cat-a', label: 'Cat A', section: 'main', display_order: 1 });
      catB = await createCategory({ key: 'cat-b', label: 'Cat B', section: 'main', display_order: 2 });
      catC = await createCategory({ key: 'cat-c', label: 'Cat C', section: 'main', display_order: 3 });
    });

    it('should reorder categories within a section using the provided ID array', async () => {
      // Reverse the order: C, B, A
      await sidebarCategoryService.reorderCategories('main', [catC.id, catB.id, catA.id]);

      await catA.reload();
      await catB.reload();
      await catC.reload();

      expect(catC.display_order).toBe(1);
      expect(catB.display_order).toBe(2);
      expect(catA.display_order).toBe(3);
    });

    it('should assign sequential display_order starting from 1', async () => {
      await sidebarCategoryService.reorderCategories('main', [catB.id, catC.id, catA.id]);

      await catA.reload();
      await catB.reload();
      await catC.reload();

      expect(catB.display_order).toBe(1);
      expect(catC.display_order).toBe(2);
      expect(catA.display_order).toBe(3);
    });

    it('should return all categories after reorder (via getAllCategories)', async () => {
      const result = await sidebarCategoryService.reorderCategories('main', [catC.id, catA.id, catB.id]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should return categories sorted by the new order', async () => {
      const result = await sidebarCategoryService.reorderCategories('main', [catC.id, catA.id, catB.id]);

      const mainCats = result.filter(c => c.section === 'main');
      const keys = mainCats.map(c => c.key);

      expect(keys.indexOf('cat-c')).toBeLessThan(keys.indexOf('cat-a'));
      expect(keys.indexOf('cat-a')).toBeLessThan(keys.indexOf('cat-b'));
    });

    it('should not change display_order of categories in a different section', async () => {
      const settingsCat = await createCategory({
        key: 'settings-cat',
        label: 'Settings Cat',
        section: 'settings',
        display_order: 1
      });

      await sidebarCategoryService.reorderCategories('main', [catC.id, catB.id, catA.id]);

      await settingsCat.reload();
      expect(settingsCat.display_order).toBe(1);
    });

    it('should handle reordering a single category in a section (no-op)', async () => {
      const onlyCat = await createCategory({
        key: 'solo',
        label: 'Solo',
        section: 'settings',
        display_order: 1
      });

      await sidebarCategoryService.reorderCategories('settings', [onlyCat.id]);

      await onlyCat.reload();
      expect(onlyCat.display_order).toBe(1);
    });

    it('should handle an empty orderedIds array without throwing', async () => {
      await expect(
        sidebarCategoryService.reorderCategories('main', [])
      ).resolves.toBeDefined();
    });
  });
});
