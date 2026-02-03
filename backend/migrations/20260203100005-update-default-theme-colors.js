'use strict';

const CLASSIQUE_ID = '00000000-0000-4000-a000-000000000001';

const NEW_COLORS = JSON.stringify({
  "nv-slate": "#2c3e50",
  "nv-slate-mid": "#34495e",
  "nv-slate-bright": "#4a6278",
  "nv-navy-dark": "#2c3e50",
  "nv-navy-deep": "#212529",
  "nv-gold": "#ffc107",
  "nv-parchment": "#e9ecef",
  "nv-parchment-light": "#f8f9fa",
  "nv-parchment-dark": "#dee2e6",
  "nv-warm-50": "#f8f9fa",
  "nv-warm-100": "#f1f3f5",
  "nv-warm-200": "#e9ecef",
  "nv-warm-300": "#dee2e6",
  "nv-warm-400": "#ced4da",
  "nv-warm-500": "#adb5bd",
  "nv-warm-600": "#6c757d",
  "nv-warm-700": "#495057",
  "nv-warm-800": "#343a40",
  "nv-warm-900": "#212529",
  "nv-danger": "#dc3545",
  "nv-info": "#0dcaf0",
  "nv-warning": "#ffc107",
  "nv-success": "#198754",
  "bs-primary": "#0d6efd",
  "bs-secondary": "#6c757d",
  "bs-success": "#198754",
  "bs-info": "#0dcaf0",
  "bs-warning": "#ffc107",
  "bs-danger": "#dc3545",
  "bs-body-bg": "#f8f9fa",
  "bs-body-color": "#212529",
  "bs-light": "#f8f9fa",
  "bs-dark": "#212529"
});

const OLD_COLORS = JSON.stringify({
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
});

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE themes SET colors = '${NEW_COLORS.replace(/'/g, "''")}', description = 'Bootstrap Classic — standard blue primary, neutral grays' WHERE id = '${CLASSIQUE_ID}'`
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE themes SET colors = '${OLD_COLORS.replace(/'/g, "''")}', description = 'Solarpunk theme with warm earth tones, slate blue and gold accents' WHERE id = '${CLASSIQUE_ID}'`
    );
  }
};
