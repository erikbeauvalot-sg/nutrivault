#!/bin/bash
# Fix DIETITIAN Role Permissions

echo "🔧 Fixing DIETITIAN Role Permissions"
echo "====================================="
echo ""

echo "This script will assign the correct permissions to the DIETITIAN role."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Updating DIETITIAN role permissions..."

docker exec nutrivault-backend node -e "
const db = require('/models');

(async () => {
  try {
    // Find DIETITIAN role
    const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });

    if (!dietitianRole) {
      console.error('❌ DIETITIAN role not found!');
      console.log('');
      console.log('Create it first by running:');
      console.log('  ./init-roles-permissions.sh');
      process.exit(1);
    }

    console.log('✅ DIETITIAN role found');
    console.log('');

    // Get all permissions that DIETITIAN should have
    const dietitianPermissions = await db.Permission.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          // All patient permissions
          { resource: 'patients' },
          // All visit permissions
          { resource: 'visits' },
          // All document permissions
          { resource: 'documents' },
          // View and export reports
          { resource: 'reports' }
        ]
      }
    });

    console.log(\`Found \${dietitianPermissions.length} permissions for DIETITIAN role:\`);

    // Group and display
    const byResource = {};
    dietitianPermissions.forEach(p => {
      if (!byResource[p.resource]) byResource[p.resource] = [];
      byResource[p.resource].push(p.action);
    });

    Object.keys(byResource).sort().forEach(resource => {
      console.log('  ' + resource + ': ' + byResource[resource].sort().join(', '));
    });
    console.log('');

    // Assign permissions to DIETITIAN role
    await dietitianRole.setPermissions(dietitianPermissions);

    console.log('✅ Permissions assigned to DIETITIAN role');
    console.log('');

    // Verify
    const verifyRole = await db.Role.findOne({
      where: { name: 'DIETITIAN' },
      include: [{
        model: db.Permission,
        as: 'permissions',
        through: { attributes: [] }
      }]
    });

    console.log(\`✅ Verification: DIETITIAN now has \${verifyRole.permissions.length} permissions\`);
    console.log('');

    // Find all DIETITIAN users
    const dietitianUsers = await db.User.findAll({
      where: { role_id: dietitianRole.id },
      attributes: ['id', 'username', 'email', 'first_name', 'last_name']
    });

    if (dietitianUsers.length > 0) {
      console.log('Users with DIETITIAN role (' + dietitianUsers.length + '):');
      dietitianUsers.forEach(u => {
        console.log('  - ' + u.username + ' (' + u.email + ')');
      });
      console.log('');
      console.log('⚠️  IMPORTANT: These users must log out and log back in for changes to take effect!');
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
echo "====================================="
echo "✅ Done!"
echo ""
echo "Next steps:"
echo "  1. Ask DIETITIAN users to log out and log back in"
echo "  2. Test patient list loading"
echo "  3. Verify with: ./check-user-permissions.sh <username>"
echo "====================================="
