/**
 * Home page helper
 *
 * Resolves the sidebar entry a user lands on after login:
 * user setting -> role setting -> dashboard -> first visible menu entry.
 * Configured pages the user cannot see in the menu are skipped.
 */

const db = require('../../../models');

/**
 * Check that a home page value is a known sidebar entry (null clears it)
 *
 * @param {string|null} itemKey
 * @returns {Promise<boolean>}
 */
async function isValidHomePage(itemKey) {
  if (itemKey === null) return true;
  return (await db.SidebarMenuConfig.count({ where: { item_key: itemKey } })) > 0;
}

/**
 * @param {Object} user - User instance with its role loaded
 * @returns {Promise<string|null>} sidebar item_key, or null to use the client default
 */
async function resolveHomePage(user) {
  const roleName = user?.role?.name;
  if (!roleName || roleName === 'PATIENT') return null;

  const configs = await db.SidebarMenuConfig.findAll({
    where: { is_visible: true },
    order: [['section', 'ASC'], ['display_order', 'ASC']]
  });
  const visible = configs.filter(config => roleName === 'ADMIN' || (config.allowed_roles || []).includes(roleName));
  const visibleKeys = new Set(visible.map(config => config.item_key));

  for (const candidate of [user.home_page, user.role.home_page, 'dashboard']) {
    if (candidate && visibleKeys.has(candidate)) return candidate;
  }

  const first = visible.find(config => config.section === 'main') || visible[0];
  return first ? first.item_key : null;
}

module.exports = { isValidHomePage, resolveHomePage };
