#!/bin/bash

# NutriVault Docker Stop Script

echo "Stopping NutriVault containers..."

# Check if containers are running
if docker-compose ps | grep -q "nutrivault"; then
    docker-compose down
    echo "✓ Containers stopped and removed"
else
    echo "No running containers found"
fi

echo ""
echo "To remove all data (database, uploads, logs), run:"
echo "  docker-compose down -v"
echo ""
