#!/usr/bin/env node
/**
 * Script de déverrouillage de compte(s) après trop de tentatives de connexion échouées.
 * Remet `failed_login_attempts` à 0 et `locked_until` à null.
 *
 * Usage:
 *   node scripts/unlock-user.js <username>   # déverrouille un utilisateur précis
 *   node scripts/unlock-user.js --all        # déverrouille tous les utilisateurs
 *   node scripts/unlock-user.js --list       # liste l'état de verrouillage de tous les comptes
 *
 * En production bare-metal :
 *   cd /opt/nutrivault/backend && node scripts/unlock-user.js marion
 */

const db = require('../../models');

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.log('❌ Argument manquant.');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/unlock-user.js <username>   # déverrouille un utilisateur');
    console.log('  node scripts/unlock-user.js --all        # déverrouille tous les comptes');
    console.log('  node scripts/unlock-user.js --list       # affiche l\'état de verrouillage');
    console.log('');
    process.exit(1);
  }

  // --list : affiche l'état de tous les comptes
  if (arg === '--list') {
    const users = await db.User.findAll({
      attributes: ['username', 'email', 'failed_login_attempts', 'locked_until'],
      order: [['username', 'ASC']],
    });
    console.log('👥 État de verrouillage des comptes :');
    console.log('');
    const now = new Date();
    users.forEach((u) => {
      const locked = u.locked_until && new Date(u.locked_until) > now;
      const status = locked
        ? `🔒 verrouillé (${Math.ceil((new Date(u.locked_until) - now) / 60000)} min restantes)`
        : '✅ ok';
      console.log(`  ${u.username.padEnd(20)} tentatives=${String(u.failed_login_attempts).padStart(2)}  ${status}`);
    });
    console.log('');
    process.exit(0);
  }

  // Construire le filtre : --all = tous, sinon username exact
  const where = arg === '--all' ? {} : { username: arg };

  if (arg !== '--all') {
    const user = await db.User.findOne({ where });
    if (!user) {
      console.log(`❌ Aucun utilisateur trouvé avec le username "${arg}".`);
      console.log('💡 Astuce : "node scripts/unlock-user.js --list" pour voir les comptes.');
      process.exit(1);
    }
  }

  const [count] = await db.User.update(
    { failed_login_attempts: 0, locked_until: null },
    { where }
  );

  console.log('');
  console.log(`✅ ${count} compte(s) déverrouillé(s).`);
  if (arg !== '--all') {
    console.log(`   Username: ${arg}`);
  }
  console.log('   La connexion est de nouveau possible immédiatement (pas besoin de redémarrer le service).');
  console.log('');
  process.exit(0);
}

main().catch((error) => {
  console.error('');
  console.error('❌ Erreur lors du déverrouillage :');
  console.error('   Message:', error.message);
  console.error('');
  process.exit(1);
});
