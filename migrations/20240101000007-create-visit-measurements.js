'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('visit_measurements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      visit_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'visits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      weight_kg: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      height_cm: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      bmi: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true
      },
      waist_circumference_cm: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      body_fat_percentage: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true
      },
      blood_pressure_systolic: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      blood_pressure_diastolic: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('visit_measurements', ['visit_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('visit_measurements');
  }
};
