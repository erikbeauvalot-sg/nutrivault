'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('clients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      client_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'person or company'
      },
      company_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      address_line1: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      address_line2: {
        type: Sequelize.STRING(255),
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
        allowNull: true,
        defaultValue: 'France'
      },
      siret: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      vat_number: {
        type: Sequelize.STRING(30),
        allowNull: true
      },
      contact_person: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      language_preference: {
        type: Sequelize.STRING(5),
        allowNull: true,
        defaultValue: 'fr'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex('clients', ['created_by'], { name: 'idx_clients_created_by' });
    await queryInterface.addIndex('clients', ['client_type'], { name: 'idx_clients_type' });
    await queryInterface.addIndex('clients', ['patient_id'], { name: 'idx_clients_patient_id' });
    await queryInterface.addIndex('clients', ['email'], { name: 'idx_clients_email' });
    await queryInterface.addIndex('clients', ['is_active'], { name: 'idx_clients_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('clients');
  }
};
