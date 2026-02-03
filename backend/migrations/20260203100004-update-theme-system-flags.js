'use strict';

const CLASSIQUE_ID   = '00000000-0000-4000-a000-000000000001';
const AURORE_ID      = '00000000-0000-4000-a000-000000000002';
const FORET_ID       = '00000000-0000-4000-a000-000000000003';
const CREPUSCULE_ID  = '00000000-0000-4000-a000-000000000004';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename Classique -> Default
    await queryInterface.sequelize.query(
      `UPDATE themes SET name = 'Default' WHERE id = '${CLASSIQUE_ID}'`
    );

    // Remove is_system from Aurore, Forêt, Crépuscule
    await queryInterface.sequelize.query(
      `UPDATE themes SET is_system = 0 WHERE id IN ('${AURORE_ID}', '${FORET_ID}', '${CREPUSCULE_ID}')`
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Revert name
    await queryInterface.sequelize.query(
      `UPDATE themes SET name = 'Classique' WHERE id = '${CLASSIQUE_ID}'`
    );

    // Restore is_system
    await queryInterface.sequelize.query(
      `UPDATE themes SET is_system = 1 WHERE id IN ('${AURORE_ID}', '${FORET_ID}', '${CREPUSCULE_ID}')`
    );
  }
};
