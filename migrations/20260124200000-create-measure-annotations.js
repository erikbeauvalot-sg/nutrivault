'use strict';

/**
 * Migration: Create measure_annotations table
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts (Phase 3)
 *
 * This table stores event markers and annotations for patient measure timelines
 * (e.g., medication changes, lifestyle events, medical procedures)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('measure_annotations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Patient this annotation belongs to'
      },
      measure_definition_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'measure_definitions',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Specific measure this annotation applies to (null = all measures)'
      },
      event_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date of the event/annotation'
      },
      event_type: {
        type: Sequelize.ENUM('medication', 'lifestyle', 'medical', 'other'),
        allowNull: false,
        defaultValue: 'other',
        comment: 'Type of event: medication, lifestyle, medical, other'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Brief title of the annotation'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed description of the event'
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true,
        defaultValue: '#FF5733',
        comment: 'Hex color code for the marker (e.g., #FF5733)'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'User who created this annotation'
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
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp'
      }
    });

    // Index for fast lookups by patient
    await queryInterface.addIndex('measure_annotations', ['patient_id'], {
      name: 'idx_annotations_patient'
    });

    // Index for fast lookups by event date
    await queryInterface.addIndex('measure_annotations', ['event_date'], {
      name: 'idx_annotations_date'
    });

    // Index for fast lookups by measure definition
    await queryInterface.addIndex('measure_annotations', ['measure_definition_id'], {
      name: 'idx_annotations_measure'
    });

    // Composite index for common query pattern: get annotations for a patient and specific measure
    await queryInterface.addIndex('measure_annotations', ['patient_id', 'measure_definition_id'], {
      name: 'idx_annotations_patient_measure'
    });

    // Composite index for date-range queries by patient
    await queryInterface.addIndex('measure_annotations', ['patient_id', 'event_date'], {
      name: 'idx_annotations_patient_date'
    });

    // Index for soft delete queries
    await queryInterface.addIndex('measure_annotations', ['deleted_at'], {
      name: 'idx_annotations_deleted'
    });

    console.log('✅ Created measure_annotations table with indexes');
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('measure_annotations', 'idx_annotations_deleted');
    await queryInterface.removeIndex('measure_annotations', 'idx_annotations_patient_date');
    await queryInterface.removeIndex('measure_annotations', 'idx_annotations_patient_measure');
    await queryInterface.removeIndex('measure_annotations', 'idx_annotations_measure');
    await queryInterface.removeIndex('measure_annotations', 'idx_annotations_date');
    await queryInterface.removeIndex('measure_annotations', 'idx_annotations_patient');

    // Drop table
    await queryInterface.dropTable('measure_annotations');

    // Drop enum type (for PostgreSQL compatibility; SQLite doesn't have enums)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_measure_annotations_event_type;');

    console.log('✅ Dropped measure_annotations table');
  }
};
