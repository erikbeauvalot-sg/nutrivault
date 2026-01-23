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

#### 4.2 Test de connexion

```bash
# Se connecter avec le compte admin créé
# URL : http://votre-serveur.com
# Username : admin
# Password : (celui défini dans ADMIN_PASSWORD)
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

### Mise à jour de l'application

```bash
# 1. Récupérer les dernières modifications
git pull origin main

# 2. Reconstruire les images
docker-compose --env-file .env.production build

# 3. Redémarrer avec les nouvelles images
docker-compose --env-file .env.production up -d

# 4. Vérifier
docker-compose ps
docker-compose logs -f
```

### Sauvegarde et restauration

#### Sauvegarde

```bash
# Créer un répertoire de sauvegarde
mkdir -p ~/nutrivault-backups

# Sauvegarder la base de données
docker cp nutrivault-backend:/app/data/nutrivault.db ~/nutrivault-backups/nutrivault-$(date +%Y%m%d).db

# Sauvegarder les uploads
docker run --rm -v nutrivault-uploads:/data -v ~/nutrivault-backups:/backup alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .

# Sauvegarder la configuration
cp .env.production ~/nutrivault-backups/.env.production-$(date +%Y%m%d)
```

#### Restauration

```bash
# Restaurer la base de données
docker cp ~/nutrivault-backups/nutrivault-20260123.db nutrivault-backend:/app/data/nutrivault.db

# Redémarrer le backend
docker-compose restart backend
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

```bash
# Accéder au conteneur
docker exec -it nutrivault-backend sh

# Vérifier l'état des migrations
npx sequelize-cli db:migrate:status

# Forcer une migration
npm run db:migrate

# Sortir
exit
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
