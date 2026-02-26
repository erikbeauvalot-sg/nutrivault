'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('patient_goals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onDelete: 'CASCADE'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      // NULL = text/behavior goal, non-null = linked to a measure
      measure_definition_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'measure_definitions', key: 'id' }
      },
      // direction: how progress toward the goal is measured
      direction: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'reach'
        // values: 'increase' | 'decrease' | 'reach' | 'maintain'
      },
      start_value: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      target_value: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      target_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active'
        // values: 'active' | 'completed' | 'abandoned'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    try {
      await queryInterface.addIndex('patient_goals', ['patient_id'], { name: 'idx_patient_goals_patient' });
    } catch (e) { /* index may already exist */ }
    try {
      await queryInterface.addIndex('patient_goals', ['patient_id', 'status'], { name: 'idx_patient_goals_patient_status' });
    } catch (e) { /* index may already exist */ }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('patient_goals');
  }
};
