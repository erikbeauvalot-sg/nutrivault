/**
 * InvoiceCustomization Model
 * Stores user-specific invoice template customization settings
 */

const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

module.exports = (sequelize) => {
  const InvoiceCustomization = sequelize.define(
    'InvoiceCustomization',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },

      // Logo
      logo_file_path: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      logo_width: {
        type: DataTypes.INTEGER,
        defaultValue: 150,
        allowNull: true,
        validate: {
          min: 50,
          max: 500
        }
      },
      logo_height: {
        type: DataTypes.INTEGER,
        defaultValue: 80,
        allowNull: true,
        validate: {
          min: 30,
          max: 300
        }
      },

      // Color Scheme
      primary_color: {
        type: DataTypes.STRING(7),
        defaultValue: '#3498db',
        allowNull: true,
        validate: {
          is: /^#[0-9A-Fa-f]{6}$/
        }
      },
      secondary_color: {
        type: DataTypes.STRING(7),
        defaultValue: '#2c3e50',
        allowNull: true,
        validate: {
          is: /^#[0-9A-Fa-f]{6}$/
        }
      },
      accent_color: {
        type: DataTypes.STRING(7),
        defaultValue: '#e74c3c',
        allowNull: true,
        validate: {
          is: /^#[0-9A-Fa-f]{6}$/
        }
      },

      // Contact Information
      business_name: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      address_line1: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      address_line2: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      postal_code: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      country: {
        type: DataTypes.STRING(100),
        defaultValue: 'France',
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isEmailOrEmpty(value) {
            if (value && value.trim() !== '') {
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                throw new Error('Invalid email format');
              }
            }
          }
        }
      },
      website: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isUrlOrEmpty(value) {
            if (value && value.trim() !== '') {
              if (!/^https?:\/\/.+/.test(value)) {
                throw new Error('Invalid URL format (must start with http:// or https://)');
              }
            }
          }
        }
      },
      misc_info: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 500]
        }
      },

      // Footer
      footer_text: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 1000]
        }
      },
      signature_name: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      signature_title: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      signature_file_path: {
        type: DataTypes.STRING(500),
        allowNull: true
      },

      // Additional Settings
      show_logo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      show_contact_info: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      show_footer: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      invoice_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 2000]
        }
      },

      // Metadata
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'invoice_customizations',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      hooks: {
        /**
         * Before destroy, clean up logo and signature files
         */
        beforeDestroy: async (customization) => {
          const uploadDir = path.join(__dirname, '..', 'uploads', 'invoice-customizations', customization.user_id);

          try {
            // Check if directory exists
            await fs.access(uploadDir);
            // Remove entire user directory
            await fs.rm(uploadDir, { recursive: true, force: true });
          } catch (error) {
            // Directory doesn't exist or already deleted - that's okay
            console.log(`Cleanup skipped for ${uploadDir}: ${error.message}`);
          }
        }
      }
    }
  );

  /**
   * Instance Methods
   */

  /**
   * Get absolute file system path to logo
   */
  InvoiceCustomization.prototype.getFullLogoPath = function() {
    if (!this.logo_file_path) return null;
    return path.join(__dirname, '..', this.logo_file_path);
  };

  /**
   * Get absolute file system path to signature
   */
  InvoiceCustomization.prototype.getFullSignaturePath = function() {
    if (!this.signature_file_path) return null;
    return path.join(__dirname, '..', this.signature_file_path);
  };

  /**
   * Get URL-safe path for logo
   */
  InvoiceCustomization.prototype.getLogoUrl = function() {
    if (!this.logo_file_path) return null;
    // Return the actual file path stored in the database
    return this.logo_file_path;
  };

  /**
   * Get URL-safe path for signature
   */
  InvoiceCustomization.prototype.getSignatureUrl = function() {
    if (!this.signature_file_path) return null;
    // Return the actual file path stored in the database
    return this.signature_file_path;
  };

  /**
   * Override toJSON to include computed fields
   */
  InvoiceCustomization.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // Add computed URLs
    values.logo_url = this.getLogoUrl();
    values.signature_url = this.getSignatureUrl();

    return values;
  };

  /**
   * Associations
   */
  InvoiceCustomization.associate = (models) => {
    InvoiceCustomization.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return InvoiceCustomization;
};
