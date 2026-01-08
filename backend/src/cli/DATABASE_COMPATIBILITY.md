# Admin CLI Database Compatibility Test

## Test Scenarios

### 1. SQLite (Development)
```bash
cd backend
NODE_ENV=development npm run admin:create testuser1 test1@example.com Test User1
NODE_ENV=development npm run admin:reset-password testuser1
```

### 2. PostgreSQL (Production)
```bash
cd backend
# Make sure your .env has PostgreSQL credentials:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=nutrivault
# DB_USER=postgres
# DB_PASSWORD=yourpassword

NODE_ENV=production npm run admin:create testuser2 test2@example.com Test User2
NODE_ENV=production npm run admin:reset-password testuser2
```

### 3. Custom PostgreSQL Connection
```bash
cd backend
DB_HOST=myserver.com DB_NAME=nutrivault DB_USER=admin DB_PASSWORD=secret NODE_ENV=production npm run admin:create testuser3 test3@example.com Test User3
```

## Why It Works

The CLI uses **Sequelize ORM**, which provides database-agnostic operations:

1. **No Raw SQL**: All queries use Sequelize methods (`findOne`, `create`, `update`)
2. **Dynamic Configuration**: Database connection is determined by `config/database.js` based on NODE_ENV
3. **Automatic Dialect Handling**: Sequelize translates operations to SQLite or PostgreSQL syntax automatically

## Verified Database-Agnostic Operations

✅ `db.Role.findOne({ where: { name: 'ADMIN' } })` - Works with both databases
✅ `db.User.findOne({ where: { username } })` - Works with both databases
✅ `db.User.create({ ... })` - Works with both databases
✅ `user.update({ ... })` - Works with both databases

## Database Configuration

The configuration in `config/database.js` handles both databases:

```javascript
{
  development: {
    dialect: 'sqlite',
    storage: '../data/nutrivault_dev.db',
    // ...
  },
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // ...
  }
}
```

The CLI automatically picks the right configuration based on NODE_ENV.
