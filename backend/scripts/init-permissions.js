#!/usr/bin/env node
/**
 * Script d'initialisation des permissions système
 * Usage: node scripts/init-permissions.js
 *
 * Crée toutes les permissions nécessaires au système et les associe au rôle ADMIN.
 * Ce script est idempotent - il peut être exécuté plusieurs fois sans problème.
 */

const db = require('/models');

// Définition de toutes les permissions du système
const ALL_PERMISSIONS = [
  // Patients
  { code: 'patients.create', resource: 'patients', action: 'create', description: 'Create new patients' },
  { code: 'patients.read', resource: 'patients', action: 'read', description: 'View patient information' },
  { code: 'patients.update', resource: 'patients', action: 'update', description: 'Update patient information' },
  { code: 'patients.delete', resource: 'patients', action: 'delete', description: 'Delete patients' },

  // Visits
  { code: 'visits.create', resource: 'visits', action: 'create', description: 'Create new visits' },
  { code: 'visits.read', resource: 'visits', action: 'read', description: 'View visit information' },
  { code: 'visits.update', resource: 'visits', action: 'update', description: 'Update visit information' },
  { code: 'visits.delete', resource: 'visits', action: 'delete', description: 'Delete visits' },

  // Users
  { code: 'users.create', resource: 'users', action: 'create', description: 'Create new users' },
  { code: 'users.read', resource: 'users', action: 'read', description: 'View user information' },
  { code: 'users.update', resource: 'users', action: 'update', description: 'Update user information' },
  { code: 'users.delete', resource: 'users', action: 'delete', description: 'Delete users' },

  // Billing
  { code: 'billing.create', resource: 'billing', action: 'create', description: 'Create billing records' },
  { code: 'billing.read', resource: 'billing', action: 'read', description: 'View billing information' },
  { code: 'billing.update', resource: 'billing', action: 'update', description: 'Update billing records' },
  { code: 'billing.delete', resource: 'billing', action: 'delete', description: 'Delete billing records' },

  // Documents
  { code: 'documents.upload', resource: 'documents', action: 'upload', description: 'Upload new documents' },
  { code: 'documents.read', resource: 'documents', action: 'read', description: 'View and list documents' },
  { code: 'documents.download', resource: 'documents', action: 'download', description: 'Download documents' },
  { code: 'documents.update', resource: 'documents', action: 'update', description: 'Update document metadata' },
  { code: 'documents.delete', resource: 'documents', action: 'delete', description: 'Delete documents' },
  { code: 'documents.share', resource: 'documents', action: 'share', description: 'Share documents with others' },

  // Reports
  { code: 'reports.view', resource: 'reports', action: 'view', description: 'View reports' },
  { code: 'reports.export', resource: 'reports', action: 'export', description: 'Export reports' },

  // System
  { code: 'system.settings', resource: 'system', action: 'settings', description: 'Manage system settings' },
  { code: 'system.logs', resource: 'system', action: 'logs', description: 'View system logs' }
];

async function initPermissions() {
  try {
    console.log('🔍 Recherche du rôle ADMIN...');

    const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      console.error('❌ Le rôle ADMIN n\'existe pas !');
      console.error('   Veuillez d\'abord créer l\'utilisateur admin avec create-admin.js');
      process.exit(1);
    }

    console.log('✅ Rôle ADMIN trouvé (ID:', adminRole.id + ')');
    console.log('');
    console.log('📝 Initialisation des permissions système...');
    console.log('   Total à créer/vérifier:', ALL_PERMISSIONS.length);
    console.log('');

    let createdCount = 0;
    let existingCount = 0;
    let linkedCount = 0;

    for (const permData of ALL_PERMISSIONS) {
      // Créer la permission si elle n'existe pas
      const [permission, created] = await db.Permission.findOrCreate({
        where: { code: permData.code },
        defaults: permData
      });

      if (created) {
        createdCount++;
        console.log('  ✅ Créée:', permData.code);
      } else {
        existingCount++;
      }

      // Lier la permission au rôle ADMIN si ce n'est pas déjà fait
      const [rolePermission, rpCreated] = await db.RolePermission.findOrCreate({
        where: {
          role_id: adminRole.id,
          permission_id: permission.id
        }
      });

      if (rpCreated) {
        linkedCount++;
      }
    }

    console.log('');
    console.log('✅ Initialisation terminée !');
    console.log('');
    console.log('📊 Résumé :');
    console.log('   - Permissions créées:', createdCount);
    console.log('   - Permissions existantes:', existingCount);
    console.log('   - Nouvelles liaisons au rôle ADMIN:', linkedCount);
    console.log('   - Total des permissions:', ALL_PERMISSIONS.length);
    console.log('');

    // Afficher les permissions par ressource
    console.log('📋 Permissions par ressource :');
    const grouped = {};
    ALL_PERMISSIONS.forEach(p => {
      if (!grouped[p.resource]) grouped[p.resource] = [];
      grouped[p.resource].push(p.action);
    });

    Object.keys(grouped).sort().forEach(resource => {
      console.log('   ' + resource + ': ' + grouped[resource].sort().join(', '));
    });
    console.log('');

    console.log('🔒 IMPORTANT: Les utilisateurs doivent se déconnecter et se reconnecter');
    console.log('   pour que les nouvelles permissions prennent effet dans leur token JWT.');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Erreur lors de l\'initialisation des permissions :');
    console.error('   Message:', error.message);
    if (error.errors) {
      console.error('   Détails:', error.errors.map(e => e.message).join(', '));
    }
    console.error('');
    process.exit(1);
  }
}

// Exécuter le script
initPermissions();
