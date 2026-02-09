/**
 * Discord Webhook Service
 *
 * Sends notifications to a Discord channel via webhook.
 * Uses a rate-limited queue (30/min) and caches settings from SystemSetting.
 */

const db = require('../../../models');

// Available events with French labels
const AVAILABLE_EVENTS = [
  { code: 'users.LOGIN', label: 'Connexion utilisateur', category: 'users' },
  { code: 'users.CREATE', label: 'Cr\u00e9ation utilisateur', category: 'users' },
  { code: 'users.DELETE', label: 'Suppression utilisateur', category: 'users' },
  { code: 'patients.CREATE', label: 'Cr\u00e9ation patient', category: 'patients' },
  { code: 'patients.DELETE', label: 'Suppression patient', category: 'patients' },
  { code: 'patients.UPDATE', label: 'Modification patient', category: 'patients' },
  { code: 'visits.CREATE', label: 'Cr\u00e9ation consultation', category: 'visits' },
  { code: 'visits.DELETE', label: 'Suppression consultation', category: 'visits' },
  { code: 'visits.UPDATE', label: 'Modification consultation', category: 'visits' },
  { code: 'recipes.CREATE', label: 'Cr\u00e9ation recette', category: 'recipes' },
  { code: 'recipes.UPDATE', label: 'Publication/modification recette', category: 'recipes' },
  { code: 'recipes.DELETE', label: 'Suppression recette', category: 'recipes' },
  { code: 'document.CREATE', label: 'T\u00e9l\u00e9chargement document', category: 'documents' },
  { code: 'document.SHARE', label: 'Partage document', category: 'documents' },
  { code: 'document.DELETE', label: 'Suppression document', category: 'documents' },
  { code: 'billing.CREATE', label: 'Cr\u00e9ation facture', category: 'billing' },
  { code: 'billing.DELETE', label: 'Suppression facture', category: 'billing' },
  { code: 'campaigns.CREATE', label: 'Cr\u00e9ation campagne', category: 'campaigns' },
  { code: 'campaigns.SEND', label: 'Envoi campagne', category: 'campaigns' },
  { code: 'campaigns.SCHEDULE', label: 'Planification campagne', category: 'campaigns' },
  { code: 'campaigns.CANCEL', label: 'Annulation campagne', category: 'campaigns' },
  { code: 'campaigns.DELETE', label: 'Suppression campagne', category: 'campaigns' }
];

// Settings cache
let settingsCache = null;
let settingsCacheTime = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

// Rate-limited queue
const messageQueue = [];
let processingQueue = false;
const RATE_LIMIT_MS = 2000; // 2 seconds between messages

/**
 * Load settings from SystemSetting, with 60s cache
 */
async function loadSettings() {
  const now = Date.now();
  if (settingsCache && (now - settingsCacheTime) < CACHE_TTL_MS) {
    return settingsCache;
  }

  try {
    const webhookUrl = await db.SystemSetting.getValue('discord_webhook_url');
    const enabledEvents = await db.SystemSetting.getValue('discord_enabled_events');

    settingsCache = {
      webhookUrl: webhookUrl || '',
      enabledEvents: Array.isArray(enabledEvents) ? enabledEvents : []
    };
    settingsCacheTime = now;
  } catch (err) {
    console.error('Discord: failed to load settings:', err.message);
    settingsCache = { webhookUrl: '', enabledEvents: [] };
    settingsCacheTime = now;
  }

  return settingsCache;
}

/**
 * Invalidate cached settings (call after admin updates)
 */
function invalidateCache() {
  settingsCache = null;
  settingsCacheTime = 0;
}

/**
 * Color by action type
 */
function getColorForAction(action) {
  switch (action) {
    case 'CREATE':   return 0x2ecc71; // green
    case 'DELETE':   return 0xe74c3c; // red
    case 'UPDATE':   return 0x3498db; // blue
    case 'LOGIN':    return 0xf1c40f; // yellow
    case 'SHARE':    return 0x9b59b6; // purple
    case 'SEND':     return 0xe67e22; // orange
    case 'SCHEDULE': return 0x1abc9c; // teal
    case 'CANCEL':   return 0xe74c3c; // red
    default:         return 0x95a5a6; // grey
  }
}

/**
 * Action label in French
 */
function getActionLabel(action) {
  const labels = {
    CREATE: 'Cr\u00e9ation',
    DELETE: 'Suppression',
    UPDATE: 'Modification',
    LOGIN: 'Connexion',
    SHARE: 'Partage',
    READ: 'Lecture',
    SEND: 'Envoi',
    SCHEDULE: 'Planification',
    CANCEL: 'Annulation'
  };
  return labels[action] || action;
}

/**
 * Resource type label in French
 */
function getResourceLabel(resourceType) {
  const labels = {
    users: 'Utilisateur',
    patients: 'Patient',
    visits: 'Consultation',
    recipes: 'Recette',
    document: 'Document',
    billing: 'Facture',
    campaigns: 'Campagne'
  };
  return labels[resourceType] || resourceType;
}

/**
 * Extract a short detail string from audit changes
 */
function extractDetail(auditData) {
  if (!auditData.changes) return null;

  let changes = auditData.changes;
  if (typeof changes === 'string') {
    try { changes = JSON.parse(changes); } catch { return null; }
  }

  // Show changed field names for UPDATE
  if (changes.after && typeof changes.after === 'object') {
    const keys = Object.keys(changes.after).filter(k => !['updated_at', 'created_at', 'id'].includes(k));
    if (keys.length > 0) return keys.slice(0, 5).join(', ');
  }

  // For CREATE, show a name if available
  if (changes.name) return changes.name;
  if (changes.username) return changes.username;
  if (changes.title) return changes.title;

  return null;
}

/**
 * Build a Discord embed from audit data
 */
function buildEmbed(auditData) {
  const action = auditData.action || 'UNKNOWN';
  const resourceType = auditData.resource_type || 'unknown';
  const resourceLabel = getResourceLabel(resourceType);
  const actionLabel = getActionLabel(action);

  const fields = [
    { name: 'Utilisateur', value: auditData.username || 'Syst\u00e8me', inline: true },
    { name: 'Ressource', value: resourceLabel, inline: true },
    { name: 'Action', value: actionLabel, inline: true }
  ];

  const detail = extractDetail(auditData);
  if (detail) {
    fields.push({ name: 'D\u00e9tail', value: detail, inline: false });
  }

  if (auditData.resource_id) {
    fields.push({ name: 'ID', value: `\`${auditData.resource_id}\``, inline: true });
  }

  return {
    title: `${actionLabel} \u2014 ${resourceLabel}`,
    color: getColorForAction(action),
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: 'NutriVault' }
  };
}

/**
 * Process the message queue with rate limiting
 */
async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;

  while (messageQueue.length > 0) {
    const { webhookUrl, embed } = messageQueue.shift();

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      });

      // Handle Discord rate limiting
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const retryAfter = (data.retry_after || 5) * 1000;
        messageQueue.unshift({ webhookUrl, embed }); // put it back
        await sleep(retryAfter);
        continue;
      }

      if (!res.ok) {
        console.error(`Discord webhook error: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error('Discord webhook fetch error:', err.message);
    }

    // Rate limit: wait between messages
    if (messageQueue.length > 0) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  processingQueue = false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main entry point: notify Discord of an audit event (fire-and-forget)
 */
async function notify(auditData) {
  try {
    const settings = await loadSettings();

    if (!settings.webhookUrl) return;

    const eventCode = `${auditData.resource_type}.${auditData.action}`;
    if (!settings.enabledEvents.includes(eventCode)) return;

    const embed = buildEmbed(auditData);
    messageQueue.push({ webhookUrl: settings.webhookUrl, embed });
    processQueue(); // don't await — fire and forget
  } catch (err) {
    console.error('[Discord] notify error:', err.message);
  }
}

/**
 * Send a test message to verify webhook URL
 */
async function sendTestMessage(webhookUrl) {
  if (!webhookUrl) throw new Error('Webhook URL is required');

  const embed = {
    title: 'NutriVault \u2014 Test de connexion',
    description: 'Le webhook Discord est correctement configur\u00e9 ! Les notifications seront envoy\u00e9es ici.',
    color: 0x2ecc71,
    fields: [
      { name: 'Statut', value: 'Connect\u00e9', inline: true },
      { name: 'Serveur', value: 'NutriVault', inline: true }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'NutriVault' }
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord API error ${res.status}: ${text}`);
  }

  return true;
}

module.exports = {
  notify,
  sendTestMessage,
  loadSettings,
  invalidateCache,
  buildEmbed,
  AVAILABLE_EVENTS
};
