'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoice_customizations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        unique: true
      },

      // Logo
      logo_file_path: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      logo_width: {
        type: Sequelize.INTEGER,
        defaultValue: 150,
        allowNull: true
      },
      logo_height: {
        type: Sequelize.INTEGER,
        defaultValue: 80,
        allowNull: true
      },

      // Color Scheme
      primary_color: {
        type: Sequelize.STRING(7),
        defaultValue: '#3498db',
        allowNull: true
      },
      secondary_color: {
        type: Sequelize.STRING(7),
        defaultValue: '#2c3e50',
        allowNull: true
      },
      accent_color: {
        type: Sequelize.STRING(7),
        defaultValue: '#e74c3c',
        allowNull: true
      },

      // Contact Information
      business_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      address_line1: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      address_line2: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(100),
        defaultValue: 'France',
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      website: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      // Footer
      footer_text: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      signature_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      signature_title: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      signature_file_path: {
        type: Sequelize.STRING(500),
        allowNull: true
      },

      // Additional Settings
      show_logo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      show_contact_info: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      show_footer: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      invoice_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      // Metadata
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('invoice_customizations', ['user_id'], {
      name: 'idx_invoice_customizations_user'
    });

    await queryInterface.addIndex('invoice_customizations', ['is_active'], {
      name: 'idx_invoice_customizations_active'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('invoice_customizations');
  }
};
