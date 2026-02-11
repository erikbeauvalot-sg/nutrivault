'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'password_reset_token', {
      type: Sequelize.STRING(64),
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('users', 'password_reset_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addIndex('users', ['password_reset_token'], {
      name: 'users_password_reset_token',
      unique: true,
      where: { password_reset_token: { [Sequelize.Op.ne]: null } }
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'users_password_reset_token');
    await queryInterface.removeColumn('users', 'password_reset_expires_at');
    await queryInterface.removeColumn('users', 'password_reset_token');
  }
};
