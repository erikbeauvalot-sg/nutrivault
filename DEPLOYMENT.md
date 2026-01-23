# Guide de Déploiement Docker - NutriVault

Ce guide vous accompagne dans le déploiement de NutriVault en production avec Docker.

## 📋 Table des matières

- [Prérequis](#prérequis)
- [Architecture](#architecture)
- [Configuration rapide](#configuration-rapide)
- [Déploiement pas à pas](#déploiement-pas-à-pas)
- [Commandes utiles](#commandes-utiles)
- [Maintenance](#maintenance)
- [Sécurité](#sécurité)
- [Dépannage](#dépannage)

## 🔧 Prérequis

### Logiciels requis

- **Docker** version 20.10 ou supérieure
- **Docker Compose** version 2.0 ou supérieure
- **OpenSSL** pour générer les secrets JWT

Vérification des versions :
```bash
docker --version
docker-compose --version
openssl version
```

### Ressources recommandées

**Minimum :**
- CPU : 2 cœurs
- RAM : 2 GB
- Disque : 10 GB

**Production :**
- CPU : 4 cœurs
- RAM : 4 GB
- Disque : 50 GB (selon volume de données)

## 🏗️ Architecture

L'application est composée de 3 services Docker :

```
┌─────────────────────────────────────────┐
│           Internet / Utilisateurs       │
└────────────────┬────────────────────────┘
                 │
                 │ Port 80 (HTTP)
                 │ Port 443 (HTTPS - avec reverse proxy)
                 ▼
┌─────────────────────────────────────────┐
│     Frontend (Nginx)                    │
│     - React SPA                         │
│     - Fichiers statiques optimisés      │
│     - Proxy API vers backend            │
└────────────────┬────────────────────────┘
                 │
                 │ Réseau Docker interne
                 │
                 ▼
┌─────────────────────────────────────────┐
│     Backend (Node.js)                   │
│     - API REST                          │
│     - Authentification JWT              │
│     - Gestion documents                 │
└────────────────┬────────────────────────┘
                 │
                 │ Volume persistant
                 ▼
┌─────────────────────────────────────────┐
│     Données                             │
│     - Base SQLite (nutrivault-data)     │
│     - Uploads (nutrivault-uploads)      │
│     - Logs (nutrivault-logs)            │
└─────────────────────────────────────────┘
```

## ⚡ Configuration rapide

### 1. Cloner le projet

```bash
git clone https://github.com/erikbeauvalot-sg/nutrivault.git
cd nutrivault
```

### 2. Générer les secrets JWT

```bash
# Générer JWT_SECRET
openssl rand -base64 64

# Générer REFRESH_TOKEN_SECRET
openssl rand -base64 64
```

### 3. Configurer l'environnement

```bash
# Copier le fichier exemple
cp .env.production.example .env.production

# Éditer avec vos valeurs
nano .env.production
```

**Valeurs critiques à modifier :**
- `JWT_SECRET` : Coller le premier secret généré
- `REFRESH_TOKEN_SECRET` : Coller le second secret généré
- `ALLOWED_ORIGINS` : Votre domaine de production
- `EMAIL_USER` : Votre adresse email SMTP
- `EMAIL_PASSWORD` : Mot de passe d'application
- `ADMIN_PASSWORD` : Mot de passe admin fort

### 4. Protéger le fichier de configuration

```bash
chmod 600 .env.production
```

### 5. Lancer l'application

```bash
# Construction et démarrage
docker-compose --env-file .env.production up -d --build

# Suivre les logs
docker-compose logs -f
```

### 6. Vérifier le fonctionnement

```bash
# Vérifier la santé du backend
curl http://localhost:3001/health

# Vérifier la santé du frontend
curl http://localhost/health

# Voir l'état des conteneurs
docker-compose ps
```

### 7. Créer l'utilisateur administrateur

**IMPORTANT :** Créez maintenant l'utilisateur admin.

**Option A : Script helper (recommandé)**

```bash
# Avec mot de passe personnalisé
docker exec nutrivault-backend node /app/scripts/create-admin.js "VotreMotDePasseSecurise123!"

# Avec mot de passe par défaut (à changer après connexion)
docker exec nutrivault-backend node /app/scripts/create-admin.js
```

**✨ Ce que fait ce script automatiquement :**
- Crée le rôle ADMIN s'il n'existe pas encore
- **Associe automatiquement toutes les 26 permissions au rôle ADMIN**
- Crée l'utilisateur admin avec le mot de passe fourni
- **Plus besoin de re-run les migrations !**

**💡 Réinitialisation du mot de passe**

Si l'utilisateur admin existe déjà ou si vous avez oublié le mot de passe :

```bash
# Réinitialiser avec un nouveau mot de passe
docker exec nutrivault-backend node /app/scripts/reset-admin-password.js "NouveauMotDePasse123!"
```

**Option B : Script inline complet**

```bash
# Créer l'utilisateur admin
docker exec nutrivault-backend sh -c "cat > /app/create-admin.js << 'EOFADMIN'
const bcrypt = require('bcryptjs');
const db = require('/models');
(async () => {
  try {
    const existingAdmin = await db.User.findOne({ where: { username: 'admin' } });
    if (existingAdmin) {
      console.log('⚠️  Admin already exists');
      process.exit(0);
    }
    let adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
    if (!adminRole) adminRole = await db.Role.create({ name: 'ADMIN', description: 'Administrator' });
    const hashedPassword = await bcrypt.hash('CHANGEZ_CE_MOT_DE_PASSE', 10);
    await db.User.create({
      username: 'admin',
      email: 'admin@votredomaine.com',
      password_hash: hashedPassword,
      role_id: adminRole.id,
      first_name: 'Admin',
      last_name: 'User',
      is_active: true
    });
    console.log('✅ Admin created! Username: admin');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
EOFADMIN
node /app/create-admin.js && rm /app/create-admin.js"
```

**⚠️ AVANT D'EXÉCUTER :**
- Remplacez `CHANGEZ_CE_MOT_DE_PASSE` par votre mot de passe fort
- Utilisez au moins 12 caractères avec majuscules, minuscules, chiffres et symboles

### 8. Vérifier l'initialisation des permissions

Les **26 permissions système** sont créées **automatiquement** lors des migrations de base de données (étape 4).

Vous pouvez vérifier qu'elles ont bien été créées :

```bash
docker exec nutrivault-backend node -e "
const db = require('/models');
(async () => {
  const count = await db.Permission.count();
  console.log('✅ Permissions système:', count);
  const adminRole = await db.Role.findOne({
    where: { name: 'ADMIN' },
    include: [{ model: db.Permission, as: 'permissions' }]
  });
  console.log('✅ Permissions ADMIN:', adminRole.permissions.length);
  process.exit(0);
})();
"
```

**Résultat attendu :**
```
✅ Permissions système: 26
✅ Permissions ADMIN: 26
```

**💡 Pour les déploiements existants :** Si vous avez déployé avant cette mise à jour, exécutez `docker exec nutrivault-backend npm run db:migrate` pour créer les permissions.

⚠️ **Important :** Déconnectez-vous et reconnectez-vous pour obtenir un nouveau token JWT avec toutes les permissions.

L'application est maintenant accessible sur `http://localhost` (ou votre domaine).

## 📖 Déploiement pas à pas

### Étape 1 : Préparation du serveur

#### 1.1 Installer Docker

**Ubuntu/Debian :** 
```bash
# Mettre à jour les paquets
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER

# Recharger les groupes (ou se déconnecter/reconnecter)
newgrp docker

# Vérifier l'installation
docker --version
```

**CentOS/RHEL :**
```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
```

#### 1.2 Installer Docker Compose

```bash
# Télécharger Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Rendre exécutable
sudo chmod +x /usr/local/bin/docker-compose

# Vérifier
docker-compose --version
```

#### 1.3 Configurer le pare-feu

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 22/tcp    # SSH
sudo ufw enable

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Étape 2 : Configuration de l'application

#### 2.1 Cloner le dépôt

```bash
# Créer un répertoire pour l'application
sudo mkdir -p /opt/nutrivault
sudo chown $USER:$USER /opt/nutrivault
cd /opt/nutrivault

# Cloner le projet
git clone https://github.com/erikbeauvalot-sg/nutrivault.git .
```

#### 2.2 Générer les secrets

```bash
# Générer et afficher les secrets
echo "JWT_SECRET=$(openssl rand -base64 64)"
echo "REFRESH_TOKEN_SECRET=$(openssl rand -base64 64)"
```

**Important :** Copiez ces valeurs dans un endroit sûr !

#### 2.3 Créer le fichier de configuration

```bash
# Copier l'exemple
cp .env.production.example .env.production

# Éditer la configuration
nano .env.production
```

Configuration minimale requise :

```bash
# Ports
FRONTEND_PORT=80
BACKEND_PORT=3001

# Sécurité JWT (utiliser les secrets générés)
JWT_SECRET=votre_secret_jwt_genere
REFRESH_TOKEN_SECRET=votre_refresh_token_secret_genere

# CORS (votre domaine)
ALLOWED_ORIGINS=https://nutrivault.example.com

# Email (pour l'envoi des factures)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
EMAIL_FROM_NAME=NutriVault

# Initialisation (première fois uniquement)
CREATE_ADMIN=true
ADMIN_USERNAME=admin
ADMIN_PASSWORD=MotDePasseSecurise123!
SEED_DB=false
```

#### 2.4 Sécuriser la configuration

```bash
# Permissions strictes sur le fichier de configuration
chmod 600 .env.production

# Vérifier
ls -la .env.production
# Devrait afficher : -rw------- 1 user user
```

### Étape 3 : Construction et démarrage

#### 3.1 Construire les images

```bash
# Construction des images (peut prendre 5-10 minutes)
docker-compose --env-file .env.production build

# Vérifier les images créées
docker images | grep nutrivault
```

#### 3.2 Démarrer les services

```bash
# Démarrage en arrière-plan
docker-compose --env-file .env.production up -d

# Suivre les logs en temps réel
docker-compose logs -f

# Arrêter le suivi des logs : Ctrl+C
```

#### 3.3 Vérifier le démarrage

```bash
# État des conteneurs
docker-compose ps

# Devrait afficher :
# NAME                    STATUS          PORTS
# nutrivault-backend      Up (healthy)    0.0.0.0:3001->3001/tcp
# nutrivault-frontend     Up (healthy)    0.0.0.0:80->80/tcp

# Logs du backend
docker-compose logs backend

# Logs du frontend
docker-compose logs frontend
```

### Étape 4 : Tests de fonctionnement

#### 4.1 Tests de santé

```bash
# Backend API
curl http://localhost:3001/health
# Réponse attendue : {"status":"ok"}

# Frontend
curl http://localhost/health
# Réponse attendue : healthy

# Tests depuis l'extérieur (remplacer par votre IP/domaine)
curl http://votre-serveur.com/health
```

#### 4.2 Créer l'utilisateur administrateur

**IMPORTANT :** Le premier démarrage ne crée pas automatiquement l'utilisateur admin. Vous devez le créer manuellement.

**Méthode 1 : Script helper (recommandé)**

```bash
# Avec votre propre mot de passe sécurisé
docker exec nutrivault-backend node /app/scripts/create-admin.js "MonMotDePasseSecurise2024!"

# Ou avec mot de passe par défaut (à changer immédiatement)
docker exec nutrivault-backend node /app/scripts/create-admin.js
```

**✨ Améliorations du script :**
- ✅ Crée automatiquement le rôle ADMIN
- ✅ **Associe automatiquement toutes les 26 permissions au rôle ADMIN**
- ✅ Crée l'utilisateur admin
- ✅ Plus besoin de manipulation manuelle des permissions !

**Méthode 2 : Script complet inline**

```bash
# Créer le script de création d'admin dans le conteneur
docker exec nutrivault-backend sh -c "cat > /app/create-admin.js << 'EOF'
const bcrypt = require('bcryptjs');
const db = require('/models');

(async () => {
  try {
    console.log('🔍 Checking for existing admin user...');

    // Vérifier si l'admin existe déjà
    const existingAdmin = await db.User.findOne({ where: { username: 'admin' } });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      process.exit(0);
    }

    console.log('🔍 Looking for ADMIN role...');
    // Trouver ou créer le rôle ADMIN
    let adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      console.log('📝 Creating ADMIN role...');
      adminRole = await db.Role.create({ name: 'ADMIN', description: 'Administrator' });
    }
    console.log('✅ ADMIN role found/created with ID:', adminRole.id);

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash('VotreMotDePasseSecurise123!', 10);

    console.log('👤 Creating admin user...');
    const admin = await db.User.create({
      username: 'admin',
      email: 'admin@votredomaine.com',
      password_hash: hashedPassword,
      role_id: adminRole.id,
      first_name: 'Admin',
      last_name: 'User',
      is_active: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('   Username:', admin.username);
    console.log('   Email:', admin.email);
    console.log('');
    console.log('🔐 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: VotreMotDePasseSecurise123!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
EOF
"

# Exécuter le script pour créer l'admin
docker exec nutrivault-backend node /app/create-admin.js
```

**Résultat attendu :**
```
✅ Admin user created successfully!
   Username: admin
   Email: admin@votredomaine.com

🔐 Login credentials:
   Username: admin
   Password: VotreMotDePasseSecurise123!
```

**⚠️ IMPORTANT :**
- Modifiez le mot de passe dans le script avant de l'exécuter !
- Changez `'VotreMotDePasseSecurise123!'` par un mot de passe fort
- Utilisez un mot de passe d'au moins 12 caractères avec majuscules, minuscules, chiffres et symboles

**💡 Réinitialisation du mot de passe admin**

Si l'utilisateur admin existe déjà ou si vous avez oublié le mot de passe :

```bash
# Réinitialiser avec un nouveau mot de passe sécurisé
docker exec nutrivault-backend node /app/scripts/reset-admin-password.js "NouveauMotDePasseSecurise2024!"

# Ou avec mot de passe par défaut (à changer immédiatement)
docker exec nutrivault-backend node /app/scripts/reset-admin-password.js
```

**Résultat attendu :**
```
🔍 Recherche de l'utilisateur admin...
✅ Utilisateur admin trouvé
   Username: admin
   Email: admin@nutrivault.local

🔐 Génération du nouveau mot de passe haché...
💾 Mise à jour du mot de passe...

✅ Mot de passe administrateur réinitialisé avec succès !

📝 Nouvelles informations de connexion :
   Username: admin
   Email: admin@nutrivault.local
   Password: ***
```

#### 4.3 Vérifier les permissions système (Automatique)

Les permissions système sont **créées automatiquement** lors de l'exécution des migrations de base de données (étape précédente).

**Vérification (optionnel) :**

```bash
docker exec nutrivault-backend node -e "
const db = require('/models');
(async () => {
  const count = await db.Permission.count();
  const adminRole = await db.Role.findOne({
    where: { name: 'ADMIN' },
    include: [{ model: db.Permission, as: 'permissions' }]
  });
  console.log('✅ Total permissions:', count);
  console.log('✅ Permissions ADMIN:', adminRole.permissions.length);
  console.log('');
  console.log('Permissions par ressource:');
  const grouped = {};
  adminRole.permissions.forEach(p => {
    if (!grouped[p.resource]) grouped[p.resource] = [];
    grouped[p.resource].push(p.action);
  });
  Object.keys(grouped).sort().forEach(resource => {
    console.log('  ' + resource + ':', grouped[resource].sort().join(', '));
  });
  process.exit(0);
})();
"
```

**Résultat attendu :**
```
✅ Total permissions: 26
✅ Permissions ADMIN: 26

Permissions par ressource:
  billing: create, delete, read, update
  documents: delete, download, read, share, update, upload
  patients: create, delete, read, update
  reports: export, view
  system: logs, settings
  users: create, delete, read, update
  visits: create, delete, read, update
```

**Ce qui a été fait automatiquement :**
- ✅ 26 permissions système créées via la migration `20260123160000-init-system-permissions`
- ✅ Toutes les permissions automatiquement associées au rôle ADMIN
- ✅ Migration idempotente (peut être exécutée plusieurs fois sans problème)

**⚠️ IMPORTANT :** Après la création de l'admin :
1. **Déconnectez-vous** de l'application si vous êtes déjà connecté
2. **Reconnectez-vous** avec les identifiants admin
3. Votre nouveau token JWT inclura maintenant toutes les permissions

#### 4.4 Test de connexion

```bash
# Se connecter avec le compte admin créé
# URL : http://votre-serveur.com
# Username : admin
# Password : (celui défini dans le script ci-dessus)
```

### Étape 5 : Configuration HTTPS (Recommandé)

#### Option A : Avec Nginx reverse proxy

```bash
# Installer Nginx et Certbot
sudo apt install nginx certbot python3-certbot-nginx

# Configurer Nginx
sudo nano /etc/nginx/sites-available/nutrivault
```

Configuration Nginx :
```nginx
server {
    listen 80;
    server_name nutrivault.example.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activer la configuration
sudo ln -s /etc/nginx/sites-available/nutrivault /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d nutrivault.example.com
```

#### Option B : Avec Traefik

Voir [documentation Traefik](https://doc.traefik.io/traefik/).

## 🛠️ Commandes utiles

### Gestion des services

```bash
# Démarrer
docker-compose --env-file .env.production up -d

# Arrêter
docker-compose down

# Redémarrer
docker-compose restart

# Redémarrer un service spécifique
docker-compose restart backend

# Voir les logs
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f backend

# Voir l'état
docker-compose ps

# Statistiques de ressources
docker stats
```

### 🔄 Mise à jour de l'application (avec gestion des migrations)

**IMPORTANT** : Toujours sauvegarder avant une mise à jour car la structure de la base de données peut changer.

#### Procédure complète de mise à jour

```bash
# 1. SAUVEGARDER LA BASE DE DONNÉES ET LES FICHIERS
mkdir -p ~/nutrivault-backups
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Sauvegarder la base de données
docker cp nutrivault-backend:/app/data/nutrivault.db ~/nutrivault-backups/nutrivault-${BACKUP_DATE}.db

# Sauvegarder les uploads
docker run --rm -v nutrivault-uploads:/data -v ~/nutrivault-backups:/backup alpine tar czf /backup/uploads-${BACKUP_DATE}.tar.gz -C /data .

# Sauvegarder la configuration
cp .env.production ~/nutrivault-backups/.env.production-${BACKUP_DATE}

echo "✅ Sauvegarde créée : ~/nutrivault-backups/*-${BACKUP_DATE}*"

# 2. NOTER LA VERSION ACTUELLE DU CODE
git rev-parse HEAD > ~/nutrivault-backups/git-commit-${BACKUP_DATE}.txt

# 3. RÉCUPÉRER LES DERNIÈRES MODIFICATIONS
git pull origin main

# 4. RECONSTRUIRE LES IMAGES
docker-compose --env-file .env.production build

# 5. ARRÊTER L'APPLICATION
docker-compose --env-file .env.production down

# 6. REDÉMARRER AVEC LES NOUVELLES IMAGES
# Les migrations se lancent automatiquement au démarrage
docker-compose --env-file .env.production up -d

# 7. VÉRIFIER LES MIGRATIONS
docker logs nutrivault-backend 2>&1 | grep "migrating\|migrated"

# 8. VÉRIFIER L'APPLICATION
docker-compose ps
curl http://localhost/health
docker-compose logs -f backend
```

#### En cas de problème : Rollback complet

Si la nouvelle version pose problème, revenez à l'ancienne version :

```bash
# 1. ARRÊTER L'APPLICATION
docker-compose down

# 2. RESTAURER L'ANCIENNE VERSION DU CODE
BACKUP_DATE=20260123_143022  # Remplacer par votre date de sauvegarde
OLD_COMMIT=$(cat ~/nutrivault-backups/git-commit-${BACKUP_DATE}.txt)
git checkout $OLD_COMMIT

# 3. RESTAURER LA BASE DE DONNÉES
docker cp ~/nutrivault-backups/nutrivault-${BACKUP_DATE}.db nutrivault-backend:/app/data/nutrivault.db

# 4. RESTAURER LES UPLOADS (si nécessaire)
docker run --rm -v nutrivault-uploads:/data -v ~/nutrivault-backups:/backup alpine sh -c "cd /data && tar xzf /backup/uploads-${BACKUP_DATE}.tar.gz"

# 5. RECONSTRUIRE LES IMAGES AVEC L'ANCIENNE VERSION
docker-compose --env-file .env.production build

# 6. REDÉMARRER
docker-compose --env-file .env.production up -d

# 7. VÉRIFIER
docker-compose ps
curl http://localhost/health
```

#### Mise à jour mineure (sans changement de schéma DB)

Si vous savez qu'il n'y a pas de nouvelles migrations :

```bash
# 1. Sauvegarder quand même (par précaution)
docker cp nutrivault-backend:/app/data/nutrivault.db ~/nutrivault-backups/nutrivault-$(date +%Y%m%d).db

# 2. Mettre à jour le code
git pull origin main

# 3. Reconstruire et redémarrer
docker-compose --env-file .env.production up -d --build

# 4. Vérifier
docker-compose ps
docker-compose logs -f
```

### 💾 Sauvegarde et restauration détaillées

#### Sauvegarde complète

```bash
# Script de sauvegarde complète
BACKUP_DIR=~/nutrivault-backups
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "🔄 Sauvegarde en cours..."

# 1. Base de données SQLite
echo "📁 Sauvegarde de la base de données..."
docker cp nutrivault-backend:/app/data/nutrivault.db $BACKUP_DIR/nutrivault-${BACKUP_DATE}.db

# 2. Fichiers uploadés
echo "📁 Sauvegarde des fichiers uploadés..."
docker run --rm \
  -v nutrivault-uploads:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/uploads-${BACKUP_DATE}.tar.gz -C /data .

# 3. Configuration
echo "📁 Sauvegarde de la configuration..."
cp .env.production $BACKUP_DIR/.env.production-${BACKUP_DATE}

# 4. Version du code
echo "📁 Sauvegarde de la version Git..."
git rev-parse HEAD > $BACKUP_DIR/git-commit-${BACKUP_DATE}.txt
git log -1 --pretty=format:"%h - %s (%ci)" > $BACKUP_DIR/git-log-${BACKUP_DATE}.txt

# 5. Résumé
echo ""
echo "✅ Sauvegarde terminée !"
echo "📦 Fichiers créés dans : $BACKUP_DIR"
ls -lh $BACKUP_DIR/*${BACKUP_DATE}*
echo ""
echo "💡 Pour restaurer cette sauvegarde, utilisez : BACKUP_DATE=${BACKUP_DATE}"
```

#### Restauration complète

```bash
# Définir la date de sauvegarde à restaurer
BACKUP_DATE=20260123_143022  # À REMPLACER
BACKUP_DIR=~/nutrivault-backups

echo "🔄 Restauration de la sauvegarde ${BACKUP_DATE}..."

# 1. Arrêter l'application
echo "⏸️  Arrêt de l'application..."
docker-compose down

# 2. Restaurer la base de données
echo "📁 Restauration de la base de données..."
docker-compose up -d backend
sleep 5
docker cp $BACKUP_DIR/nutrivault-${BACKUP_DATE}.db nutrivault-backend:/app/data/nutrivault.db
docker-compose restart backend

# 3. Restaurer les fichiers uploadés
echo "📁 Restauration des fichiers uploadés..."
docker run --rm \
  -v nutrivault-uploads:/data \
  -v $BACKUP_DIR:/backup \
  alpine sh -c "rm -rf /data/* && cd /data && tar xzf /backup/uploads-${BACKUP_DATE}.tar.gz"

# 4. Restaurer la configuration (optionnel)
echo "📁 Restauration de la configuration..."
# cp $BACKUP_DIR/.env.production-${BACKUP_DATE} .env.production

# 5. Restaurer la version du code
if [ -f "$BACKUP_DIR/git-commit-${BACKUP_DATE}.txt" ]; then
  echo "📁 Restauration de la version du code..."
  OLD_COMMIT=$(cat $BACKUP_DIR/git-commit-${BACKUP_DATE}.txt)
  git checkout $OLD_COMMIT

  # Reconstruire les images
  docker-compose --env-file .env.production build
fi

# 6. Redémarrer l'application
echo "🚀 Redémarrage de l'application..."
docker-compose --env-file .env.production up -d

# 7. Vérifier
echo ""
echo "✅ Restauration terminée !"
echo "🔍 Vérification..."
sleep 5
docker-compose ps
curl http://localhost/health
```

#### Sauvegarde automatique (cron)

Pour sauvegarder automatiquement tous les jours à 2h du matin :

```bash
# Créer le script de sauvegarde
cat > ~/backup-nutrivault.sh << 'EOFBACKUP'
#!/bin/bash
BACKUP_DIR=~/nutrivault-backups
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
cd /chemin/vers/nutrivault  # À MODIFIER

mkdir -p $BACKUP_DIR

# Base de données
docker cp nutrivault-backend:/app/data/nutrivault.db $BACKUP_DIR/nutrivault-${BACKUP_DATE}.db

# Uploads
docker run --rm -v nutrivault-uploads:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/uploads-${BACKUP_DATE}.tar.gz -C /data .

# Garder seulement les 30 dernières sauvegardes
find $BACKUP_DIR -name "nutrivault-*.db" -mtime +30 -delete
find $BACKUP_DIR -name "uploads-*.tar.gz" -mtime +30 -delete

echo "$(date): Backup completed - ${BACKUP_DATE}" >> $BACKUP_DIR/backup.log
EOFBACKUP

chmod +x ~/backup-nutrivault.sh

# Ajouter au cron
crontab -e
# Ajouter cette ligne :
# 0 2 * * * /home/votreuser/backup-nutrivault.sh
```

### Gestion de la base de données

```bash
# Accéder au conteneur backend
docker exec -it nutrivault-backend sh

# Une fois dans le conteneur :
# Lancer une migration
npm run db:migrate

# Annuler la dernière migration
npm run db:migrate:undo

# Réinitialiser la base (DANGER !)
npm run db:reset

# Sortir du conteneur
exit
```

### Nettoyage

```bash
# Supprimer les conteneurs arrêtés
docker-compose down

# Supprimer aussi les volumes (ATTENTION : perte de données !)
docker-compose down -v

# Nettoyer les images inutilisées
docker image prune -a

# Nettoyage complet du système Docker
docker system prune -a --volumes
```

## 🔒 Sécurité

### Checklist de sécurité

- [ ] **Secrets JWT** : Générés avec `openssl rand -base64 64`
- [ ] **Fichier .env** : Protégé avec `chmod 600`
- [ ] **HTTPS** : Configuré avec certificat SSL valide
- [ ] **Pare-feu** : Seuls ports 80, 443, 22 ouverts
- [ ] **Mot de passe admin** : Changé après première connexion
- [ ] **CORS** : Configuré uniquement pour votre domaine
- [ ] **Updates** : Système et Docker à jour
- [ ] **Sauvegardes** : Automatisées quotidiennement
- [ ] **Logs** : Rotation configurée
- [ ] **Monitoring** : En place

### Bonnes pratiques

1. **Ne jamais exposer** le port backend (3001) publiquement
2. **Utiliser** des mots de passe forts (min 12 caractères)
3. **Activer** l'authentification à deux facteurs quand disponible
4. **Mettre à jour** régulièrement (sécurité et fonctionnalités)
5. **Sauvegarder** avant chaque mise à jour majeure
6. **Monitorer** les logs pour détecter activités suspectes
7. **Limiter** l'accès SSH par clé uniquement
8. **Configurer** fail2ban pour protéger contre bruteforce

## 🔍 Dépannage

### Les conteneurs ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs

# Vérifier l'état
docker-compose ps

# Problème courant : fichier .env
# Vérifier qu'il est présent et correctement configuré
cat .env.production
```

### Erreur de migration de base de données

#### Erreur "no such column" (ex: show_in_basic_info)

Si vous voyez une erreur comme `SQLITE_ERROR: no such column: CustomFieldDefinition.show_in_basic_info`:

**Cause :** Les migrations backend n'ont pas été exécutées. Le script `docker-entrypoint.sh` consolide maintenant automatiquement les migrations des deux répertoires (`/migrations/` et `/backend/migrations/`).

**Solution :**

```bash
# Option 1: Redémarrer le conteneur (recommandé)
# Les migrations s'exécutent automatiquement au démarrage
docker-compose restart backend

# Option 2: Exécuter manuellement
docker exec -it nutrivault-backend sh

# Vérifier l'état des migrations
npx sequelize-cli db:migrate:status

# Exécuter les migrations en attente
npm run db:migrate

# Sortir
exit
```

**Vérification :**

```bash
# Les logs doivent montrer :
docker-compose logs backend | grep -i "migration"

# Résultat attendu :
# 📦 Consolidating migrations...
# 🔄 Running database migrations...
# ✅ Migrations completed successfully
```

### Problème de connexion API

```bash
# Vérifier que le backend répond
curl http://localhost:3001/health

# Vérifier les logs du backend
docker-compose logs backend | grep ERROR

# Vérifier les variables d'environnement
docker exec nutrivault-backend env | grep JWT
```

### Erreur 502 Bad Gateway

Cela indique que Nginx ne peut pas joindre le backend.

```bash
# Vérifier que le backend est en cours d'exécution
docker-compose ps backend

# Vérifier la configuration nginx
docker exec nutrivault-frontend cat /etc/nginx/conf.d/default.conf

# Vérifier la connectivité réseau
docker network ls
docker network inspect nutrivault_nutrivault-network
```

### Performance lente

```bash
# Vérifier l'utilisation des ressources
docker stats

# Si nécessaire, augmenter les limites dans docker-compose.yml :
# services:
#   backend:
#     deploy:
#       resources:
#         limits:
#           memory: 2G
#         reservations:
#           memory: 1G
```

### Logs remplissent le disque

```bash
# Vérifier la taille des logs
docker-compose logs --tail=0 | wc -l

# Configurer la rotation dans docker-compose.yml :
# logging:
#   driver: "json-file"
#   options:
#     max-size: "10m"
#     max-file: "3"
```

## 📞 Support

- **Documentation** : `/docs` dans le projet
- **Issues** : https://github.com/erikbeauvalot-sg/nutrivault/issues
- **Email** : support@nutrivault.example.com

## 📝 Notes de version

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique des versions.

---

**Dernière mise à jour :** 2026-01-23
**Version :** 1.0.0
