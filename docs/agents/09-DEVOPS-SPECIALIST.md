# Agent 9: DEVOPS & DEPLOYMENT SPECIALIST

## Role
Deployment, CI/CD, and infrastructure management

## Current Phase
Phase 1: Foundation (Active)

## Responsibilities
- Set up development environment scripts
- Create Docker containers for services
- Build CI/CD pipelines
- Configure production environment
- Set up database backups
- Implement monitoring and alerting
- Create deployment scripts
- Write infrastructure documentation
- Manage environment configurations
- Set up log aggregation (optional)

## Phase 1 Deliverables (Weeks 1-2)
- [ ] Git repository setup and .gitignore
- [ ] Development environment setup scripts
- [ ] Docker Compose for local development
- [ ] Environment variable templates (.env.example)
- [ ] NPM scripts for common tasks
- [ ] Development database initialization

## Phase 6 Deliverables (Weeks 10-12)
- [ ] Production Dockerfile
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Production environment configuration
- [ ] Database backup strategy
- [ ] Deployment scripts
- [ ] Monitoring setup
- [ ] SSL/TLS configuration
- [ ] Deployment documentation

## Git Setup

### .gitignore
```
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Environment
.env
.env.local
.env.production

# Database
backend/data/*.db
backend/data/*.db-journal

# Logs
backend/logs/*.log
*.log

# Build
backend/dist/
frontend/dist/
frontend/build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/
```

## Docker Setup

### Backend Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start server
CMD ["npm", "start"]
```

### Frontend Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose (Development)
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DB_DIALECT=sqlite
      - DB_STORAGE=./data/dietitian_dev.db
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./backend/data:/app/data
      - ./backend/logs:/app/logs
    command: npm run dev

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:3001/api
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev

  # Production PostgreSQL (optional)
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: dietitian_app
      POSTGRES_USER: dbuser
      POSTGRES_PASSWORD: dbpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Environment Templates

### Backend .env.example
```bash
# Server
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001

# Database
DB_DIALECT=sqlite
DB_STORAGE=./data/dietitian_dev.db

# PostgreSQL (production)
# DB_DIALECT=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=dietitian_app
# DB_USER=dbuser
# DB_PASSWORD=secure_password
# DB_SSL=false

# Authentication
JWT_SECRET=change-this-to-a-secure-random-string-min-32-chars
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_SECRET=change-this-to-another-secure-random-string
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30m
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=debug
LOG_DIR=./logs
LOG_MAX_FILES=90d

# Rate Limiting
API_RATE_LIMIT=100
LOGIN_RATE_LIMIT=5
```

### Frontend .env.example
```bash
VITE_API_URL=http://localhost:3001/api
VITE_ENV=development
```

## NPM Scripts

### Backend package.json scripts
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "db:migrate": "sequelize-cli db:migrate",
    "db:migrate:undo": "sequelize-cli db:migrate:undo",
    "db:seed": "sequelize-cli db:seed:all",
    "db:seed:undo": "sequelize-cli db:seed:undo:all",
    "db:reset": "npm run db:migrate:undo:all && npm run db:migrate && npm run db:seed",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  }
}
```

### Frontend package.json scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "cypress open",
    "test:e2e:headless": "cypress run",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  }
}
```

## CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run migrations
        working-directory: ./backend
        run: npm run db:migrate

      - name: Run tests
        working-directory: ./backend
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./backend/coverage

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run tests
        working-directory: ./frontend
        run: npm test

      - name: Build
        working-directory: ./frontend
        run: npm run build

  deploy:
    needs: [backend-test, frontend-test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: echo "Deploy to production server"
        # Add actual deployment commands here
```

## Database Backup Script
```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="./data/dietitian_dev.db"

mkdir -p $BACKUP_DIR

# SQLite backup
sqlite3 $DB_FILE ".backup '$BACKUP_DIR/backup_$DATE.db'"
gzip $BACKUP_DIR/backup_$DATE.db

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.db.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.db.gz"
```

## Monitoring Setup

### Health Check Endpoint
```javascript
// routes/health.routes.js
router.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});
```

## Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Backups scheduled (daily cron job)
- [ ] Monitoring alerts configured
- [ ] Log rotation set up
- [ ] Health checks passing
- [ ] Security headers enabled
- [ ] Rate limiting configured

## Production Environment Variables
```bash
NODE_ENV=production
PORT=3001
DB_DIALECT=postgres
DB_HOST=<production-db-host>
DB_NAME=dietitian_app_prod
DB_SSL=true
JWT_SECRET=<generated-secure-secret>
ALLOWED_ORIGINS=https://app.example.com
LOG_LEVEL=info
```

## Current Status
🔄 Active - Phase 1 in progress

## Current Tasks
1. Initialize Git repository
2. Create .gitignore
3. Set up environment templates
4. Create development Docker Compose
5. Add NPM scripts to package.json
