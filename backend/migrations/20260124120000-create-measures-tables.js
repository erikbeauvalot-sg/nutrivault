'use strict';

/**
 * Migration: Create Measures Tracking Tables
 * Sprint 3: US-5.3.1, US-5.3.2, US-5.3.3
 *
 * Tables:
 * - measure_definitions: Custom measure types (weight, BP, etc.)
 * - patient_measures: Time-series measure values
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create measure_definitions table
    await queryInterface.createTable('measure_definitions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique measure name (e.g., weight, blood_pressure)'
      },
      display_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Human-readable name for display'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional description of the measure'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'other',
        comment: 'Category: vitals, lab_results, symptoms, anthropometric, other'
      },
      measure_type: {
        type: Sequelize.ENUM('numeric', 'text', 'boolean', 'calculated'),
        allowNull: false,
        defaultValue: 'numeric',
        comment: 'Type of measure value'
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Unit of measurement (kg, cm, mmHg, etc.)'
      },
      min_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Minimum valid value (for numeric types)'
      },
      max_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Maximum valid value (for numeric types)'
      },
      decimal_places: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 2,
        comment: 'Number of decimal places for display'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this measure is active'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order for display in lists'
      },
      is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'System-defined measures cannot be deleted'
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

    // 2. Create patient_measures table (time-series data)
    await queryInterface.createTable('patient_measures', {
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Patient this measure belongs to'
      },
      measure_definition_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'measure_definitions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Measure definition'
      },
      visit_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'visits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Optional: Visit when measure was taken'
      },
      measured_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When the measurement was taken'
      },
      // Polymorphic value storage
      numeric_value: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true,
        comment: 'For numeric measure types'
      },
      text_value: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'For text measure types'
      },
      boolean_value: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: 'For boolean measure types'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional notes about this measurement'
      },
      recorded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'User who recorded this measure'
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

    // 3. Create indexes for measure_definitions
    await queryInterface.addIndex('measure_definitions', ['name'], {
      name: 'measure_definitions_name',
      unique: true,
      where: { deleted_at: null }
    });

    await queryInterface.addIndex('measure_definitions', ['category', 'is_active'], {
      name: 'measure_definitions_category_active'
    });

    await queryInterface.addIndex('measure_definitions', ['display_order'], {
      name: 'measure_definitions_display_order'
    });

    // 4. Create indexes for patient_measures (optimized for time-series queries)
    await queryInterface.addIndex('patient_measures', ['patient_id', 'measured_at'], {
      name: 'patient_measures_patient_date',
      comment: 'Time-series queries by patient'
    });

    await queryInterface.addIndex('patient_measures', ['measure_definition_id', 'measured_at'], {
      name: 'patient_measures_definition_date',
      comment: 'Time-series queries by measure type'
    });

    await queryInterface.addIndex('patient_measures', ['patient_id', 'measure_definition_id', 'measured_at'], {
      name: 'patient_measures_composite',
      comment: 'Composite index for specific measure queries'
    });

    await queryInterface.addIndex('patient_measures', ['visit_id'], {
      name: 'patient_measures_visit'
    });

    await queryInterface.addIndex('patient_measures', ['measured_at'], {
      name: 'patient_measures_measured_at',
      comment: 'Date range queries'
    });

    console.log('✅ Measures tables created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('patient_measures');
    await queryInterface.dropTable('measure_definitions');

    console.log('✅ Measures tables dropped successfully');
  }
};
