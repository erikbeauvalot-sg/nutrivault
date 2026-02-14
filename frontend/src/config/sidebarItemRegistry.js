/**
 * Sidebar Item Registry
 * Static registry of all sidebar items with paths, icons, and label keys.
 * The DB only stores item_key, section, display_order, is_visible, allowed_roles.
 * Paths and labels live here to avoid storing UI concerns in the database.
 */

/** Group ordering and i18n keys for main section grouping */
export const GROUP_ORDER = ['clinic', 'nutrition', 'communication', 'finance', 'data', 'admin'];
export const GROUP_LABELS = {
  clinic: 'sidebar.groups.clinic',
  nutrition: 'sidebar.groups.nutrition',
  communication: 'sidebar.groups.communication',
  finance: 'sidebar.groups.finance',
  data: 'sidebar.groups.data',
  admin: 'sidebar.groups.admin',
};

const SIDEBAR_ITEMS = {
  // Main section
  dashboard:    { path: '/dashboard',    icon: '📊', labelKey: 'navigation.dashboard',   section: 'main', group: 'clinic' },
  patients:     { path: '/patients',     icon: '👥', labelKey: 'navigation.patients',    section: 'main', group: 'clinic' },
  clients:      { path: '/clients',      icon: '🏢', labelKey: 'navigation.clients',    section: 'main', group: 'clinic' },
  agenda:       { path: '/agenda',       icon: '🗓️', labelKey: 'navigation.agenda',      section: 'main', group: 'clinic' },
  visits:       { path: '/visits',       icon: '📋', labelKey: 'navigation.visits',      section: 'main', group: 'clinic' },
  recipes:      { path: '/recipes',      icon: '🍽️', labelKey: 'navigation.recipes',     section: 'main', group: 'nutrition' },
  campaigns:    { path: '/campaigns',    icon: '📧', labelKey: 'navigation.campaigns',   section: 'main', group: 'communication' },
  messages:     { path: '/messages',     icon: '💬', labelKey: 'navigation.messages',    section: 'main', group: 'communication' },
  billing:      { path: '/billing',      icon: '💰', labelKey: 'navigation.billing',     section: 'main', group: 'finance' },
  quotes:       { path: '/quotes',       icon: '📝', labelKey: 'navigation.quotes',     section: 'main', group: 'finance' },
  finance:      { path: '/finance',      icon: '💹', labelKey: 'navigation.finance',    section: 'main', group: 'finance' },
  documents:    { path: '/documents',    icon: '📄', labelKey: 'documents.title',        section: 'main', group: 'data' },
  analytics:    { path: '/analytics',    icon: '📈', labelKey: 'analytics.title',        section: 'main', group: 'data' },
  users:        { path: '/users',        icon: '👤', labelKey: 'navigation.users',       section: 'main', group: 'admin' },

  // Settings section
  myProfile:    { dynamicPath: (user) => `/users/${user?.id}`, icon: '👤', labelKey: 'navigation.myProfile', section: 'settings' },
  themes:       { path: '/settings/themes',       icon: '🎨', labelKey: 'navigation.themes',              section: 'settings' },
  'email-templates': { path: '/settings/email-templates', icon: '✉️', labelKey: 'navigation.emailTemplates', section: 'settings' },
  'email-config':    { path: '/settings/email-config',    icon: '📡', labelKey: 'navigation.emailConfig',    section: 'settings' },
  'invoice-customization': { path: '/settings/invoice-customization', icon: '🖼️', labelKey: 'navigation.invoiceCustomization', section: 'settings' },
  'custom-fields':   { path: '/settings/custom-fields',   icon: '🔧', labelKey: 'navigation.customFields',  section: 'settings' },
  measures:          { path: '/settings/measures',         icon: '📏', labelKey: 'navigation.measures',      section: 'settings' },
  roles:             { path: '/settings/roles',            icon: '🔐', labelKey: 'navigation.roles',         section: 'settings' },
  'ai-config':       { path: '/settings/ai-config',       icon: '🤖', labelKey: 'navigation.aiConfig',      section: 'settings' },
  'scheduled-tasks': { path: '/settings/scheduled-tasks',  icon: '⏱️', labelKey: 'navigation.scheduledTasks', section: 'settings' },
  discord:           { path: '/settings/discord',          icon: '🔔', labelKey: 'navigation.discord',       section: 'settings' },
  'sidebar-config':  { path: '/settings/sidebar-config',   icon: '☰',  labelKey: 'navigation.sidebarConfig', section: 'settings' },
};

/**
 * Get the static config for an item key, with fallback
 */
export function getItemConfig(itemKey) {
  return SIDEBAR_ITEMS[itemKey] || null;
}

/**
 * Get path for an item, resolving dynamic paths
 */
export function getItemPath(itemKey, user) {
  const config = SIDEBAR_ITEMS[itemKey];
  if (!config) return null;
  if (config.dynamicPath) return config.dynamicPath(user);
  return config.path;
}

/**
 * Get default DB config for items not found in the database
 */
export function getDefaultConfig(itemKey) {
  const config = SIDEBAR_ITEMS[itemKey];
  if (!config) return null;
  return {
    item_key: itemKey,
    section: config.section,
    display_order: 999,
    is_visible: true,
    allowed_roles: ['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER']
  };
}

export default SIDEBAR_ITEMS;
