'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_supervisors', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      assistant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      dietitian_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    await queryInterface.addIndex('user_supervisors', ['assistant_id', 'dietitian_id'], {
      unique: true,
      name: 'user_supervisors_unique'
    });

    await queryInterface.addIndex('user_supervisors', ['assistant_id'], {
      name: 'user_supervisors_assistant_idx'
    });

    await queryInterface.addIndex('user_supervisors', ['dietitian_id'], {
      name: 'user_supervisors_dietitian_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_supervisors');
  }
};
