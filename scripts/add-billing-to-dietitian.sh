#!/bin/bash
# Add Billing Permissions to DIETITIAN Role

echo "💰 Adding Billing Permissions to DIETITIAN Role"
echo "================================================"
echo ""

echo "This will add billing permissions to the DIETITIAN role:"
echo "  - billing.read (view invoices)"
echo "  - billing.create (create invoices)"
echo "  - billing.update (edit invoices, record payments)"
echo ""
echo "⚠️  Note: billing.delete will NOT be added (reserved for ADMIN)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Adding billing permissions to DIETITIAN role..."

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

    // Get billing permissions (excluding delete)
    const billingPermissions = await db.Permission.findAll({
      where: {
        resource: 'billing',
        action: {
          [db.Sequelize.Op.in]: ['read', 'create', 'update']
        }
      }
    });

    console.log(\`Found \${billingPermissions.length} billing permissions to add:\`);
    billingPermissions.forEach(p => {
      console.log('  - ' + p.code + ': ' + p.description);
    });
    console.log('');

    // Merge with existing permissions
    const allPermissionIds = [
      ...new Set([
        ...currentPermissions.map(p => p.id),
        ...billingPermissions.map(p => p.id)
      ])
    ];

    // Update role permissions
    await dietitianRole.setPermissions(allPermissionIds);

    console.log('✅ Billing permissions added to DIETITIAN role');
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
    } else {
      console.log('ℹ️  No users currently have the DIETITIAN role');
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
echo "================================================"
echo "✅ Done!"
echo ""
echo "Next steps:"
echo "  1. Ask DIETITIAN users to log out and log back in"
echo "  2. Verify access to billing page"
echo "  3. Check with: ./check-user-permissions.sh <username>"
echo "================================================"
