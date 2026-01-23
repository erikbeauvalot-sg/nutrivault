'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check for existing duplicate emails in patients table
    const [duplicates] = await queryInterface.sequelize.query(`
      SELECT email, COUNT(*) as count
      FROM patients
      WHERE email IS NOT NULL AND email != ''
      GROUP BY LOWER(email)
      HAVING count > 1;
    `);

    if (duplicates.length > 0) {
      console.warn('⚠️  Warning: Found duplicate emails in patients table:');
      duplicates.forEach(dup => {
        console.warn(`  - ${dup.email} (${dup.count} occurrences)`);
      });
      throw new Error(
        'Cannot add unique constraint: duplicate emails exist in patients table. ' +
        'Please resolve duplicates manually before running this migration.'
      );
    }

    // Add unique constraint to patients.email
    // SQLite doesn't support adding constraints to existing tables directly
    // We need to create a unique index instead
    try {
      await queryInterface.addIndex('patients', {
        fields: ['email'],
        unique: true,
        name: 'patients_email_unique',
        where: {
          email: {
            [Sequelize.Op.ne]: null
          }
        }
      });
      console.log('✅ Added unique constraint on patients.email');
    } catch (error) {
      // For SQLite, use raw SQL to create partial unique index
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX patients_email_unique
        ON patients(email)
        WHERE email IS NOT NULL AND email != '';
      `);
      console.log('✅ Added unique constraint on patients.email (SQLite)');
    }

    // Verify users.email already has unique constraint (should exist)
    const [userIndexes] = await queryInterface.sequelize.query(`
      SELECT name FROM sqlite_master
      WHERE type='index'
      AND tbl_name='users'
      AND name LIKE '%email%'
      AND sql LIKE '%UNIQUE%';
    `);

    if (userIndexes.length === 0) {
      // If no unique constraint on users.email, add it
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX users_email_unique
        ON users(email);
      `);
      console.log('✅ Added unique constraint on users.email');
    } else {
      console.log('✅ Unique constraint on users.email already exists');
    }

    // Add case-insensitive indexes for search performance
    // These help with case-insensitive email lookups
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS patients_email_lower
        ON patients(LOWER(email))
        WHERE email IS NOT NULL AND email != '';
      `);
      console.log('✅ Added case-insensitive search index on patients.email');
    } catch (error) {
      console.warn('⚠️  Could not create case-insensitive index on patients.email:', error.message);
    }

    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS users_email_lower
        ON users(LOWER(email));
      `);
      console.log('✅ Added case-insensitive search index on users.email');
    } catch (error) {
      console.warn('⚠️  Could not create case-insensitive index on users.email:', error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove unique constraints and indexes
    try {
      await queryInterface.removeIndex('patients', 'patients_email_unique');
      console.log('✅ Removed unique constraint from patients.email');
    } catch (error) {
      console.warn('⚠️  Could not remove patients_email_unique:', error.message);
    }

    try {
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS patients_email_lower;`);
      console.log('✅ Removed case-insensitive index from patients.email');
    } catch (error) {
      console.warn('⚠️  Could not remove patients_email_lower:', error.message);
    }

    try {
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS users_email_lower;`);
      console.log('✅ Removed case-insensitive index from users.email');
    } catch (error) {
      console.warn('⚠️  Could not remove users_email_lower:', error.message);
    }

    // Note: We don't remove the unique constraint from users.email
    // as it should have existed before this migration
  }
};
