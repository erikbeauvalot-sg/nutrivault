#!/bin/bash
# Remove Billing Permissions from DIETITIAN Role

echo "💰 Removing Billing Permissions from DIETITIAN Role"
echo "===================================================="
echo ""

echo "This will remove billing permissions from the DIETITIAN role:"
echo "  - billing.read"
echo "  - billing.create"
echo "  - billing.update"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Removing billing permissions from DIETITIAN role..."

docker exec nutrivault-backend node -e "
const db = require('/models');

(async () => {
  try {
    // Find DIETITIAN role
    const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });

    if (!dietitianRole) {
      console.error('❌ DIETITIAN role not found!');
      process.exit(1);
    }

    console.log('✅ DIETITIAN role found');
    console.log('');

    // Get current permissions
    const currentPermissions = await dietitianRole.getPermissions();
    console.log(\`Current permissions: \${currentPermissions.length}\`);

    // Filter out billing permissions
    const nonBillingPermissions = currentPermissions.filter(p => p.resource !== 'billing');

    console.log(\`Removing \${currentPermissions.length - nonBillingPermissions.length} billing permissions\`);
    console.log('');

    // Update role permissions
    await dietitianRole.setPermissions(nonBillingPermissions);

    console.log('✅ Billing permissions removed from DIETITIAN role');
    console.log('');

    // Verify
    const updatedPermissions = await dietitianRole.getPermissions();
    console.log(\`Total permissions now: \${updatedPermissions.length}\`);
    console.log('');

    // Group by resource
    const byResource = {};
    updatedPermissions.forEach(p => {
      if (!byResource[p.resource]) byResource[p.resource] = [];
      byResource[p.resource].push(p.action);
    });

    console.log('Permissions by resource:');
    Object.keys(byResource).sort().forEach(resource => {
      console.log('  ' + resource + ': ' + byResource[resource].sort().join(', '));
    });
    console.log('');

    // Find affected users
    const dietitianUsers = await db.User.findAll({
      where: { role_id: dietitianRole.id },
      attributes: ['id', 'username', 'email']
    });

    if (dietitianUsers.length > 0) {
      console.log('Affected DIETITIAN users (' + dietitianUsers.length + '):');
      dietitianUsers.forEach(u => {
        console.log('  - ' + u.username + ' (' + u.email + ')');
      });
      console.log('');
      console.log('⚠️  IMPORTANT: These users must log out and log back in!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
"

echo ""
echo "===================================================="
echo "✅ Done!"
echo ""
echo "Next steps:"
echo "  1. Ask DIETITIAN users to log out and log back in"
echo "  2. Verify they no longer have access to billing page"
echo "  3. Check with: ./check-user-permissions.sh <username>"
echo "===================================================="
