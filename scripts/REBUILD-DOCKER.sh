#!/bin/bash
# Script pour rebuilder Docker avec le code le plus récent

echo "🔄 Rebuild Docker avec le dernier code"
echo "========================================"
echo ""

echo "1. Récupération du code le plus récent..."
git pull origin main
echo ""

echo "2. Affichage du dernier commit..."
git log -1 --oneline
echo ""

echo "3. Arrêt des conteneurs..."
docker-compose down
echo ""

echo "4. Nettoyage des images et du cache Docker..."
docker-compose build --no-cache --pull
echo ""

echo "5. Démarrage des nouveaux conteneurs..."
docker-compose up -d
echo ""

echo "6. Vérification du statut..."
sleep 5
docker-compose ps
echo ""

echo "7. Affichage des logs du frontend (build)..."
docker-compose logs frontend | tail -30
echo ""

echo "========================================"
echo "✅ Rebuild terminé!"
echo ""
echo "Si le build a réussi, vérifiez l'application sur:"
echo "  http://localhost"
echo ""
echo "Pour voir les logs en temps réel:"
echo "  docker-compose logs -f"
echo "========================================"
