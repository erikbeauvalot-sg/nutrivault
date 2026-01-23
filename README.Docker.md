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
```

Accédez à l'application sur **http://localhost**

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
- [ ] Permissions du fichier .env : `chmod 600`
- [ ] Docker et Docker Compose installés
- [ ] Pare-feu configuré
- [ ] HTTPS/SSL configuré
- [ ] Sauvegardes automatiques en place
- [ ] Monitoring configuré

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
