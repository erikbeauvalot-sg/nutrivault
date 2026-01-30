#!/bin/bash
##############################################################################
# NutriVault - Script de sauvegarde automatique
# Usage: ./backup.sh [backup-directory]
##############################################################################

set -e

# Configuration
BACKUP_DIR="${1:-$HOME/nutrivault-backups}"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction d'affichage
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Vérifier que Docker est en cours d'exécution
if ! docker ps >/dev/null 2>&1; then
    log_error "Docker n'est pas en cours d'exécution"
    exit 1
fi

# Créer le répertoire de sauvegarde
mkdir -p "$BACKUP_DIR"

cd "$PROJECT_DIR"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  NutriVault - Sauvegarde automatique"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📁 Répertoire de sauvegarde : $BACKUP_DIR"
echo "📅 Date de sauvegarde       : $BACKUP_DATE"
echo ""

# 1. Vérifier que les conteneurs sont en cours d'exécution
log_info "Vérification des conteneurs..."
if ! docker ps | grep -q nutrivault-backend; then
    log_warn "Le conteneur backend n'est pas en cours d'exécution"
    log_warn "Démarrage du conteneur pour la sauvegarde..."
    docker-compose --env-file .env.production up -d backend
    sleep 5
fi

# 2. Sauvegarder la base de données
log_info "Sauvegarde de la base de données SQLite..."
docker cp nutrivault-backend:/app/data/nutrivault.db "$BACKUP_DIR/nutrivault-${BACKUP_DATE}.db"

if [ -f "$BACKUP_DIR/nutrivault-${BACKUP_DATE}.db" ]; then
    DB_SIZE=$(du -h "$BACKUP_DIR/nutrivault-${BACKUP_DATE}.db" | cut -f1)
    log_info "Base de données sauvegardée (${DB_SIZE})"
else
    log_error "Échec de la sauvegarde de la base de données"
    exit 1
fi

# 3. Sauvegarder les fichiers uploadés
log_info "Sauvegarde des fichiers uploadés..."
docker run --rm \
    -v nutrivault-uploads:/data \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf "/backup/uploads-${BACKUP_DATE}.tar.gz" -C /data . 2>/dev/null

if [ -f "$BACKUP_DIR/uploads-${BACKUP_DATE}.tar.gz" ]; then
    UPLOADS_SIZE=$(du -h "$BACKUP_DIR/uploads-${BACKUP_DATE}.tar.gz" | cut -f1)
    log_info "Fichiers uploadés sauvegardés (${UPLOADS_SIZE})"
else
    log_warn "Aucun fichier uploadé à sauvegarder ou échec de la sauvegarde"
fi

# 4. Sauvegarder la configuration
log_info "Sauvegarde de la configuration..."
if [ -f ".env.production" ]; then
    cp .env.production "$BACKUP_DIR/.env.production-${BACKUP_DATE}"
    log_info "Configuration sauvegardée"
else
    log_warn "Fichier .env.production non trouvé"
fi

# 5. Sauvegarder la version Git
log_info "Enregistrement de la version du code..."
git rev-parse HEAD > "$BACKUP_DIR/git-commit-${BACKUP_DATE}.txt" 2>/dev/null || true
git log -1 --pretty=format:"%h - %s (%ci)" > "$BACKUP_DIR/git-log-${BACKUP_DATE}.txt" 2>/dev/null || true

# 6. Créer un fichier de métadonnées
cat > "$BACKUP_DIR/backup-${BACKUP_DATE}.info" << EOF
NutriVault Backup Information
==============================
Date: $(date)
Backup ID: ${BACKUP_DATE}
Project Directory: ${PROJECT_DIR}
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "N/A")

Files Created:
- nutrivault-${BACKUP_DATE}.db
- uploads-${BACKUP_DATE}.tar.gz
- .env.production-${BACKUP_DATE}
- git-commit-${BACKUP_DATE}.txt
- git-log-${BACKUP_DATE}.txt
- backup-${BACKUP_DATE}.info

Restoration Command:
  BACKUP_DATE=${BACKUP_DATE} ./restore.sh

EOF

# 7. Nettoyer les anciennes sauvegardes (garder les 30 dernières)
log_info "Nettoyage des anciennes sauvegardes..."
find "$BACKUP_DIR" -name "nutrivault-*.db" -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "uploads-*.tar.gz" -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name ".env.production-*" -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "git-commit-*.txt" -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "git-log-*.txt" -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "backup-*.info" -mtime +30 -delete 2>/dev/null || true

# 8. Résumé
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
log_info "Sauvegarde terminée avec succès !"
echo ""
echo "📦 Fichiers sauvegardés dans : $BACKUP_DIR"
echo ""
ls -lh "$BACKUP_DIR"/*${BACKUP_DATE}* 2>/dev/null || true
echo ""
echo "💾 Pour restaurer cette sauvegarde :"
echo "   BACKUP_DATE=${BACKUP_DATE} ./restore.sh"
echo ""
echo "📋 Nombre total de sauvegardes : $(ls -1 "$BACKUP_DIR"/nutrivault-*.db 2>/dev/null | wc -l)"
echo ""
