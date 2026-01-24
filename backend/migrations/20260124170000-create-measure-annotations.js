/**
 * Migration: Create Measure Annotations Table
 *
 * Creates the measure_annotations table for storing event markers
 * and annotations on patient measure timelines.
 *
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts (Phase 3)
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('measure_annotations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id'
        },
        onDelete: 'CASCADE',
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
        comment: 'Hex color code for the marker'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
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

    // Create indexes
    await queryInterface.addIndex('measure_annotations', ['patient_id'], {
      name: 'idx_annotations_patient'
    });

    await queryInterface.addIndex('measure_annotations', ['event_date'], {
      name: 'idx_annotations_date'
    });

    await queryInterface.addIndex('measure_annotations', ['measure_definition_id'], {
      name: 'idx_annotations_measure'
    });

    await queryInterface.addIndex('measure_annotations', ['patient_id', 'measure_definition_id'], {
      name: 'idx_annotations_patient_measure'
    });

    await queryInterface.addIndex('measure_annotations', ['patient_id', 'event_date'], {
      name: 'idx_annotations_patient_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop indexes
    await queryInterface.removeIndex('measure_annotations', 'idx_annotations_patient');
    await queryInterface.removeIndex('measure_annotations', 'idx_annotations_date');
    await queryInterface.removeIndex('measure_annotations', 'idx_annotations_measure');
    await queryInterface.removeIndex('measure_annotations', 'idx_annotations_patient_measure');
    await queryInterface.removeIndex('measure_annotations', 'idx_annotations_patient_date');

    // Drop table
    await queryInterface.dropTable('measure_annotations');
  }
};
