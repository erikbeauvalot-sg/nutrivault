# 🐳 NutriVault - Déploiement Docker

Guide rapide pour déployer NutriVault avec Docker en production.

## 🚀 Démarrage rapide (5 minutes)

```bash
# 1. Générer les secrets JWT
openssl rand -base64 64  # Pour JWT_SECRET
openssl rand -base64 64  # Pour REFRESH_TOKEN_SECRET

# 2. Configurer l'environnement
cp .env.production.example .env.production
nano .env.production  # Éditer avec vos valeurs

# 3. Protéger la configuration
chmod 600 .env.production

# 4. Lancer l'application
docker-compose --env-file .env.production up -d --build

# 5. Vérifier
docker-compose ps
curl http://localhost/health

# 6. Créer l'utilisateur admin (IMPORTANT!)
# Voir la section "Création de l'utilisateur admin" ci-dessous
```

**Note :** Les permissions système sont maintenant initialisées **automatiquement** lors des migrations de base de données (étape 4). Vous n'avez plus besoin d'exécuter un script séparé.

Accédez à l'application sur **http://localhost**

### 👤 Gestion de l'utilisateur admin

**IMPORTANT :** L'utilisateur admin n'est pas créé automatiquement.

#### Créer l'utilisateur admin (première fois)

**Option 1 : Script helper (recommandé)**

```bash
# Avec mot de passe personnalisé
docker exec nutrivault-backend node /app/scripts/create-admin.js "VotreMotDePasseSecurise123!"

# Avec mot de passe par défaut (à changer après connexion)
docker exec nutrivault-backend node /app/scripts/create-admin.js
```

**Ce que fait ce script :**
- Crée le rôle ADMIN s'il n'existe pas
- **Associe automatiquement toutes les permissions système au rôle ADMIN**
- Crée l'utilisateur admin avec le mot de passe spécifié

**Note :** Si l'utilisateur admin existe déjà, ce script refusera de le recréer.

#### Réinitialiser le mot de passe admin

Si vous avez oublié le mot de passe ou souhaitez le changer :

```bash
# Avec un nouveau mot de passe personnalisé
docker exec nutrivault-backend node /app/scripts/reset-admin-password.js "NouveauMotDePasse123!"

# Avec mot de passe par défaut (à changer après connexion)
docker exec nutrivault-backend node /app/scripts/reset-admin-password.js
```

#### Script complet (alternative)

```bash
docker exec nutrivault-backend sh -c "cat > /tmp/create-admin.js << 'EOF'
const bcrypt = require('bcryptjs');
const db = require('/models');
(async () => {
  try {
    const existingAdmin = await db.User.findOne({ where: { username: 'admin' } });
    if (existingAdmin) { console.log('⚠️  Admin exists'); process.exit(0); }
    let adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
    if (!adminRole) adminRole = await db.Role.create({ name: 'ADMIN' });
    const hashedPassword = await bcrypt.hash('VOTRE_MOT_DE_PASSE_ICI', 10);
    await db.User.create({
      username: 'admin',
      email: 'admin@example.com',
      password_hash: hashedPassword,
      role_id: adminRole.id,
      first_name: 'Admin',
      last_name: 'User',
      is_active: true
    });
    console.log('✅ Admin created!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
EOF
node /tmp/create-admin.js && rm /tmp/create-admin.js"
```

⚠️ **Remplacez `VOTRE_MOT_DE_PASSE_ICI` par un mot de passe fort !**

### 🔐 Permissions système (Automatiques)

Les permissions système sont **initialisées automatiquement** lors des migrations de base de données (étape 4 du démarrage).

La migration crée automatiquement **26 permissions** et les associe au rôle ADMIN :

- **Patients** (4) : create, read, update, delete
- **Visits** (4) : create, read, update, delete
- **Billing** (4) : create, read, update, delete
- **Documents** (6) : upload, read, download, update, delete, share
- **Users** (4) : create, read, update, delete
- **Reports** (2) : view, export
- **System** (2) : settings, logs

**Aucune action manuelle requise** - les permissions sont créées au premier démarrage du conteneur.

**💡 Déploiements existants :**
Si vous avez déployé avant cette mise à jour, exécutez simplement les migrations :
```bash
docker exec nutrivault-backend npm run db:migrate
```

⚠️ **Important :** Déconnectez-vous et reconnectez-vous après la création de l'admin pour obtenir un token JWT avec toutes les permissions.

## 📁 Structure des fichiers Docker

```
nutrivault/
├── docker-compose.yml              # Orchestration des services
├── .env.production.example         # Template de configuration
├── backend/
│   ├── Dockerfile                  # Image backend Node.js
│   ├── .dockerignore              # Fichiers exclus du build
│   └── scripts/
│       └── docker-entrypoint.sh   # Script de démarrage
└── frontend/
    ├── Dockerfile                  # Image frontend Nginx
    ├── nginx.conf                  # Configuration Nginx
    └── .dockerignore              # Fichiers exclus du build
```

## 🛠️ Commandes essentielles

### Gestion des services

```bash
# Démarrer
docker-compose --env-file .env.production up -d

# Arrêter
docker-compose down

# Redémarrer
docker-compose restart

# Logs en temps réel
docker-compose logs -f

# État des services
docker-compose ps
```

### Mise à jour

```bash
# Récupérer les modifications
git pull origin main

# Reconstruire et redémarrer
docker-compose --env-file .env.production up -d --build
```

### Sauvegarde

```bash
# Sauvegarder la base de données
docker cp nutrivault-backend:/app/data/nutrivault.db ./backup-$(date +%Y%m%d).db

# Sauvegarder les uploads
docker run --rm -v nutrivault-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .
```

## 🏗️ Architecture

```
┌──────────────┐
│   Internet   │
└──────┬───────┘
       │ :80
       ▼
┌──────────────────┐
│  Frontend        │
│  (Nginx)         │
│  - React SPA     │
│  - API Proxy     │
└──────┬───────────┘
       │ Docker network
       ▼
┌──────────────────┐
│  Backend         │
│  (Node.js)       │
│  - API REST      │
│  - Auth JWT      │
└──────┬───────────┘
       │ Volumes
       ▼
┌──────────────────┐
│  Données         │
│  - SQLite DB     │
│  - Uploads       │
│  - Logs          │
└──────────────────┘
```

## 🔒 Sécurité

**Avant de déployer en production :**

✅ Générer des secrets JWT forts avec `openssl rand -base64 64`
✅ Configurer HTTPS avec un certificat SSL
✅ Définir `ALLOWED_ORIGINS` avec votre domaine uniquement
✅ Utiliser un mot de passe admin fort (12+ caractères)
✅ Protéger `.env.production` avec `chmod 600`
✅ Ne jamais exposer le port 3001 publiquement
✅ Configurer un pare-feu (ports 80, 443, 22 seulement)
✅ Mettre en place des sauvegardes automatiques

## 🔧 Configuration minimale requise

**Serveur :**
- CPU : 2 cœurs (4 recommandés)
- RAM : 2 GB (4 GB recommandés)
- Disque : 10 GB (50 GB recommandés)

**Logiciels :**
- Docker 20.10+
- Docker Compose 2.0+
- OpenSSL

## 📊 Variables d'environnement principales

| Variable | Description | Exemple |
|----------|-------------|---------|
| `JWT_SECRET` | Secret pour les tokens JWT | Généré avec openssl |
| `REFRESH_TOKEN_SECRET` | Secret pour refresh tokens | Généré avec openssl |
| `ALLOWED_ORIGINS` | Domaines autorisés (CORS) | `https://app.example.com` |
| `EMAIL_USER` | Adresse email SMTP | `noreply@example.com` |
| `EMAIL_PASSWORD` | Mot de passe email | App-specific password |
| `ADMIN_USERNAME` | Nom d'utilisateur admin | `admin` |
| `ADMIN_PASSWORD` | Mot de passe admin | Mot de passe fort |
| `CREATE_ADMIN` | Créer l'admin au démarrage | `true` (première fois) |

## 🐛 Dépannage rapide

### Les conteneurs ne démarrent pas
```bash
docker-compose logs
```

### Erreur 502 Bad Gateway
```bash
# Vérifier que le backend est démarré
docker-compose ps backend
docker-compose logs backend
```

### Problème de connexion API
```bash
# Tester le backend directement
curl http://localhost:3001/health

# Vérifier les variables d'environnement
docker exec nutrivault-backend env | grep JWT
```

### Base de données corrompue
```bash
# Arrêter les services
docker-compose down

# Restaurer depuis une sauvegarde
docker cp ./backup-20260123.db nutrivault-backend:/app/data/nutrivault.db

# Redémarrer
docker-compose up -d
```

## 📖 Documentation complète

Pour un guide détaillé de déploiement, consultez [DEPLOYMENT.md](DEPLOYMENT.md).

Le guide complet couvre :
- Installation pas à pas sur différents OS
- Configuration HTTPS/SSL
- Sauvegardes et restauration
- Monitoring et maintenance
- Sécurité avancée
- Résolution de problèmes

## 🌐 Ports utilisés

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80 | Interface web (HTTP) |
| Backend | 3001 | API REST (interne seulement) |

**Note :** Le port backend (3001) ne doit JAMAIS être exposé publiquement. Seul Nginx y accède en interne.

## 📝 Checklist de déploiement

Avant de déployer en production :

- [ ] Fichier `.env.production` configuré
- [ ] Secrets JWT générés et uniques
- [ ] CORS configuré avec le bon domaine
- [ ] Email SMTP configuré et testé
- [ ] Mot de passe admin fort défini
- [ ] Utilisateur admin créé avec `create-admin.js`
- [ ] Permissions du fichier .env : `chmod 600`
- [ ] Docker et Docker Compose installés
- [ ] Pare-feu configuré
- [ ] HTTPS/SSL configuré
- [ ] Sauvegardes automatiques en place
- [ ] Monitoring configuré

**Note :** Les permissions système sont créées automatiquement via les migrations

## 🔗 Liens utiles

- **Documentation complète** : [DEPLOYMENT.md](DEPLOYMENT.md)
- **Performance** : [PERFORMANCE.md](PERFORMANCE.md)
- **Email Setup** : [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md)
- **Repository** : https://github.com/erikbeauvalot-sg/nutrivault

## 💡 Support

Pour toute question ou problème :
- Consultez [DEPLOYMENT.md](DEPLOYMENT.md) pour des solutions détaillées
- Ouvrez une issue sur GitHub
- Vérifiez les logs avec `docker-compose logs -f`

---

**Version :** 1.0.0
**Dernière mise à jour :** 2026-01-23
