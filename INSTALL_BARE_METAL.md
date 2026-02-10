# Installation NutriVault sur VM (sans Docker)

Guide d'installation sur une VM vierge Ubuntu/Debian, sans Docker.

## Prerequis systeme

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git sqlite3
```

## 1. Cloner le repo

```bash
cd /opt
git clone https://github.com/erikbeauvalot-sg/nutrivault.git
cd nutrivault
```

## 2. Installer les dependances

```bash
# Racine (config partagee, sequelize-cli, dotenv)
cd /opt/nutrivault && npm ci --production

# Backend
cd backend && npm ci --production
cd ..

# Frontend (build uniquement)
cd frontend && npm ci && npm run build
cd ..
```

## 3. Configurer l'environnement

```bash
cp .env.production.example backend/.env
chmod 600 backend/.env
```

Editer `backend/.env` :

```bash
NODE_ENV=production
PORT=3001
DB_STORAGE=/opt/nutrivault/backend/data/nutrivault.db

# Generer avec: openssl rand -base64 64
JWT_SECRET=<votre-secret-64-chars>
REFRESH_TOKEN_SECRET=<votre-secret-64-chars>
JWT_ACCESS_EXPIRATION=30m
JWT_REFRESH_EXPIRATION=30d
JWT_ISSUER=nutrivault-production

ALLOWED_ORIGINS=https://votre-domaine.com,capacitor://localhost
FRONTEND_URL=https://votre-domaine.com

# Email (Gmail avec app password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM_NAME=NutriVault

# Securite
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
MAX_FILE_SIZE=10485760
```

## 4. Initialiser la base de donnees

```bash
mkdir -p backend/data backend/uploads backend/logs

# Script tout-en-un : cree les tables, marque les migrations, lance les seeds
node scripts/init-bare-metal.js
```

Ce script :
1. Cree toutes les tables depuis les modeles Sequelize (`sync`)
2. Marque toutes les migrations comme appliquees (evite les conflits `duplicate column/index`)
3. Lance les seeders de base (roles, permissions, admin)
4. Lance les seeders fonctionnels (mesures, templates, etc.)

## 5. Configurer nginx

```bash
cat > /etc/nginx/sites-available/nutrivault << 'NGINX'
server {
    listen 80;
    server_name votre-domaine.com;

    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Frontend (fichiers statiques)
    root /opt/nutrivault/frontend/dist;
    index index.html;

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Public documents (no auth)
    location /public {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Uploads proxy
    location ^~ /uploads {
        proxy_pass http://127.0.0.1:3001/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        expires 1h;
        add_header Cache-Control "public";
    }

    # Static assets (long cache)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA fallback (React Router)
    location / {
        try_files $uri $uri/ /index.html;

        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/nutrivault /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

## 6. Creer le service systemd

```bash
cat > /etc/systemd/system/nutrivault.service << 'EOF'
[Unit]
Description=NutriVault Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/nutrivault/backend
EnvironmentFile=/opt/nutrivault/backend/.env
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:/opt/nutrivault/backend/logs/backend.log
StandardError=append:/opt/nutrivault/backend/logs/backend.log

[Install]
WantedBy=multi-user.target
EOF

# Permissions
chown -R www-data:www-data /opt/nutrivault/backend/data
chown -R www-data:www-data /opt/nutrivault/backend/uploads
chown -R www-data:www-data /opt/nutrivault/backend/logs

# Demarrer
systemctl daemon-reload
systemctl enable nutrivault
systemctl start nutrivault
```

## 7. SSL avec Let's Encrypt (recommande)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d votre-domaine.com
```

Le renouvellement est automatique via un timer systemd.

## 8. Verification

```bash
# Backend tourne
systemctl status nutrivault

# API repond
curl http://localhost:3001/health

# Nginx repond
curl http://localhost/health

# Logs
tail -f /opt/nutrivault/backend/logs/backend.log
```

## 9. Reinitialiser le mot de passe admin

Le mot de passe admin initial est affiche dans les logs au premier seed.
Pour le reinitialiser :

```bash
cd /opt/nutrivault/backend
node scripts/reset-admin-password.js "NouveauMotDePasse"
```

---

## Mise a jour

```bash
cd /opt/nutrivault
git pull origin main

# Backend
cd backend && npm ci --production && npx sequelize-cli db:migrate
cd ..

# Frontend
cd frontend && npm ci && npm run build
cd ..

# Redemarrer
systemctl restart nutrivault
```

---

## Sauvegarde

```bash
# Base de donnees
cp /opt/nutrivault/backend/data/nutrivault.db /backups/nutrivault_$(date +%Y%m%d).db

# Uploads
tar czf /backups/uploads_$(date +%Y%m%d).tar.gz /opt/nutrivault/backend/uploads/
```
