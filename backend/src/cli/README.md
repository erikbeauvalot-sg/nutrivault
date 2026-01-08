# Admin User Management CLI

Command-line interface for managing admin users in NutriVault.

## Available Commands

### 1. Create Admin User

Create a new admin user with either a generated or custom password.

**With auto-generated password:**
```bash
cd backend
npm run admin:create -- username email@example.com FirstName LastName
```

**With custom password:**
```bash
cd backend
npm run admin:create -- username email@example.com FirstName LastName "MyPassword123!"
```

**Example:**
```bash
cd backend
npm run admin:create -- johndoe john@example.com John Doe

# Output:
# 🔑 Generated password: ;U1:^I>{?Sz9n[I[
# ⚠️  Please save this password securely!
# 
# ✅ Admin user created successfully!
# 
# User Details:
#    Username: johndoe
#    Email: john@example.com
#    Name: John Doe
#    Role: ADMIN
#    ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 2. Reset Admin Password

Reset an existing admin user's password with either a generated or custom password.

**With auto-generated password:**
```bash
cd backend
npm run admin:reset-password -- username
```

**With custom password:**
```bash
cd backend
npm run admin:reset-password -- username "NewPassword123!"
```

**Example:**
```bash
cd backend
npm run admin:reset-password -- admin

# Output:
# 🔑 Generated password: p@7Kn2!xL9Tz4Wr
# ⚠️  Please save this password securely!
# 
# ✅ Password reset successfully!
# 
# User Details:
#    Username: admin
#    Email: admin@nutrivault.local
#    Name: System Administrator
```

## Password Requirements

All passwords must meet these requirements:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)

## Notes

- **Auto-generated passwords** are 16 characters long and meet all security requirements
- **Account lockout is reset** when password is changed
- **Only ADMIN role users** can be managed with reset-password command
- The CLI uses the same environment configuration as the backend server (check `.env` file)

## Troubleshooting

### "ADMIN role not found"
Run database migrations and seeds first:
```bash
cd backend
npm run db:reset
```

### "Username already exists"
The username must be unique. Choose a different username or update the existing user.

### "User is not an admin"
The reset-password command only works for users with ADMIN role. To reset passwords for other users, use the web interface as an admin.

## Direct Script Usage

You can also run the script directly without npm:

```bash
cd backend
node src/cli/manage-admin.js create username email@example.com FirstName LastName
node src/cli/manage-admin.js reset-password username
```

For help:
```bash
node src/cli/manage-admin.js --help
```
