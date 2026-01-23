#!/bin/bash
##############################################################################
# NutriVault - Script de restauration
# Usage: BACKUP_DATE=20260123_143022 ./restore.sh
#    ou: ./restore.sh [backup-date]
##############################################################################

set -e

# Configuration
BACKUP_DATE="${1:-$BACKUP_DATE}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/nutrivault-backups}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_step() {
    echo -e "${BLUE}▶${NC} $1"
}

# Vérifier que BACKUP_DATE est fourni
if [ -z "$BACKUP_DATE" ]; then
    echo ""
    log_error "BACKUP_DATE non spécifié !"
    echo ""
    echo "Usage :"
    echo "  BACKUP_DATE=20260123_143022 ./restore.sh"
    echo "  ou"
    echo "  ./restore.sh 20260123_143022"
    echo ""
    echo "Sauvegardes disponibles :"
    ls -1 "$BACKUP_DIR"/nutrivault-*.db 2>/dev/null | sed 's/.*nutrivault-\(.*\)\.db/  \1/' | sort -r | head -10
    echo ""
    exit 1
fi

cd "$PROJECT_DIR"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  NutriVault - Restauration de sauvegarde"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📁 Répertoire de sauvegarde : $BACKUP_DIR"
echo "📅 Sauvegarde à restaurer   : $BACKUP_DATE"
echo ""

# Vérifier que les fichiers de sauvegarde existent
if [ ! -f "$BACKUP_DIR/nutrivault-${BACKUP_DATE}.db" ]; then
    log_error "Sauvegarde non trouvée : $BACKUP_DIR/nutrivault-${BACKUP_DATE}.db"
    echo ""
    echo "Sauvegardes disponibles :"
    ls -1 "$BACKUP_DIR"/nutrivault-*.db 2>/dev/null | sed 's/.*nutrivault-\(.*\)\.db/  \1/' | sort -r
    echo ""
    exit 1
fi

# Afficher les informations de la sauvegarde
if [ -f "$BACKUP_DIR/backup-${BACKUP_DATE}.info" ]; then
    echo "📋 Informations de la sauvegarde :"
    cat "$BACKUP_DIR/backup-${BACKUP_DATE}.info"
    echo ""
fi

# Demander confirmation
read -p "⚠️  Voulez-vous vraiment restaurer cette sauvegarde ? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warn "Restauration annulée"
    exit 0
fi

echo ""
log_step "Démarrage de la restauration..."
echo ""

# 1. Arrêter l'application
log_step "1/7 - Arrêt de l'application..."
docker-compose down

# 2. Démarrer le backend seul pour la restauration
log_step "2/7 - Démarrage du conteneur backend..."
docker-compose --env-file .env.production up -d backend
sleep 5

# 3. Restaurer la base de données
log_step "3/7 - Restauration de la base de données..."
docker cp "$BACKUP_DIR/nutrivault-${BACKUP_DATE}.db" nutrivault-backend:/app/data/nutrivault.db

if [ $? -eq 0 ]; then
    log_info "Base de données restaurée"
else
    log_error "Échec de la restauration de la base de données"
    exit 1
fi

# 4. Restaurer les fichiers uploadés
log_step "4/7 - Restauration des fichiers uploadés..."
if [ -f "$BACKUP_DIR/uploads-${BACKUP_DATE}.tar.gz" ]; then
    docker run --rm \
        -v nutrivault-uploads:/data \
        -v "$BACKUP_DIR":/backup \
        alpine sh -c "rm -rf /data/* && cd /data && tar xzf /backup/uploads-${BACKUP_DATE}.tar.gz"

    if [ $? -eq 0 ]; then
        log_info "Fichiers uploadés restaurés"
    else
        log_warn "Échec de la restauration des fichiers uploadés"
    fi
else
    log_warn "Aucun fichier uploadé à restaurer"
fi

# 5. Restaurer la configuration (optionnel)
log_step "5/7 - Configuration..."
if [ -f "$BACKUP_DIR/.env.production-${BACKUP_DATE}" ]; then
    read -p "   Restaurer la configuration .env.production ? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp "$BACKUP_DIR/.env.production-${BACKUP_DATE}" .env.production
        log_info "Configuration restaurée"
    else
        log_warn "Configuration non restaurée (conserve la version actuelle)"
    fi
else
    log_warn "Pas de fichier de configuration dans la sauvegarde"
fi

# 6. Restaurer la version du code
log_step "6/7 - Version du code..."
if [ -f "$BACKUP_DIR/git-commit-${BACKUP_DATE}.txt" ]; then
    read -p "   Restaurer la version du code correspondante ? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        OLD_COMMIT=$(cat "$BACKUP_DIR/git-commit-${BACKUP_DATE}.txt")
        git checkout "$OLD_COMMIT" 2>/dev/null

        if [ $? -eq 0 ]; then
            log_info "Code restauré au commit : $OLD_COMMIT"

            # Reconstruire les images
            log_step "   Reconstruction des images Docker..."
            docker-compose --env-file .env.production build
            log_info "Images reconstruites"
        else
            log_error "Échec de la restauration du code"
            log_warn "Vous pouvez le faire manuellement : git checkout $OLD_COMMIT"
        fi
    else
        log_warn "Version du code non restaurée (conserve la version actuelle)"
    fi
else
    log_warn "Pas d'information de version dans la sauvegarde"
fi

# 7. Redémarrer l'application
log_step "7/7 - Redémarrage de l'application..."
docker-compose --env-file .env.production up -d

sleep 5

# Vérifier l'état
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
log_info "Restauration terminée !"
echo ""
echo "🔍 Vérification de l'état de l'application :"
echo ""

docker-compose ps

echo ""
echo "🌐 Test de santé :"
if curl -f http://localhost/health >/dev/null 2>&1; then
    log_info "Frontend : OK"
else
    log_warn "Frontend : Non accessible"
fi

if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    log_info "Backend : OK"
else
    log_warn "Backend : Non accessible"
fi

echo ""
echo "📋 Pour voir les logs :"
echo "   docker-compose logs -f"
echo ""
