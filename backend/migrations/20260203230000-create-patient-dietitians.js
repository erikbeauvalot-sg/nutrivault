'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create patient_dietitians junction table
    await queryInterface.createTable('patient_dietitians', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
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

    // Add unique constraint
    await queryInterface.addIndex('patient_dietitians', ['patient_id', 'dietitian_id'], {
      unique: true,
      name: 'patient_dietitians_unique'
    });

    // Add individual index for dietitian_id lookups
    try {
      await queryInterface.addIndex('patient_dietitians', ['dietitian_id'], {
        name: 'patient_dietitians_dietitian_idx'
      });
    } catch (e) {
      // Index may already exist from table definition
      console.log('Index patient_dietitians_dietitian_idx already exists, skipping');
    }

    // 2. Migrate existing assigned_dietitian_id data
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'sqlite') {
      // SQLite: use INSERT OR IGNORE for upsert behavior
      await queryInterface.sequelize.query(`
        INSERT OR IGNORE INTO patient_dietitians (id, patient_id, dietitian_id, created_at, updated_at)
        SELECT
          lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
          p.id,
          p.assigned_dietitian_id,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM patients p
        WHERE p.assigned_dietitian_id IS NOT NULL
      `);

      // 3. Migrate implicit links from visits
      await queryInterface.sequelize.query(`
        INSERT OR IGNORE INTO patient_dietitians (id, patient_id, dietitian_id, created_at, updated_at)
        SELECT
          lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
          v.patient_id,
          v.dietitian_id,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM (
          SELECT DISTINCT patient_id, dietitian_id
          FROM visits
          WHERE dietitian_id IS NOT NULL
        ) v
      `);
    } else {
      // PostgreSQL
      await queryInterface.sequelize.query(`
        INSERT INTO patient_dietitians (id, patient_id, dietitian_id, created_at, updated_at)
        SELECT
          gen_random_uuid(),
          p.id,
          p.assigned_dietitian_id,
          NOW(),
          NOW()
        FROM patients p
        WHERE p.assigned_dietitian_id IS NOT NULL
        ON CONFLICT (patient_id, dietitian_id) DO NOTHING
      `);

      await queryInterface.sequelize.query(`
        INSERT INTO patient_dietitians (id, patient_id, dietitian_id, created_at, updated_at)
        SELECT
          gen_random_uuid(),
          v.patient_id,
          v.dietitian_id,
          NOW(),
          NOW()
        FROM (
          SELECT DISTINCT patient_id, dietitian_id
          FROM visits
          WHERE dietitian_id IS NOT NULL
        ) v
        ON CONFLICT (patient_id, dietitian_id) DO NOTHING
      `);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('patient_dietitians');
  }
};
