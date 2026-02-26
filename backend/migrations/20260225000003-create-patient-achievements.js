'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('patient_achievements', {
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
      goal_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'patient_goals', key: 'id' },
        onDelete: 'SET NULL'
      },
      // Types: goal_completed | first_measure | streak_7 | streak_30 | milestone_25 | milestone_50 | milestone_75 | milestone_100
      achievement_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      badge_icon: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      reward_points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      earned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
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
      await queryInterface.addIndex('patient_achievements', ['patient_id'], { name: 'idx_patient_achievements_patient' });
    } catch (e) { /* index may already exist */ }
    try {
      await queryInterface.addIndex('patient_achievements', ['patient_id', 'achievement_type'], { name: 'idx_patient_achievements_type' });
    } catch (e) { /* index may already exist */ }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('patient_achievements');
  }
};
