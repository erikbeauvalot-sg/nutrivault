/**
 * What's New Service
 * Provides release notes and feature highlights for the dashboard
 */

// Get actual version from environment or package.json
const getActualVersion = () => {
  // In Docker, APP_VERSION is set from build args
  // Ignore "latest" as it's the default placeholder
  if (process.env.APP_VERSION && process.env.APP_VERSION !== 'latest') {
    return process.env.APP_VERSION;
  }
  // Fallback to package.json (try multiple paths for Docker/bare-metal compatibility)
  try {
    // Root package.json (3 levels up from backend/src/services/)
    const packageJson = require('../../../package.json');
    return packageJson.version;
  } catch {
    try {
      // In Docker, backend package.json is at /app/package.json
      const packageJson = require('../../package.json');
      return packageJson.version;
    } catch {
      try {
        // Alternative path for Docker container
        const packageJson = require('/app/package.json');
        return packageJson.version;
      } catch {
        return '8.6.3';
      }
    }
  }
};

// Current version changelog - human-readable features
const CHANGELOG = {
  '8.7.0': {
    version: '8.7.0',
    date: '2026-02-13',
    title: {
      fr: 'Module Finance & Comptabilité',
      en: 'Finance & Accounting Module'
    },
    features: [
      {
        icon: '👤',
        title: { fr: 'Gestion des clients', en: 'Client Management' },
        description: {
          fr: 'Gérez vos clients (personnes et entreprises) avec un annuaire complet : coordonnées, notes, historique des devis et factures',
          en: 'Manage your clients (individuals and companies) with a complete directory: contact info, notes, quote and invoice history'
        }
      },
      {
        icon: '📝',
        title: { fr: 'Devis professionnels', en: 'Professional Quotes' },
        description: {
          fr: 'Créez des devis avec versionnement automatique, validité +30j, envoi par email avec PDF, et conversion en facture en un clic',
          en: 'Create quotes with automatic versioning, +30 day validity, email sending with PDF, and one-click invoice conversion'
        }
      },
      {
        icon: '💸',
        title: { fr: 'Suivi des dépenses', en: 'Expense Tracking' },
        description: {
          fr: 'Enregistrez vos dépenses par catégorie (loyer, logiciel, assurance…), ponctuelles ou récurrentes, pour un suivi précis de votre trésorerie',
          en: 'Track your expenses by category (rent, software, insurance…), one-time or recurring, for precise cash flow monitoring'
        }
      },
      {
        icon: '📒',
        title: { fr: 'Écritures comptables', en: 'Accounting Entries' },
        description: {
          fr: 'Ajoutez des ajustements signés (crédits/débits) pour réconcilier vos comptes — remboursements, corrections, frais bancaires',
          en: 'Add signed adjustments (credits/debits) to reconcile your accounts — refunds, corrections, bank fees'
        }
      },
      {
        icon: '📊',
        title: { fr: 'Dashboard Finance', en: 'Finance Dashboard' },
        description: {
          fr: 'Tableau de bord complet avec KPI (revenu, dépenses, profit net, taux de recouvrement), balance âgée et cash flow sur 12 mois',
          en: 'Complete dashboard with KPIs (revenue, expenses, net profit, collection rate), aging report and 12-month cash flow'
        }
      }
    ]
  },
  '8.2.0': {
    version: '8.2.0',
    date: '2026-02-09',
    title: {
      fr: 'Portail Patient & Journal de Suivi',
      en: 'Patient Portal & Follow-up Journal'
    },
    features: [
      {
        icon: '🏥',
        title: { fr: 'Portail patient', en: 'Patient Portal' },
        description: {
          fr: 'Vos patients disposent désormais de leur propre espace sécurisé pour consulter leurs mesures, consultations, documents et recettes',
          en: 'Your patients now have their own secure space to view their measures, visits, documents and recipes'
        }
      },
      {
        icon: '📓',
        title: { fr: 'Journal de suivi patient', en: 'Patient Follow-up Journal' },
        description: {
          fr: 'Les patients peuvent tenir un journal quotidien (alimentation, humeur, symptômes, activité) avec suivi de l\'humeur et du niveau d\'énergie',
          en: 'Patients can keep a daily journal (food, mood, symptoms, activity) with mood and energy level tracking'
        }
      },
      {
        icon: '💬',
        title: { fr: 'Commentaires diététicien', en: 'Dietitian Comments' },
        description: {
          fr: 'Commentez les entrées du journal de vos patients directement depuis leur fiche, dans le nouvel onglet Journal',
          en: 'Comment on your patients\' journal entries directly from their profile, in the new Journal tab'
        }
      },
      {
        icon: '🔒',
        title: { fr: 'Entrées privées', en: 'Private Entries' },
        description: {
          fr: 'Les patients peuvent marquer certaines entrées comme privées, invisibles pour le diététicien',
          en: 'Patients can mark certain entries as private, invisible to the dietitian'
        }
      },
      {
        icon: '📊',
        title: { fr: 'Tableau de bord enrichi', en: 'Enhanced Dashboard' },
        description: {
          fr: 'Le tableau de bord du diététicien affiche désormais un récapitulatif des dernières entrées journal de tous vos patients',
          en: 'The dietitian dashboard now shows a summary of the latest journal entries across all your patients'
        }
      }
    ]
  },
  '5.16.0': {
    version: '5.16.0',
    date: '2026-02-03',
    title: {
      fr: 'Système de thèmes',
      en: 'Theme System'
    },
    features: [
      {
        icon: '🎨',
        title: { fr: 'Gestion des thèmes', en: 'Theme Management' },
        description: {
          fr: 'Créez, modifiez et personnalisez vos thèmes de couleurs depuis une page dédiée',
          en: 'Create, edit and customize your color themes from a dedicated page'
        }
      },
      {
        icon: '🔄',
        title: { fr: 'Export & import de thèmes', en: 'Theme Export & Import' },
        description: {
          fr: 'Exportez vos thèmes en JSON et importez-les sur d\'autres instances',
          en: 'Export your themes as JSON and import them on other instances'
        }
      },
      {
        icon: '👁️',
        title: { fr: 'Aperçu en temps réel', en: 'Live Preview' },
        description: {
          fr: 'Visualisez les changements de couleurs en direct dans l\'éditeur de thème',
          en: 'See color changes in real-time in the theme editor'
        }
      },
      {
        icon: '🔐',
        title: { fr: 'Permissions par thème', en: 'Theme Permissions' },
        description: {
          fr: 'Contrôle d\'accès granulaire : lecture, création, modification, suppression, export et import',
          en: 'Granular access control: read, create, update, delete, export and import'
        }
      }
    ]
  },
  '5.12.0': {
    version: '5.12.0',
    date: '2026-02-01',
    title: {
      fr: 'Campagnes Email',
      en: 'Email Campaigns'
    },
    features: [
      {
        icon: '📧',
        title: { fr: 'Campagnes email marketing', en: 'Email Marketing Campaigns' },
        description: {
          fr: 'Créez et envoyez des campagnes email personnalisées à vos patients',
          en: 'Create and send personalized email campaigns to your patients'
        }
      },
      {
        icon: '📊',
        title: { fr: 'Statistiques de campagne', en: 'Campaign Statistics' },
        description: {
          fr: 'Suivez les taux d\'ouverture et de clics de vos campagnes',
          en: 'Track open and click rates for your campaigns'
        }
      },
      {
        icon: '👥',
        title: { fr: 'Segmentation d\'audience', en: 'Audience Segmentation' },
        description: {
          fr: 'Ciblez des groupes de patients spécifiques (actifs, inactifs, récents...)',
          en: 'Target specific patient groups (active, inactive, recent...)'
        }
      },
      {
        icon: '⏰',
        title: { fr: 'Planification d\'envoi', en: 'Scheduled Sending' },
        description: {
          fr: 'Planifiez l\'envoi de vos campagnes à une date et heure précises',
          en: 'Schedule your campaigns to be sent at a specific date and time'
        }
      }
    ]
  },
  '5.11.0': {
    version: '5.11.0',
    date: '2026-02-02',
    title: {
      fr: 'Dashboard amélioré',
      en: 'Enhanced Dashboard'
    },
    features: [
      {
        icon: '📊',
        title: { fr: 'Tableau de bord Mon Cabinet', en: 'My Practice Dashboard' },
        description: {
          fr: 'Nouvelle vue d\'ensemble de votre cabinet avec indicateurs clés (patients, revenus, rétention)',
          en: 'New practice overview with key indicators (patients, revenue, retention)'
        }
      },
      {
        icon: '📈',
        title: { fr: 'Graphique des revenus', en: 'Revenue Chart' },
        description: {
          fr: 'Visualisez l\'évolution de votre chiffre d\'affaires sur les 12 derniers mois',
          en: 'Visualize your revenue trends over the last 12 months'
        }
      },
      {
        icon: '📋',
        title: { fr: 'Gestionnaire de tâches', en: 'Task Manager' },
        description: {
          fr: 'Créez et suivez vos tâches à faire, avec priorités et échéances',
          en: 'Create and track your to-do tasks with priorities and due dates'
        }
      },
      {
        icon: '🔔',
        title: { fr: 'Fil d\'activité', en: 'Activity Feed' },
        description: {
          fr: 'Suivez en temps réel l\'activité de votre cabinet (visites, paiements, alertes)',
          en: 'Track real-time activity in your practice (visits, payments, alerts)'
        }
      },
      {
        icon: '💚',
        title: { fr: 'Score de santé du cabinet', en: 'Practice Health Score' },
        description: {
          fr: 'Un indicateur global de la santé de votre cabinet basé sur 5 critères',
          en: 'An overall health indicator for your practice based on 5 criteria'
        }
      }
    ]
  },
  '5.10.0': {
    version: '5.10.0',
    date: '2026-02-01',
    title: {
      fr: 'Gestion des recettes',
      en: 'Recipe Management'
    },
    features: [
      {
        icon: '🍽️',
        title: { fr: 'Bibliothèque de recettes', en: 'Recipe Library' },
        description: {
          fr: 'Créez et gérez une bibliothèque complète de recettes avec catégories et ingrédients',
          en: 'Create and manage a complete recipe library with categories and ingredients'
        }
      },
      {
        icon: '🥗',
        title: { fr: 'Gestion des ingrédients', en: 'Ingredient Management' },
        description: {
          fr: 'Base de données d\'ingrédients avec informations nutritionnelles et allergènes',
          en: 'Ingredient database with nutritional information and allergens'
        }
      },
      {
        icon: '📤',
        title: { fr: 'Partage de recettes', en: 'Recipe Sharing' },
        description: {
          fr: 'Partagez vos recettes avec vos patients via un lien sécurisé ou PDF',
          en: 'Share your recipes with patients via secure link or PDF'
        }
      },
      {
        icon: '📑',
        title: { fr: 'Export PDF multilingue', en: 'Multilingual PDF Export' },
        description: {
          fr: 'Exportez vos recettes en PDF avec traduction automatique (FR/EN)',
          en: 'Export your recipes to PDF with automatic translation (FR/EN)'
        }
      }
    ]
  },
  '5.9.0': {
    version: '5.9.0',
    date: '2026-01-31',
    title: {
      fr: 'Partage de documents amélioré',
      en: 'Enhanced Document Sharing'
    },
    features: [
      {
        icon: '📎',
        title: { fr: 'Catégories de documents', en: 'Document Categories' },
        description: {
          fr: 'Organisez vos documents partagés par catégorie (guide, ordonnance, analyse...)',
          en: 'Organize your shared documents by category (guide, prescription, analysis...)'
        }
      },
      {
        icon: '📧',
        title: { fr: 'Notifications email', en: 'Email Notifications' },
        description: {
          fr: 'Vos patients reçoivent un email lors du partage d\'un document',
          en: 'Your patients receive an email when a document is shared'
        }
      },
      {
        icon: '👁️',
        title: { fr: 'Suivi des consultations', en: 'Access Tracking' },
        description: {
          fr: 'Visualisez quand vos patients ont consulté les documents partagés',
          en: 'See when your patients have viewed shared documents'
        }
      }
    ]
  }
};

/**
 * Get the latest version changelog
 */
const getLatestChangelog = (language = 'fr') => {
  const versions = Object.keys(CHANGELOG).sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
    const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
    if (aMajor !== bMajor) return bMajor - aMajor;
    if (aMinor !== bMinor) return bMinor - aMinor;
    return bPatch - aPatch;
  });

  const latestVersion = versions[0];
  const changelog = CHANGELOG[latestVersion];

  return formatChangelog(changelog, language);
};

/**
 * Get changelog for a specific version
 */
const getChangelogByVersion = (version, language = 'fr') => {
  const changelog = CHANGELOG[version];
  if (!changelog) {
    return null;
  }
  return formatChangelog(changelog, language);
};

/**
 * Get all changelogs (for a "full release notes" page)
 */
const getAllChangelogs = (language = 'fr', limit = 5) => {
  const versions = Object.keys(CHANGELOG).sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
    const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
    if (aMajor !== bMajor) return bMajor - aMajor;
    if (aMinor !== bMinor) return bMinor - aMinor;
    return bPatch - aPatch;
  });

  return versions.slice(0, limit).map(version =>
    formatChangelog(CHANGELOG[version], language)
  );
};

/**
 * Format changelog for the given language
 */
const formatChangelog = (changelog, language) => {
  const lang = ['fr', 'en'].includes(language) ? language : 'fr';

  return {
    version: changelog.version,
    date: changelog.date,
    title: changelog.title[lang],
    features: changelog.features.map(feature => ({
      icon: feature.icon,
      title: feature.title[lang],
      description: feature.description[lang]
    }))
  };
};

/**
 * Check if there are new features since last seen
 * @param {string} lastSeenVersion - The version the user last acknowledged
 */
const hasNewFeatures = (lastSeenVersion) => {
  if (!lastSeenVersion) return true;

  const versions = Object.keys(CHANGELOG);
  const [lastMajor, lastMinor, lastPatch] = lastSeenVersion.split('.').map(Number);

  return versions.some(version => {
    const [major, minor, patch] = version.split('.').map(Number);
    if (major > lastMajor) return true;
    if (major === lastMajor && minor > lastMinor) return true;
    if (major === lastMajor && minor === lastMinor && patch > lastPatch) return true;
    return false;
  });
};

/**
 * Get current app version from environment/package.json
 */
const getCurrentVersion = () => {
  return getActualVersion();
};

module.exports = {
  getLatestChangelog,
  getChangelogByVersion,
  getAllChangelogs,
  hasNewFeatures,
  getCurrentVersion,
  CHANGELOG
};
