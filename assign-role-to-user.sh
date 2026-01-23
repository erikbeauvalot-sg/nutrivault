#!/bin/bash
# Assign Role to User

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <username> <role>"
  echo ""
  echo "Available roles:"
  echo "  - ADMIN      (full access)"
  echo "  - DIETITIAN  (patient and visit management)"
  echo "  - SECRETARY  (limited access)"
  echo ""
  echo "Example:"
  echo "  $0 admin ADMIN"
  echo "  $0 john.doe DIETITIAN"
  exit 1
fi

USERNAME="$1"
ROLE_NAME="$2"

echo "🔧 Assigning role '$ROLE_NAME' to user '$USERNAME'"
echo "=================================================="
echo ""

docker exec nutrivault-backend node -e "
const db = require('/models');

(async () => {
  try {
    // Find user
    const user = await db.User.findOne({ where: { username: '$USERNAME' } });
    if (!user) {
      console.error('❌ User not found: $USERNAME');
      process.exit(1);
    }
    console.log('✅ User found:', user.username, '(', user.email, ')');

    // Find role
    const role = await db.Role.findOne({ where: { name: '$ROLE_NAME' } });
    if (!role) {
      console.error('❌ Role not found: $ROLE_NAME');
      console.log('Available roles: ADMIN, DIETITIAN, SECRETARY');
      process.exit(1);
    }
    console.log('✅ Role found:', role.name, '-', role.description);

    // Assign role
    user.role_id = role.id;
    await user.save();
    console.log('');
    console.log('✅ Role assigned successfully!');
    console.log('');
    console.log('User details:');
    console.log('  Username:', user.username);
    console.log('  Email:', user.email);
    console.log('  Role:', role.name);
    console.log('');
    console.log('⚠️  IMPORTANT: User must log out and log back in for changes to take effect.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"

echo ""
echo "=================================================="
