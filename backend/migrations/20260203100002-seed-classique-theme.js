'use strict';

const { v4: uuidv4 } = require('uuid');

const CLASSIQUE_THEME_ID = '00000000-0000-4000-a000-000000000001';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('themes', [{
      id: CLASSIQUE_THEME_ID,
      name: 'Classique',
      description: 'Solarpunk theme with warm earth tones, slate blue and gold accents',
      colors: JSON.stringify({
        "nv-slate": "#4a6572",
        "nv-slate-mid": "#5a7a88",
        "nv-slate-bright": "#6a8e9e",
        "nv-navy-dark": "#2e3e46",
        "nv-navy-deep": "#1e2c32",
        "nv-gold": "#c4a434",
        "nv-parchment": "#e8dfc4",
        "nv-parchment-light": "#f5f2e8",
        "nv-parchment-dark": "#d4cbb0",
        "nv-warm-50": "#faf8f2",
        "nv-warm-100": "#f5f2e8",
        "nv-warm-200": "#e8e2d0",
        "nv-warm-300": "#d4cbb0",
        "nv-warm-400": "#b8a88a",
        "nv-warm-500": "#8c7e66",
        "nv-warm-600": "#6b5e48",
        "nv-warm-700": "#4a4032",
        "nv-warm-800": "#2e2820",
        "nv-warm-900": "#1a1610",
        "nv-danger": "#c8503c",
        "nv-info": "#3a8a8c",
        "nv-warning": "#c4a434",
        "nv-success": "#4b8c50",
        "bs-primary": "#4a6572",
        "bs-secondary": "#8c7e66",
        "bs-success": "#4b8c50",
        "bs-info": "#3a8a8c",
        "bs-warning": "#c4a434",
        "bs-danger": "#c8503c",
        "bs-body-bg": "#faf8f2",
        "bs-body-color": "#2e2820",
        "bs-light": "#faf8f2",
        "bs-dark": "#1e2c32"
      }),
      is_system: true,
      is_default: true,
      created_by: null,
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('themes', { id: CLASSIQUE_THEME_ID });
  }
};
