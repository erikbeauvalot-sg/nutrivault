/**
 * SystemSetting Model
 * Stores application-wide configuration settings
 */

module.exports = (sequelize, DataTypes) => {
  const SystemSetting = sequelize.define('SystemSetting', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    setting_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Unique key for the setting'
    },
    setting_value: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Value of the setting (stored as string, parsed based on data_type)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Human-readable description of the setting'
    },
    data_type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
      allowNull: false,
      defaultValue: 'string',
      comment: 'Data type for proper parsing of setting_value'
    }
  }, {
    tableName: 'system_settings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['setting_key'],
        unique: true
      }
    ]
  });

  /**
   * Helper method to get a setting value with proper type parsing
   */
  SystemSetting.getValue = async function(key) {
    const setting = await this.findOne({
      where: { setting_key: key }
    });

    if (!setting) {
      return null;
    }

    // Parse value based on data type
    switch (setting.data_type) {
      case 'boolean':
        return setting.setting_value === 'true';
      case 'number':
        return parseFloat(setting.setting_value);
      case 'json':
        try {
          return JSON.parse(setting.setting_value);
        } catch (e) {
          console.error(`Failed to parse JSON setting: ${key}`, e);
          return null;
        }
      case 'string':
      default:
        return setting.setting_value;
    }
  };

  /**
   * Helper method to set a setting value
   */
  SystemSetting.setValue = async function(key, value) {
    const setting = await this.findOne({
      where: { setting_key: key }
    });

    if (!setting) {
      throw new Error(`Setting not found: ${key}`);
    }

    // Convert value to string based on data type
    let stringValue;
    switch (setting.data_type) {
      case 'boolean':
        stringValue = value ? 'true' : 'false';
        break;
      case 'number':
        stringValue = String(value);
        break;
      case 'json':
        stringValue = JSON.stringify(value);
        break;
      case 'string':
      default:
        stringValue = String(value);
    }

    setting.setting_value = stringValue;
    await setting.save();

    return setting;
  };

  return SystemSetting;
};
