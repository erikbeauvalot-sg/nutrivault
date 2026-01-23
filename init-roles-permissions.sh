#!/bin/bash
# Initialize Roles and Permissions

echo "🔧 Initializing Roles and Permissions"
echo "======================================"
echo ""

echo "⚠️  This script will create default roles and permissions."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "1. Running permissions migration..."
docker exec nutrivault-backend npx sequelize-cli db:migrate --name 20260123160000-init-system-permissions.js 2>&1
echo ""

echo "2. Creating default roles if they don't exist..."
docker exec nutrivault-backend node -e "
const db = require('/models');

(async () => {
  try {
    console.log('Creating/updating roles...');

    // ADMIN role
    const [adminRole, adminCreated] = await db.Role.findOrCreate({
      where: { name: 'ADMIN' },
      defaults: {
        name: 'ADMIN',
        description: 'Administrator with full access'
      }
    });
    console.log(adminCreated ? '✅ ADMIN role created' : 'ℹ️  ADMIN role already exists');

    // DIETITIAN role
    const [dietitianRole, dietitianCreated] = await db.Role.findOrCreate({
      where: { name: 'DIETITIAN' },
      defaults: {
        name: 'DIETITIAN',
        description: 'Dietitian with patient management access'
      }
    });
    console.log(dietitianCreated ? '✅ DIETITIAN role created' : 'ℹ️  DIETITIAN role already exists');

    // SECRETARY role
    const [secretaryRole, secretaryCreated] = await db.Role.findOrCreate({
      where: { name: 'SECRETARY' },
      defaults: {
        name: 'SECRETARY',
        description: 'Secretary with limited access'
      }
    });
    console.log(secretaryCreated ? '✅ SECRETARY role created' : 'ℹ️  SECRETARY role already exists');

    // Associate all permissions to ADMIN role
    const permissions = await db.Permission.findAll();
    await adminRole.setPermissions(permissions);
    console.log(\`✅ Associated \${permissions.length} permissions to ADMIN role\`);

    // Associate specific permissions to DIETITIAN role
    const dietitianPermissions = await db.Permission.findAll({
      where: {
        resource: ['patients', 'visits', 'documents', 'reports']
      }
    });
    await dietitianRole.setPermissions(dietitianPermissions);
    console.log(\`✅ Associated \${dietitianPermissions.length} permissions to DIETITIAN role\`);

    // Associate specific permissions to SECRETARY role
    const secretaryPermissions = await db.Permission.findAll({
      where: {
        code: ['patients.read', 'visits.read', 'visits.create', 'visits.update', 'billing.read', 'documents.read']
      }
    });
    await secretaryRole.setPermissions(secretaryPermissions);
    console.log(\`✅ Associated \${secretaryPermissions.length} permissions to SECRETARY role\`);

    console.log('');
    console.log('✅ Roles and permissions initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"
echo ""

echo "3. Verifying setup..."
./check-roles-permissions.sh

echo ""
echo "======================================"
echo "✅ Initialization Complete!"
echo ""
echo "Next steps:"
echo "  1. Verify admin user has ADMIN role"
echo "  2. Create other users with appropriate roles"
echo "  3. Test permissions in the application"
echo "======================================"
