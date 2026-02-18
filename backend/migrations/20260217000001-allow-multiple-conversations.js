'use strict';

module.exports = {
  async up(queryInterface) {
    // Remove the unique constraint on (patient_id, dietitian_id)
    await queryInterface.removeIndex('conversations', 'conversations_patient_dietitian_unique').catch(() => {
      // Index may not exist by that name, try alternate
    });
    // Also try the Sequelize auto-generated name
    await queryInterface.removeIndex('conversations', 'conversations_patient_id_dietitian_id').catch(() => {});

    // Add a non-unique composite index for query performance
    await queryInterface.addIndex('conversations', ['patient_id', 'dietitian_id'], {
      name: 'conversations_patient_dietitian_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('conversations', 'conversations_patient_dietitian_idx').catch(() => {});
    await queryInterface.addIndex('conversations', ['patient_id', 'dietitian_id'], {
      unique: true,
      name: 'conversations_patient_dietitian_unique',
    });
  },
};
