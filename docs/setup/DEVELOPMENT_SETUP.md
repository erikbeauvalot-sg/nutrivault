# NutriVault Development Environment Setup

This guide will help you set up the NutriVault development environment on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ LTS ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

Optional:
- **PostgreSQL** 14+ (only for production environment testing)
- **Docker** (for containerized development)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Diet
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your configuration (optional for development)
# Default SQLite configuration works out of the box

# Run database migrations
npm run db:migrate

# Seed database with test data
npm run db:seed

# Start development server
npm run dev
```

The backend server will start on `http://localhost:3001`

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm start
# or with Vite:
npm run dev
```

The frontend will start on `http://localhost:3000` (or `http://localhost:5173` with Vite)

## Database Configuration

### Development (SQLite)

SQLite is used by default for development. No additional setup required!

- **Database file**: `backend/data/nutrivault_dev.db`
- **Auto-created**: First migration creates the database file
- **Reset database**: `npm run db:reset`

### Production (PostgreSQL)

For production or production-like testing, configure PostgreSQL:

1. Install PostgreSQL 14+
2. Create database:
   ```bash
   createdb nutrivault
   ```
3. Update `backend/.env`:
   ```bash
   DB_DIALECT=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=nutrivault
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_SSL=false
   ```
4. Run migrations:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## NPM Scripts

### Backend Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run db:migrate` | Run database migrations |
| `npm run db:migrate:undo` | Undo last migration |
| `npm run db:seed` | Seed database with test data |
| `npm run db:seed:undo` | Undo all seeders |
| `npm run db:reset` | Reset database (undo all, migrate, seed) |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |

### Frontend Scripts

| Script | Description |
|--------|-------------|
| `npm start` or `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run component tests |
| `npm run test:ui` | Run tests with UI |
| `npm run test:e2e` | Run E2E tests (Cypress) |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |

## Environment Variables

### Backend Environment Variables

See `backend/.env.example` for all available options.

**Required for development:**
- `NODE_ENV=development`
- `PORT=3001`
- `DB_DIALECT=sqlite`
- `DB_STORAGE=./data/nutrivault_dev.db`
- `JWT_SECRET=your-secret-key` (generate a secure random string)
- `REFRESH_TOKEN_SECRET=your-refresh-secret`

**Important for security:**
- Always use strong random strings for JWT secrets (minimum 32 characters)
- Never commit `.env` files to version control
- Use different secrets for development and production

### Frontend Environment Variables

See `frontend/.env.example` for all available options.

**Required:**
- `VITE_API_URL=http://localhost:3001/api`
- `VITE_ENV=development`

## Database Management

### Reset Database

To completely reset your database (undo all migrations, re-migrate, and re-seed):

```bash
cd backend
npm run db:reset
```

### Create New Migration

```bash
cd backend
npx sequelize-cli migration:generate --name migration-name
```

Edit the generated file in `backend/migrations/`, then run:

```bash
npm run db:migrate
```

### Create Seed Data

```bash
cd backend
npx sequelize-cli seed:generate --name seed-name
```

Edit the generated file in `backend/seeders/`, then run:

```bash
npm run db:seed
```

## Troubleshooting

### Port Already in Use

If port 3001 (backend) or 3000 (frontend) is already in use:

1. Find the process:
   ```bash
   # macOS/Linux
   lsof -i :3001
   lsof -i :3000

   # Windows
   netstat -ano | findstr :3001
   ```

2. Kill the process or change the port in `.env`

### Database Connection Issues

**SQLite:**
- Ensure `backend/data/` directory exists
- Check write permissions for the directory
- Delete `.db` file and re-run migrations

**PostgreSQL:**
- Verify PostgreSQL is running: `pg_isready`
- Check connection details in `.env`
- Ensure database exists: `psql -l`

### Module Not Found

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Migration Errors

```bash
# Undo all migrations and start fresh
cd backend
npm run db:migrate:undo:all
npm run db:migrate
npm run db:seed
```

## Docker Development (Optional)

If you prefer Docker:

```bash
# Start all services
docker-compose up

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up --build
```

## Testing

### Run All Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Run Tests in Watch Mode

```bash
# Backend
cd backend
npm run test:watch

# Frontend
cd frontend
npm test
```

### Generate Coverage Report

```bash
# Backend
cd backend
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Default Test Users

After seeding the database, you can login with these test accounts:

| Role | Username | Password | Email |
|------|----------|----------|-------|
| Admin | admin | admin123 | admin@nutrivault.com |
| Dietitian | dietitian1 | dietitian123 | dietitian@nutrivault.com |
| Assistant | assistant1 | assistant123 | assistant@nutrivault.com |
| Viewer | viewer1 | viewer123 | viewer@nutrivault.com |

**Note**: Change these passwords in production!

## Next Steps

1. Review the [API Documentation](../api/API_DOCUMENTATION.md)
2. Read the [Contributing Guidelines](../../CONTRIBUTING.md)
3. Check out the [Architecture Overview](../architecture/ARCHITECTURE.md)
4. Start developing!

## Getting Help

- **Documentation**: Check `docs/` directory
- **Issues**: Report bugs on GitHub Issues
- **Questions**: Contact the development team

## Security Notes

- Never commit `.env` files
- Use strong random secrets for JWT tokens
- Change default test user passwords before deployment
- Review security guidelines in `docs/security/SECURITY.md`
- Enable HTTPS in production
- Keep dependencies updated

## Development Best Practices

1. **Branch Naming**: Use descriptive branch names (e.g., `feature/patient-crud`, `fix/login-bug`)
2. **Commits**: Write clear commit messages
3. **Code Style**: Follow ESLint and Prettier rules
4. **Testing**: Write tests for new features
5. **Documentation**: Update docs when changing functionality
6. **Environment**: Never modify `.env.example`, create `.env` instead

## Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Sequelize Documentation](https://sequelize.org/docs/v6/)
- [React Documentation](https://react.dev/)
- [Bootstrap Documentation](https://getbootstrap.com/docs/)

---

**Last Updated**: 2026-01-03
**Maintained By**: DevOps Specialist (Agent 9)
