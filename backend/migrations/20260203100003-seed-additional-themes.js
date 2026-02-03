'use strict';

const AURORE_ID  = '00000000-0000-4000-a000-000000000002';
const FORET_ID   = '00000000-0000-4000-a000-000000000003';
const CREPUSCULE_ID = '00000000-0000-4000-a000-000000000004';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('themes', [
      {
        id: AURORE_ID,
        name: 'Aurore',
        description: 'Warm sunrise palette — teal accents, bright amber gold, sandy earth tones',
        colors: JSON.stringify({
          "nv-slate": "#527a6a",
          "nv-slate-mid": "#628e7e",
          "nv-slate-bright": "#72a28e",
          "nv-navy-dark": "#2e3e34",
          "nv-navy-deep": "#1e2c24",
          "nv-gold": "#d4a030",
          "nv-parchment": "#e8dcc0",
          "nv-parchment-light": "#f5f0e4",
          "nv-parchment-dark": "#d4c8a8",
          "nv-warm-50": "#faf6ee",
          "nv-warm-100": "#f5f0e4",
          "nv-warm-200": "#e8e0cc",
          "nv-warm-300": "#d4c8a8",
          "nv-warm-400": "#b8a47e",
          "nv-warm-500": "#8c7a5a",
          "nv-warm-600": "#6b5c3e",
          "nv-warm-700": "#4a3e28",
          "nv-warm-800": "#2e2618",
          "nv-warm-900": "#1a160c",
          "nv-danger": "#c45040",
          "nv-info": "#3a8a7c",
          "nv-warning": "#d4a030",
          "nv-success": "#4a8c52",
          "bs-primary": "#527a6a",
          "bs-secondary": "#8c7a5a",
          "bs-success": "#4a8c52",
          "bs-info": "#3a8a7c",
          "bs-warning": "#d4a030",
          "bs-danger": "#c45040",
          "bs-body-bg": "#faf6ee",
          "bs-body-color": "#2e2618",
          "bs-light": "#faf6ee",
          "bs-dark": "#1e2c24"
        }),
        is_system: true,
        is_default: false,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: FORET_ID,
        name: 'Forêt',
        description: 'Deep forest palette — moss green accents, copper gold, warm wood earth tones',
        colors: JSON.stringify({
          "nv-slate": "#4a6e52",
          "nv-slate-mid": "#5a8264",
          "nv-slate-bright": "#6a9676",
          "nv-navy-dark": "#2a3828",
          "nv-navy-deep": "#1a2818",
          "nv-gold": "#b87e3c",
          "nv-parchment": "#dce0c8",
          "nv-parchment-light": "#eef2e4",
          "nv-parchment-dark": "#c8ccb0",
          "nv-warm-50": "#f6f8f0",
          "nv-warm-100": "#eef2e4",
          "nv-warm-200": "#dce0cc",
          "nv-warm-300": "#c8ccb0",
          "nv-warm-400": "#a8ac8a",
          "nv-warm-500": "#7e8266",
          "nv-warm-600": "#5e6248",
          "nv-warm-700": "#404432",
          "nv-warm-800": "#282a20",
          "nv-warm-900": "#141610",
          "nv-danger": "#c04838",
          "nv-info": "#3a8878",
          "nv-warning": "#b88a34",
          "nv-success": "#488c3e",
          "bs-primary": "#4a6e52",
          "bs-secondary": "#7e8266",
          "bs-success": "#488c3e",
          "bs-info": "#3a8878",
          "bs-warning": "#b88a34",
          "bs-danger": "#c04838",
          "bs-body-bg": "#f6f8f0",
          "bs-body-color": "#282a20",
          "bs-light": "#f6f8f0",
          "bs-dark": "#1a2818"
        }),
        is_system: true,
        is_default: false,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: CREPUSCULE_ID,
        name: 'Crépuscule',
        description: 'Twilight palette — deep slate blues, warm bronze gold, sophisticated earth tones',
        colors: JSON.stringify({
          "nv-slate": "#506080",
          "nv-slate-mid": "#607494",
          "nv-slate-bright": "#7088a8",
          "nv-navy-dark": "#282e3e",
          "nv-navy-deep": "#1a2030",
          "nv-gold": "#c09040",
          "nv-parchment": "#dcd8cc",
          "nv-parchment-light": "#f0ece4",
          "nv-parchment-dark": "#c8c4b8",
          "nv-warm-50": "#f8f6f0",
          "nv-warm-100": "#f0ece4",
          "nv-warm-200": "#e0dcd0",
          "nv-warm-300": "#ccc8b8",
          "nv-warm-400": "#a8a494",
          "nv-warm-500": "#807c6e",
          "nv-warm-600": "#605c50",
          "nv-warm-700": "#423e36",
          "nv-warm-800": "#2a2822",
          "nv-warm-900": "#161410",
          "nv-danger": "#b84c44",
          "nv-info": "#3c7e90",
          "nv-warning": "#c09040",
          "nv-success": "#4c8a50",
          "bs-primary": "#506080",
          "bs-secondary": "#807c6e",
          "bs-success": "#4c8a50",
          "bs-info": "#3c7e90",
          "bs-warning": "#c09040",
          "bs-danger": "#b84c44",
          "bs-body-bg": "#f8f6f0",
          "bs-body-color": "#2a2822",
          "bs-light": "#f8f6f0",
          "bs-dark": "#1a2030"
        }),
        is_system: true,
        is_default: false,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('themes', {
      id: [AURORE_ID, FORET_ID, CREPUSCULE_ID]
    });
  }
};
