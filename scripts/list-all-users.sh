#!/bin/bash
# List All Users with Roles

echo "👥 All Users in System"
echo "======================"
echo ""

docker exec nutrivault-backend node -e "
const db = require('/models');

(async () => {
  try {
    const users = await db.User.findAll({
      include: [{
        model: db.Role,
        as: 'role',
        include: [{
          model: db.Permission,
          as: 'permissions',
          through: { attributes: [] }
        }]
      }],
      order: [['username', 'ASC']]
    });

    if (users.length === 0) {
      console.log('No users found in database.');
      process.exit(0);
    }

    console.log(\`Total users: \${users.length}\`);
    console.log('');
    console.log('Username'.padEnd(20) + 'Email'.padEnd(35) + 'Role'.padEnd(15) + 'Permissions'.padEnd(12) + 'Active');
    console.log('='.repeat(95));

    users.forEach(user => {
      const username = user.username.padEnd(20);
      const email = (user.email || 'N/A').padEnd(35);
      const role = (user.role?.name || 'NO ROLE').padEnd(15);
      const permCount = (user.role?.permissions?.length || 0).toString().padEnd(12);
      const active = user.is_active ? '✅' : '❌';

      console.log(username + email + role + permCount + active);
    });

    console.log('');
    console.log('Summary by Role:');
    console.log('');

    // Count by role
    const roleCount = {};
    users.forEach(u => {
      const roleName = u.role?.name || 'NO ROLE';
      roleCount[roleName] = (roleCount[roleName] || 0) + 1;
    });

    Object.keys(roleCount).sort().forEach(role => {
      console.log('  ' + role.padEnd(15) + ': ' + roleCount[role] + ' user(s)');
    });

    console.log('');

    // Check for users without roles or permissions
    const usersWithoutRole = users.filter(u => !u.role);
    const usersWithoutPerms = users.filter(u => u.role && (!u.role.permissions || u.role.permissions.length === 0));

    if (usersWithoutRole.length > 0) {
      console.log('⚠️  WARNING: ' + usersWithoutRole.length + ' user(s) without role:');
      usersWithoutRole.forEach(u => console.log('  - ' + u.username));
      console.log('');
    }

    if (usersWithoutPerms.length > 0) {
      console.log('⚠️  WARNING: ' + usersWithoutPerms.length + ' user(s) with role but NO permissions:');
      usersWithoutPerms.forEach(u => console.log('  - ' + u.username + ' (role: ' + u.role.name + ')'));
      console.log('');
      console.log('Fix by running: ./init-roles-permissions.sh');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"

echo ""
echo "======================"
echo ""
echo "To check specific user: ./check-user-permissions.sh <username>"
echo "To fix DIETITIAN role:  ./fix-dietitian-permissions.sh"
echo "======================"
