#!/bin/bash
##############################################################################
# NutriVault - Script de correction des permissions
# Usage: ./fix-permissions.sh
#
# Ce script corrige les permissions sur les volumes Docker pour que
# l'utilisateur nodejs (UID 1001) puisse écrire dans la base de données
##############################################################################

set -e

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  NutriVault - Correction des permissions"
echo "═══════════════════════════════════════════════════════"
echo ""

# Vérifier que Docker est en cours d'exécution
if ! docker ps >/dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution"
    exit 1
fi

echo "🔍 Vérification des permissions actuelles..."
echo ""
docker exec nutrivault-backend ls -la /app/data/ 2>/dev/null || echo "⚠️  Conteneur backend non accessible"
echo ""

echo "🔧 Correction des permissions sur les volumes..."
echo ""

# Arrêter le backend pour éviter les conflits
echo "⏸️  Arrêt temporaire du backend..."
docker-compose stop backend

# Corriger les permissions sur le volume de données
echo "📁 Correction des permissions sur nutrivault-data..."
docker run --rm \
    -v nutrivault_nutrivault-data:/data \
    alpine sh -c "
        chown -R 1001:1001 /data
        chmod -R 755 /data
        if [ -f /data/nutrivault.db ]; then
            chmod 644 /data/nutrivault.db
        fi
        echo '✅ Permissions data corrigées'
        ls -la /data
    "

# Corriger les permissions sur le volume uploads
echo ""
echo "📁 Correction des permissions sur nutrivault-uploads..."
docker run --rm \
    -v nutrivault_nutrivault-uploads:/uploads \
    alpine sh -c "
        chown -R 1001:1001 /uploads
        chmod -R 755 /uploads
        echo '✅ Permissions uploads corrigées'
    "

# Corriger les permissions sur le volume logs
echo ""
echo "📁 Correction des permissions sur nutrivault-logs..."
docker run --rm \
    -v nutrivault_nutrivault-logs:/logs \
    alpine sh -c "
        chown -R 1001:1001 /logs
        chmod -R 755 /logs
        echo '✅ Permissions logs corrigées'
    "

# Redémarrer le backend
echo ""
echo "🚀 Redémarrage du backend..."
docker-compose start backend

# Attendre que le backend démarre
sleep 5

echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "✅ Permissions corrigées avec succès !"
echo ""
echo "🔍 Vérification finale..."
echo ""
docker exec nutrivault-backend ls -la /app/data/
echo ""
echo "📝 Test d'écriture..."
docker exec nutrivault-backend sh -c "touch /app/data/.test && rm /app/data/.test && echo '✅ Écriture OK'" || echo "❌ Écriture KO"
echo ""
echo "🎯 Vous pouvez maintenant utiliser les scripts reset-admin-password.js"
echo ""
