'use strict';

/**
 * Migration: Create Recipe Sharing Tables
 * Recipe Management Module - Phase 3
 *
 * Tables:
 * - recipe_patient_access: Tracks recipe sharing with patients
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create recipe_patient_access table
    await queryInterface.createTable('recipe_patient_access', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      recipe_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'recipes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Recipe that was shared'
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Patient who received access'
      },
      shared_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who shared the recipe'
      },
      shared_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When the recipe was shared'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes for the patient about this recipe'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether access is still active'
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

    // Add indexes
    await queryInterface.addIndex('recipe_patient_access', ['recipe_id'], {
      name: 'recipe_patient_access_recipe_id'
    });

    await queryInterface.addIndex('recipe_patient_access', ['patient_id'], {
      name: 'recipe_patient_access_patient_id'
    });

    await queryInterface.addIndex('recipe_patient_access', ['shared_by'], {
      name: 'recipe_patient_access_shared_by'
    });

    await queryInterface.addIndex('recipe_patient_access', ['recipe_id', 'patient_id'], {
      name: 'recipe_patient_access_recipe_patient',
      unique: true
    });

    await queryInterface.addIndex('recipe_patient_access', ['patient_id', 'is_active'], {
      name: 'recipe_patient_access_patient_active'
    });

    await queryInterface.addIndex('recipe_patient_access', ['shared_at'], {
      name: 'recipe_patient_access_shared_at'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('recipe_patient_access');
  }
};
