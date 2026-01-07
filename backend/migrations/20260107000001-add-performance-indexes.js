'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Most indexes already exist from initial migrations
    // Only adding missing composite indexes for performance optimization
    
    // Composite index for billing filtered by patient and date (common pattern)
    await queryInterface.addIndex('billing', ['patient_id', 'invoice_date'], {
      name: 'idx_billing_patient_date'
    });

    // Composite index for audit logs filtered by user and timestamp
    await queryInterface.addIndex('audit_logs', ['user_id', 'timestamp'], {
      name: 'idx_audit_logs_user_timestamp'
    });

    console.log('✓ Additional performance indexes created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_user_timestamp');
    await queryInterface.removeIndex('billing', 'idx_billing_patient_date');

    console.log('✓ Additional performance indexes removed successfully');
  }
};
