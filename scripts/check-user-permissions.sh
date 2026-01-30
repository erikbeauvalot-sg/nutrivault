#!/bin/bash
# Check User Permissions

if [ -z "$1" ]; then
  echo "Usage: $0 <username>"
  echo ""
  echo "Example:"
  echo "  $0 john.doe"
  echo ""
  echo "This script shows all permissions for a user"
  exit 1
fi

USERNAME="$1"

echo "🔍 Checking Permissions for User: $USERNAME"
echo "============================================="
echo ""

docker exec nutrivault-backend node -e "
const db = require('/models');

(async () => {
  try {
    // Find user with role and permissions
    const user = await db.User.findOne({
      where: { username: '$USERNAME' },
      include: [
        {
          model: db.Role,
          as: 'role',
          include: [
            {
              model: db.Permission,
              as: 'permissions',
              through: { attributes: [] }
            }
          ]
        }
      ]
    });

    if (!user) {
      console.error('❌ User not found: $USERNAME');
      process.exit(1);
    }

    console.log('User Details:');
    console.log('  Username:', user.username);
    console.log('  Email:', user.email);
    console.log('  First Name:', user.first_name);
    console.log('  Last Name:', user.last_name);
    console.log('  Active:', user.is_active);
    console.log('');

    if (!user.role) {
      console.error('❌ No role assigned to this user!');
      console.log('');
      console.log('To assign a role, run:');
      console.log('  ./assign-role-to-user.sh $USERNAME DIETITIAN');
      process.exit(1);
    }

    console.log('Role:', user.role.name);
    console.log('Role Description:', user.role.description);
    console.log('');

    if (!user.role.permissions || user.role.permissions.length === 0) {
      console.error('❌ Role has NO permissions assigned!');
      console.log('');
      console.log('To initialize permissions, run:');
      console.log('  ./init-roles-permissions.sh');
      process.exit(1);
    }

    console.log('Permissions (' + user.role.permissions.length + ' total):');
    console.log('');

    // Group by resource
    const byResource = {};
    user.role.permissions.forEach(p => {
      if (!byResource[p.resource]) {
        byResource[p.resource] = [];
      }
      byResource[p.resource].push(p.action);
    });

    Object.keys(byResource).sort().forEach(resource => {
      const actions = byResource[resource].sort().join(', ');
      console.log('  ' + resource.padEnd(15) + ' : ' + actions);
    });

    console.log('');

    // Check specific permissions
    const hasPatientRead = user.role.permissions.some(p => p.code === 'patients.read');
    const hasPatientCreate = user.role.permissions.some(p => p.code === 'patients.create');
    const hasPatientUpdate = user.role.permissions.some(p => p.code === 'patients.update');
    const hasPatientDelete = user.role.permissions.some(p => p.code === 'patients.delete');

    console.log('Patient Permissions Check:');
    console.log('  Read:   ' + (hasPatientRead ? '✅' : '❌'));
    console.log('  Create: ' + (hasPatientCreate ? '✅' : '❌'));
    console.log('  Update: ' + (hasPatientUpdate ? '✅' : '❌'));
    console.log('  Delete: ' + (hasPatientDelete ? '✅' : '❌'));
    console.log('');

    if (!hasPatientRead) {
      console.error('⚠️  WARNING: User cannot read patients!');
      console.log('This will cause \"Échec du chargement des patients\" error');
      console.log('');
      console.log('To fix, run:');
      console.log('  ./init-roles-permissions.sh');
    } else {
      console.log('✅ User should be able to view patients');
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
echo "============================================="
