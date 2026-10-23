/**
 * App Settings Controller
 * Application-wide feature toggles stored in system_settings.
 * Only the keys listed in FEATURE_SETTINGS are exposed: the table also holds
 * private values (e.g. the Discord webhook URL).
 */

const db = require('../../../models');

// key -> { data_type, default, description }
const FEATURE_SETTINGS = {
  patient_health_score_enabled: {
    data_type: 'boolean',
    default: false,
    description: 'Compute and display the health score on patient detail pages'
  }
};

async function getFeatureSetting(key) {
  const value = await db.SystemSetting.getValue(key);
  return value === null ? FEATURE_SETTINGS[key].default : value;
}

async function getAllFeatureSettings() {
  const settings = {};
  for (const key of Object.keys(FEATURE_SETTINGS)) {
    // eslint-disable-next-line no-await-in-loop
    settings[key] = await getFeatureSetting(key);
  }
  return settings;
}

const getSettings = async (req, res, next) => {
  try {
    res.json({ success: true, data: await getAllFeatureSettings() });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const updates = req.body || {};
    const unknown = Object.keys(updates).filter(key => !FEATURE_SETTINGS[key]);
    if (unknown.length > 0) {
      return res.status(400).json({ success: false, error: `Unknown setting(s): ${unknown.join(', ')}` });
    }

    for (const [key, value] of Object.entries(updates)) {
      const def = FEATURE_SETTINGS[key];
      if (def.data_type === 'boolean' && typeof value !== 'boolean') {
        return res.status(400).json({ success: false, error: `${key} must be a boolean` });
      }
      // eslint-disable-next-line no-await-in-loop
      const [setting] = await db.SystemSetting.findOrCreate({
        where: { setting_key: key },
        defaults: { data_type: def.data_type, description: def.description, setting_value: String(def.default) }
      });
      setting.setting_value = String(value);
      // eslint-disable-next-line no-await-in-loop
      await setting.save();
    }

    res.json({ success: true, data: await getAllFeatureSettings() });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getFeatureSetting
};
