#!/bin/bash
# Check Roles and Permissions Status

echo "🔍 Checking Roles and Permissions"
echo "=================================="
echo ""

echo "1. Checking roles..."
docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT id, name, description FROM roles ORDER BY name;" 2>/dev/null
ROLE_COUNT=$(docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM roles;" 2>/dev/null)
echo "Total roles: $ROLE_COUNT"
echo ""

echo "2. Checking permissions..."
PERM_COUNT=$(docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM permissions;" 2>/dev/null)
echo "Total permissions: $PERM_COUNT"
echo ""

if [ "$PERM_COUNT" -gt 0 ]; then
  echo "Permissions by resource:"
  docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT resource, COUNT(*) as count FROM permissions GROUP BY resource ORDER BY resource;" 2>/dev/null
  echo ""
fi

echo "3. Checking role-permission associations..."
docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "
  SELECT r.name as role, COUNT(rp.permission_id) as permissions
  FROM roles r
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  GROUP BY r.id, r.name
  ORDER BY r.name;
" 2>/dev/null
echo ""

echo "4. Checking admin user role..."
docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "
  SELECT u.username, r.name as role
  FROM users u
  LEFT JOIN roles r ON u.role_id = r.id
  WHERE u.username = 'admin';
" 2>/dev/null
echo ""

echo "=================================="
echo "Summary:"
echo "  Roles: $ROLE_COUNT"
echo "  Permissions: $PERM_COUNT"
echo ""

if [ "$ROLE_COUNT" -eq 0 ]; then
  echo "⚠️  WARNING: No roles found!"
  echo "Run: ./init-roles-permissions.sh"
elif [ "$PERM_COUNT" -eq 0 ]; then
  echo "⚠️  WARNING: No permissions found!"
  echo "Run: ./init-roles-permissions.sh"
else
  echo "✅ Roles and permissions exist"
fi

echo "=================================="
