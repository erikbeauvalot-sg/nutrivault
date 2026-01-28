#!/usr/bin/env node
/**
 * Script de création d'utilisateur administrateur
 * Usage: node scripts/create-admin.js [password]
 * Si le mot de passe n'est pas fourni, un mot de passe par défaut sera utilisé
 */

const bcrypt = require('bcryptjs');
const db = require('../../models');

const DEFAULT_PASSWORD = 'Admin123!Change';

async function createAdmin() {
  try {
    const password = process.argv[2] || DEFAULT_PASSWORD;
    
    console.log('🔍 Vérification de l\'utilisateur admin existant...');
    
    // Vérifier si l'admin existe déjà
    const existingAdmin = await db.User.findOne({ where: { username: 'admin' } });
    if (existingAdmin) {
      console.log('⚠️  L\'utilisateur admin existe déjà !');
      console.log('   Username:', existingAdmin.username);
      console.log('   Email:', existingAdmin.email);
      console.log('');
      console.log('💡 Pour réinitialiser le mot de passe, utilisez :');
      console.log('   docker exec nutrivault-backend node /app/scripts/reset-admin-password.js "NouveauMotDePasse"');
      console.log('');
      process.exit(0);
    }
    
    console.log('🔍 Recherche du rôle ADMIN...');
    // Trouver ou créer le rôle ADMIN
    let adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      console.log('📝 Création du rôle ADMIN...');
      adminRole = await db.Role.create({ 
        name: 'ADMIN', 
        description: 'Administrator with full system access' 
      });
    }
    console.log('✅ Rôle ADMIN trouvé/créé avec ID:', adminRole.id);

    // Associer toutes les permissions au rôle ADMIN
    console.log('🔍 Vérification des permissions système...');
    const allPermissions = await db.Permission.findAll();

    if (allPermissions.length > 0) {
      console.log(`📝 Association de ${allPermissions.length} permissions au rôle ADMIN...`);

      // Vérifier quelles permissions sont déjà associées
      const existingRolePermissions = await db.RolePermission.findAll({
        where: { role_id: adminRole.id }
      });
      const existingPermissionIds = new Set(existingRolePermissions.map(rp => rp.permission_id));

      // Associer les permissions manquantes
      const newAssociations = allPermissions
        .filter(p => !existingPermissionIds.has(p.id))
        .map(p => ({
          role_id: adminRole.id,
          permission_id: p.id
        }));

      if (newAssociations.length > 0) {
        await db.RolePermission.bulkCreate(newAssociations);
        console.log(`✅ ${newAssociations.length} permissions associées au rôle ADMIN`);
      } else {
        console.log('✅ Toutes les permissions sont déjà associées');
      }
    } else {
      console.log('⚠️  Aucune permission trouvée dans la base de données');
      console.log('   Les permissions seront créées lors des migrations');
    }

    console.log('🔐 Hachage du mot de passe...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('👤 Création de l\'utilisateur admin...');
    const admin = await db.User.create({
      username: 'admin',
      email: 'admin@nutrivault.local',
      password_hash: hashedPassword,
      role_id: adminRole.id,
      first_name: 'Admin',
      last_name: 'User',
      is_active: true
    });
    
    console.log('');
    console.log('✅ Utilisateur administrateur créé avec succès !');
    console.log('');
    console.log('📝 Informations de connexion :');
    console.log('   Username: admin');
    console.log('   Email:', admin.email);
    console.log('   Password:', password === DEFAULT_PASSWORD ? password + ' (⚠️  CHANGEZ CE MOT DE PASSE!)' : '***');
    console.log('');
    console.log('🔒 Pour des raisons de sécurité, changez le mot de passe après votre première connexion.');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Erreur lors de la création de l\'administrateur :');
    console.error('   Message:', error.message);
    if (error.errors) {
      console.error('   Détails:', error.errors.map(e => e.message).join(', '));
    }
    console.error('');
    process.exit(1);
  }
}

// Exécuter le script
createAdmin();
