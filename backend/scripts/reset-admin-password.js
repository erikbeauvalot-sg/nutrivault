#!/usr/bin/env node
/**
 * Script de réinitialisation du mot de passe administrateur
 * Usage: node scripts/reset-admin-password.js [new-password]
 * Si le mot de passe n'est pas fourni, un mot de passe par défaut sera utilisé
 */

const bcrypt = require('bcryptjs');
const db = require('../../models');

const DEFAULT_PASSWORD = 'Admin123!Change';

async function resetAdminPassword() {
  try {
    const newPassword = process.argv[2] || DEFAULT_PASSWORD;

    console.log('🔍 Recherche de l\'utilisateur admin...');

    // Trouver l'utilisateur admin
    const admin = await db.User.findOne({ where: { username: 'admin' } });

    if (!admin) {
      console.log('❌ Aucun utilisateur admin trouvé !');
      console.log('');
      console.log('💡 Créez d\'abord un utilisateur admin avec :');
      console.log('   docker exec nutrivault-backend node /app/scripts/create-admin.js "VotreMotDePasse"');
      console.log('');
      process.exit(1);
    }

    console.log('✅ Utilisateur admin trouvé');
    console.log('   Username:', admin.username);
    console.log('   Email:', admin.email);
    console.log('');

    console.log('🔐 Génération du nouveau mot de passe haché...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log('💾 Mise à jour du mot de passe...');
    await admin.update({
      password_hash: hashedPassword,
      updated_at: new Date()
    });

    console.log('');
    console.log('✅ Mot de passe administrateur réinitialisé avec succès !');
    console.log('');
    console.log('📝 Nouvelles informations de connexion :');
    console.log('   Username: admin');
    console.log('   Email:', admin.email);
    console.log('   Password:', newPassword === DEFAULT_PASSWORD ? newPassword + ' (⚠️  CHANGEZ CE MOT DE PASSE!)' : '***');
    console.log('');
    console.log('🔒 Pour des raisons de sécurité, changez le mot de passe après votre première connexion.');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Erreur lors de la réinitialisation du mot de passe :');
    console.error('   Message:', error.message);
    if (error.errors) {
      console.error('   Détails:', error.errors.map(e => e.message).join(', '));
    }
    console.error('');
    process.exit(1);
  }
}

// Exécuter le script
resetAdminPassword();
