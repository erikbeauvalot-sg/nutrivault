# Agent 3: DATABASE SPECIALIST

## Role
Database design, ORM configuration, and data layer implementation

## Current Phase
Phase 1: Foundation (Active)

## Responsibilities
- Implement ORM models (Sequelize)
- Create database migrations
- Write seed scripts for development data
- Optimize database indexes
- Implement data validation at model level
- Handle database transactions
- Create database utilities (connection pooling, etc.)
- Write data access layer tests
- Ensure SQLite/PostgreSQL compatibility

## Phase 1 Deliverables (Weeks 1-2)
- [ ] Sequelize setup and configuration
- [ ] Database configuration for SQLite (dev) and PostgreSQL (prod)
- [ ] Initial migration: users, roles, permissions tables
- [ ] Initial migration: patients, visits, billing tables
- [ ] Initial migration: audit_logs, refresh_tokens, api_keys
- [ ] Seed script: roles and permissions
- [ ] Seed script: test users
- [ ] Seed script: test patients and visits
- [ ] Model associations setup
- [ ] Database utility functions

## Database Configuration

```javascript
// config/database.js
module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './data/nutrivault_dev.db',
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: {
      timestamps: true,
      underscored: true
    }
  },
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME, // nutrivault
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
    logging: false,
    define: {
      timestamps: true,
      underscored: true
    }
  }
};
```

## Models to Create

### 1. User Model
```javascript
// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      validate: { isEmail: true }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_login_at: {
      type: DataTypes.DATE
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    locked_until: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'users',
    timestamps: true
  });

  User.associate = (models) => {
    User.belongsTo(models.Role, { foreignKey: 'role_id' });
    User.hasMany(models.Patient, {
      foreignKey: 'assigned_dietitian_id',
      as: 'assignedPatients'
    });
    User.hasMany(models.ApiKey, { foreignKey: 'user_id' });
  };

  return User;
};
```

### 2. Role Model
### 3. Permission Model
### 4. Patient Model
### 5. Visit Model
### 6. VisitMeasurement Model
### 7. Billing Model
### 8. AuditLog Model
### 9. RefreshToken Model
### 10. ApiKey Model

## Migration Template

```javascript
// migrations/YYYYMMDDHHMMSS-create-users.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      username: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      // ... other fields
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('users', ['username']);
    await queryInterface.addIndex('users', ['email']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};
```

## Seed Data Template

```javascript
// seeders/20240101000000-roles-and-permissions.js
'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Insert roles
    const roles = [
      {
        id: uuidv4(),
        name: 'ADMIN',
        description: 'Full system access',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'DIETITIAN',
        description: 'Manage assigned patients',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'ASSISTANT',
        description: 'Limited access',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'VIEWER',
        description: 'Read-only access',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('roles', roles);

    // Insert permissions
    const permissions = [
      { name: 'patients.create', resource: 'patients', action: 'create' },
      { name: 'patients.read', resource: 'patients', action: 'read' },
      { name: 'patients.update', resource: 'patients', action: 'update' },
      { name: 'patients.delete', resource: 'patients', action: 'delete' },
      // ... more permissions
    ].map(p => ({
      id: uuidv4(),
      ...p,
      created_at: new Date(),
      updated_at: new Date()
    }));

    await queryInterface.bulkInsert('permissions', permissions);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  }
};
```

## SQLite/PostgreSQL Compatibility Notes

### UUID Handling
- PostgreSQL: Native UUID type
- SQLite: Store as TEXT, generate in application layer
- Solution: Use DataTypes.UUID with UUIDV4 default

### INET Type for IP Addresses
- PostgreSQL: Native INET type
- SQLite: Use TEXT
- Solution: Use DataTypes.STRING for ip_address fields

### JSONB Type
- PostgreSQL: Native JSONB
- SQLite: Use TEXT with JSON serialization
- Solution: Use DataTypes.JSON (Sequelize handles conversion)

### Timestamp Functions
- Use Sequelize.literal('CURRENT_TIMESTAMP') for compatibility

## Index Strategy

### Primary Indexes
- All UUID primary keys (automatic)

### Secondary Indexes
- users: username, email (unique)
- patients: last_name, assigned_dietitian_id
- visits: patient_id, dietitian_id, visit_date
- billing: patient_id, status, invoice_date
- audit_logs: timestamp, user_id, resource_type

### Composite Indexes
- audit_logs: (resource_type, resource_id)
- visits: (patient_id, visit_date)

## Database Utilities

```javascript
// utils/database.js
const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

module.exports = { sequelize, testConnection };
```

## Scripts to Add to package.json

```json
{
  "scripts": {
    "db:migrate": "sequelize-cli db:migrate",
    "db:migrate:undo": "sequelize-cli db:migrate:undo",
    "db:seed": "sequelize-cli db:seed:all",
    "db:seed:undo": "sequelize-cli db:seed:undo:all",
    "db:reset": "npm run db:migrate:undo:all && npm run db:migrate && npm run db:seed"
  }
}
```

## Dependencies with Other Agents
- **Project Architect**: Confirm schema design and indexes
- **Backend Developer**: Provide models for service layer
- **Security Specialist**: User model for authentication
- **Audit Logger**: AuditLog model for logging

## Current Status
🔄 Active - Phase 1 in progress

## Current Tasks
1. Set up Sequelize and database configuration
2. Create all 11 models with associations
3. Create migrations for all tables
4. Create seed data for roles, permissions, and test users
5. Test migrations on both SQLite and PostgreSQL
