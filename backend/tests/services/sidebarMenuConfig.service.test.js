/**
 * SidebarMenuConfig Service Tests
 */
const { v4: uuidv4 } = require('uuid');
const testDb = require('../setup/testDb');

let db;
let sidebarMenuConfigService;

beforeAll(async () => {
  db = await testDb.init();
  await testDb.seedBaseData();
  sidebarMenuConfigService = require('../../src/services/sidebarMenuConfig.service');
});

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  await testDb.reset();
  await testDb.seedBaseData();
  // SidebarMenuConfig is not in testDb.reset() list
  await db.SidebarMenuConfig.destroy({ where: {}, force: true });
});

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
async function createItem(overrides = {}) {
  return db.SidebarMenuConfig.create({
    id: uuidv4(),
    item_key: overrides.item_key || `item-${uuidv4().slice(0, 8)}`,
    section: overrides.section || 'main',
    display_order: overrides.display_order || 1,
    is_visible: overrides.is_visible !== undefined ? overrides.is_visible : true,
    allowed_roles: overrides.allowed_roles || ['ADMIN', 'DIETITIAN'],
    category_key: overrides.category_key || null,
  });
}

// ─────────────────────────────────────────
// DEFAULT_ITEMS
// ─────────────────────────────────────────
describe('DEFAULT_ITEMS', () => {
  it('exports the DEFAULT_ITEMS constant', () => {
    expect(sidebarMenuConfigService.DEFAULT_ITEMS).toBeDefined();
    expect(Array.isArray(sidebarMenuConfigService.DEFAULT_ITEMS)).toBe(true);
  });

  it('has 28 items', () => {
    expect(sidebarMenuConfigService.DEFAULT_ITEMS).toHaveLength(28);
  });

  it('each item has required fields', () => {
    for (const item of sidebarMenuConfigService.DEFAULT_ITEMS) {
      expect(item.item_key).toBeDefined();
      expect(item.section).toBeDefined();
      expect(item.display_order).toBeDefined();
      expect(Array.isArray(item.allowed_roles)).toBe(true);
    }
  });

  it('contains main and settings sections', () => {
    const sections = [...new Set(sidebarMenuConfigService.DEFAULT_ITEMS.map(i => i.section))];
    expect(sections).toContain('main');
    expect(sections).toContain('settings');
  });
});

// ─────────────────────────────────────────
// getAllConfigs
// ─────────────────────────────────────────
describe('getAllConfigs', () => {
  it('returns empty array when no configs exist', async () => {
    const result = await sidebarMenuConfigService.getAllConfigs();
    expect(result).toEqual([]);
  });

  it('returns configs sorted by section ASC then display_order ASC', async () => {
    await createItem({ item_key: 'z-main-3', section: 'main', display_order: 3 });
    await createItem({ item_key: 'a-main-1', section: 'main', display_order: 1 });
    await createItem({ item_key: 'b-settings-1', section: 'settings', display_order: 1 });
    await createItem({ item_key: 'a-main-2', section: 'main', display_order: 2 });

    const result = await sidebarMenuConfigService.getAllConfigs();
    expect(result).toHaveLength(4);

    // 'main' < 'settings' alphabetically
    expect(result[0].item_key).toBe('a-main-1');
    expect(result[1].item_key).toBe('a-main-2');
    expect(result[2].item_key).toBe('z-main-3');
    expect(result[3].item_key).toBe('b-settings-1');
  });

  it('returns configs with correct fields', async () => {
    await createItem({
      item_key: 'test-item',
      section: 'main',
      display_order: 1,
      is_visible: true,
      allowed_roles: ['ADMIN'],
      category_key: 'clinic',
    });

    const result = await sidebarMenuConfigService.getAllConfigs();
    expect(result).toHaveLength(1);
    expect(result[0].item_key).toBe('test-item');
    expect(result[0].section).toBe('main');
    expect(result[0].display_order).toBe(1);
    expect(result[0].is_visible).toBe(true);
    expect(result[0].allowed_roles).toEqual(['ADMIN']);
    expect(result[0].category_key).toBe('clinic');
  });
});

// ─────────────────────────────────────────
// bulkUpdate
// ─────────────────────────────────────────
describe('bulkUpdate', () => {
  it('updates display_order for existing items', async () => {
    await createItem({ item_key: 'item-a', section: 'main', display_order: 1 });
    await createItem({ item_key: 'item-b', section: 'main', display_order: 2 });

    await sidebarMenuConfigService.bulkUpdate([
      { item_key: 'item-a', display_order: 5 },
      { item_key: 'item-b', display_order: 3 },
    ]);

    const a = await db.SidebarMenuConfig.findOne({ where: { item_key: 'item-a' } });
    const b = await db.SidebarMenuConfig.findOne({ where: { item_key: 'item-b' } });
    expect(a.display_order).toBe(5);
    expect(b.display_order).toBe(3);
  });

  it('updates is_visible for items', async () => {
    await createItem({ item_key: 'visible-item', is_visible: true });

    await sidebarMenuConfigService.bulkUpdate([
      { item_key: 'visible-item', is_visible: false },
    ]);

    const item = await db.SidebarMenuConfig.findOne({ where: { item_key: 'visible-item' } });
    expect(item.is_visible).toBe(false);
  });

  it('updates allowed_roles for items', async () => {
    await createItem({ item_key: 'roles-item', allowed_roles: ['ADMIN', 'DIETITIAN'] });

    await sidebarMenuConfigService.bulkUpdate([
      { item_key: 'roles-item', allowed_roles: ['ADMIN'] },
    ]);

    const item = await db.SidebarMenuConfig.findOne({ where: { item_key: 'roles-item' } });
    expect(item.allowed_roles).toEqual(['ADMIN']);
  });

  it('updates section for items', async () => {
    await createItem({ item_key: 'move-item', section: 'main' });

    await sidebarMenuConfigService.bulkUpdate([
      { item_key: 'move-item', section: 'settings' },
    ]);

    const item = await db.SidebarMenuConfig.findOne({ where: { item_key: 'move-item' } });
    expect(item.section).toBe('settings');
  });

  it('updates category_key for items', async () => {
    await createItem({ item_key: 'cat-item', category_key: 'old-cat' });

    await sidebarMenuConfigService.bulkUpdate([
      { item_key: 'cat-item', category_key: 'new-cat' },
    ]);

    const item = await db.SidebarMenuConfig.findOne({ where: { item_key: 'cat-item' } });
    expect(item.category_key).toBe('new-cat');
  });

  it('returns all configs after update', async () => {
    await createItem({ item_key: 'item-x', display_order: 1 });
    await createItem({ item_key: 'item-y', display_order: 2 });

    const result = await sidebarMenuConfigService.bulkUpdate([
      { item_key: 'item-x', display_order: 2 },
    ]);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('handles empty array without error', async () => {
    await createItem({ item_key: 'untouched-item' });

    const result = await sidebarMenuConfigService.bulkUpdate([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('ignores unknown item_keys silently', async () => {
    await createItem({ item_key: 'real-item', display_order: 1 });

    // Passing a non-existent item_key should not throw
    await expect(
      sidebarMenuConfigService.bulkUpdate([{ item_key: 'ghost-item', display_order: 99 }])
    ).resolves.not.toThrow();

    // Real item untouched
    const item = await db.SidebarMenuConfig.findOne({ where: { item_key: 'real-item' } });
    expect(item.display_order).toBe(1);
  });

  it('only updates fields that are provided', async () => {
    await createItem({
      item_key: 'partial-item',
      display_order: 5,
      is_visible: true,
      allowed_roles: ['ADMIN', 'DIETITIAN'],
    });

    // Only update display_order
    await sidebarMenuConfigService.bulkUpdate([
      { item_key: 'partial-item', display_order: 10 },
    ]);

    const item = await db.SidebarMenuConfig.findOne({ where: { item_key: 'partial-item' } });
    expect(item.display_order).toBe(10);
    expect(item.is_visible).toBe(true); // untouched
    expect(item.allowed_roles).toEqual(['ADMIN', 'DIETITIAN']); // untouched
  });
});

// ─────────────────────────────────────────
// reorderItems
// ─────────────────────────────────────────
describe('reorderItems', () => {
  it('reorders items within a section', async () => {
    await createItem({ item_key: 'first', section: 'main', display_order: 1 });
    await createItem({ item_key: 'second', section: 'main', display_order: 2 });
    await createItem({ item_key: 'third', section: 'main', display_order: 3 });

    await sidebarMenuConfigService.reorderItems('main', [
      { item_key: 'third', display_order: 1 },
      { item_key: 'first', display_order: 2 },
      { item_key: 'second', display_order: 3 },
    ]);

    const first = await db.SidebarMenuConfig.findOne({ where: { item_key: 'first' } });
    const second = await db.SidebarMenuConfig.findOne({ where: { item_key: 'second' } });
    const third = await db.SidebarMenuConfig.findOne({ where: { item_key: 'third' } });

    expect(third.display_order).toBe(1);
    expect(first.display_order).toBe(2);
    expect(second.display_order).toBe(3);
  });

  it('only updates items within the given section', async () => {
    await createItem({ item_key: 'main-item', section: 'main', display_order: 1 });
    await createItem({ item_key: 'settings-item', section: 'settings', display_order: 1 });

    await sidebarMenuConfigService.reorderItems('main', [
      { item_key: 'main-item', display_order: 5 },
    ]);

    const mainItem = await db.SidebarMenuConfig.findOne({ where: { item_key: 'main-item' } });
    const settingsItem = await db.SidebarMenuConfig.findOne({ where: { item_key: 'settings-item' } });

    expect(mainItem.display_order).toBe(5);
    expect(settingsItem.display_order).toBe(1); // untouched
  });

  it('returns all configs after reorder', async () => {
    await createItem({ item_key: 'r-item-1', section: 'main', display_order: 1 });
    await createItem({ item_key: 'r-item-2', section: 'main', display_order: 2 });

    const result = await sidebarMenuConfigService.reorderItems('main', [
      { item_key: 'r-item-2', display_order: 1 },
      { item_key: 'r-item-1', display_order: 2 },
    ]);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('handles empty orderData without error', async () => {
    await createItem({ item_key: 'stable-item', section: 'main', display_order: 1 });

    await expect(
      sidebarMenuConfigService.reorderItems('main', [])
    ).resolves.not.toThrow();

    const item = await db.SidebarMenuConfig.findOne({ where: { item_key: 'stable-item' } });
    expect(item.display_order).toBe(1);
  });

  it('works on settings section', async () => {
    await createItem({ item_key: 'settings-a', section: 'settings', display_order: 1 });
    await createItem({ item_key: 'settings-b', section: 'settings', display_order: 2 });

    await sidebarMenuConfigService.reorderItems('settings', [
      { item_key: 'settings-b', display_order: 1 },
      { item_key: 'settings-a', display_order: 2 },
    ]);

    const a = await db.SidebarMenuConfig.findOne({ where: { item_key: 'settings-a' } });
    const b = await db.SidebarMenuConfig.findOne({ where: { item_key: 'settings-b' } });
    expect(b.display_order).toBe(1);
    expect(a.display_order).toBe(2);
  });
});

// ─────────────────────────────────────────
// resetToDefaults
// ─────────────────────────────────────────
describe('resetToDefaults', () => {
  it('creates all 28 default items', async () => {
    await sidebarMenuConfigService.resetToDefaults();
    const count = await db.SidebarMenuConfig.count();
    expect(count).toBe(28);
  });

  it('removes custom items before resetting', async () => {
    await createItem({ item_key: 'my-custom-item', section: 'main', display_order: 99 });

    await sidebarMenuConfigService.resetToDefaults();

    const custom = await db.SidebarMenuConfig.findOne({ where: { item_key: 'my-custom-item' } });
    expect(custom).toBeNull();
  });

  it('returns all configs after reset', async () => {
    const result = await sidebarMenuConfigService.resetToDefaults();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(28);
  });

  it('recreates defaults even if called multiple times', async () => {
    await sidebarMenuConfigService.resetToDefaults();
    await sidebarMenuConfigService.resetToDefaults();

    const count = await db.SidebarMenuConfig.count();
    expect(count).toBe(28);
  });

  it('sets is_visible to true for all defaults', async () => {
    await sidebarMenuConfigService.resetToDefaults();

    const hidden = await db.SidebarMenuConfig.count({ where: { is_visible: false } });
    expect(hidden).toBe(0);
  });

  it('creates items with correct sections', async () => {
    await sidebarMenuConfigService.resetToDefaults();

    const mainCount = await db.SidebarMenuConfig.count({ where: { section: 'main' } });
    const settingsCount = await db.SidebarMenuConfig.count({ where: { section: 'settings' } });

    const expectedMain = sidebarMenuConfigService.DEFAULT_ITEMS.filter(i => i.section === 'main').length;
    const expectedSettings = sidebarMenuConfigService.DEFAULT_ITEMS.filter(i => i.section === 'settings').length;

    expect(mainCount).toBe(expectedMain);
    expect(settingsCount).toBe(expectedSettings);
  });

  it('creates items with correct item_keys', async () => {
    await sidebarMenuConfigService.resetToDefaults();

    const dashboard = await db.SidebarMenuConfig.findOne({ where: { item_key: 'dashboard' } });
    expect(dashboard).not.toBeNull();
    expect(dashboard.section).toBe('main');
    expect(dashboard.display_order).toBe(1);

    const myProfile = await db.SidebarMenuConfig.findOne({ where: { item_key: 'myProfile' } });
    expect(myProfile).not.toBeNull();
    expect(myProfile.section).toBe('settings');
  });

  it('preserves allowed_roles from DEFAULT_ITEMS', async () => {
    await sidebarMenuConfigService.resetToDefaults();

    // 'users' is ADMIN-only
    const users = await db.SidebarMenuConfig.findOne({ where: { item_key: 'users' } });
    expect(users.allowed_roles).toEqual(['ADMIN']);

    // 'dashboard' is all roles
    const dashboard = await db.SidebarMenuConfig.findOne({ where: { item_key: 'dashboard' } });
    expect(dashboard.allowed_roles).toContain('ADMIN');
    expect(dashboard.allowed_roles).toContain('DIETITIAN');
    expect(dashboard.allowed_roles).toContain('ASSISTANT');
    expect(dashboard.allowed_roles).toContain('VIEWER');
  });

  it('preserves category_key from DEFAULT_ITEMS', async () => {
    await sidebarMenuConfigService.resetToDefaults();

    const dashboard = await db.SidebarMenuConfig.findOne({ where: { item_key: 'dashboard' } });
    expect(dashboard.category_key).toBe('clinic');

    const billing = await db.SidebarMenuConfig.findOne({ where: { item_key: 'billing' } });
    expect(billing.category_key).toBe('finance');
  });
});
