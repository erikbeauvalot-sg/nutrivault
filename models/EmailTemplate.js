module.exports = (sequelize, DataTypes) => {
  const EmailTemplate = sequelize.define('EmailTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 200]
      }
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[a-z0-9_-]+$/i,
        len: [3, 100]
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    category: {
      type: DataTypes.ENUM(
        'invoice',
        'document_share',
        'payment_reminder',
        'appointment_reminder',
        'follow_up',
        'general'
      ),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 500]
      }
    },
    body_html: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    body_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    available_variables: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: '[]'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'email_templates',
    timestamps: true,
    underscored: true,
    paranoid: true,
    hooks: {
      beforeValidate: async (instance, options) => {
        // Auto-generate slug from name if not provided
        if (!instance.slug && instance.name) {
          instance.slug = instance.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        }

        // Ensure slug is lowercase
        if (instance.slug) {
          instance.slug = instance.slug.toLowerCase();
        }
      },
      beforeUpdate: async (instance, options) => {
        // Increment version if content fields changed
        const contentFields = ['subject', 'body_html', 'body_text'];
        const hasContentChanges = contentFields.some(field => instance.changed(field));

        if (hasContentChanges) {
          instance.version = (instance.version || 1) + 1;
        }
      },
      beforeDestroy: async (instance, options) => {
        // Prevent deletion of system templates
        if (instance.is_system) {
          throw new Error('System templates cannot be deleted. Set is_active to false instead.');
        }
      }
    }
  });

  return EmailTemplate;
};
