# NutriVault

**Your complete nutrition practice management system**

A secure, full-stack web application for dietitians to manage patient data, appointments, billing, and visit records with comprehensive audit logging and role-based access control.

## Features

- **Patient Management**: Complete patient records with contact info, medical notes, dietary preferences, and allergies
- **Visit Tracking**: Schedule and document patient visits with measurements, assessments, and recommendations
- **Billing System**: Generate invoices, track payments, and manage financial records
- **User Management**: Role-based access control (Admin, Dietitian, Assistant, Viewer)
- **Audit Logging**: Comprehensive tracking of all data access and modifications
- **Security**: JWT authentication, API keys, password hashing, rate limiting, and HTTPS
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Sequelize
- **Authentication**: JWT + Refresh Tokens
- **Logging**: Winston

### Frontend
- **Framework**: React 18+
- **UI Library**: Bootstrap 5+ with React-Bootstrap
- **State Management**: Redux Toolkit / React Context API
- **Build Tool**: Vite
- **HTTP Client**: Axios

## Quick Start

### Prerequisites

- Node.js 18+ LTS
- npm (comes with Node.js)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/erikbeauvalot/nutrivault.git
   cd nutrivault
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Copy environment template and configure
   cp .env.example .env
   # Edit .env with your configuration (see Environment Variables section below)
   
   # Initialize database
   npm run db:migrate
   npm run db:seed
   
   # Start development server
   npm run dev
   ```

3. **Frontend Setup** (in a new terminal)
   ```bash
   cd frontend
   npm install
   
   # Copy environment template and configure
   cp .env.example .env
   # Edit .env with your configuration (see Environment Variables section below)
   
   # Start development server
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api-docs

## Environment Variables

### Backend (.env)

Create a `backend/.env` file with the following variables:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Database Configuration
DB_DIALECT=sqlite                          # Use 'postgres' for production
DB_HOST=localhost                          # PostgreSQL host (if using postgres)
DB_PORT=5432                               # PostgreSQL port (if using postgres)
DB_NAME=nutrivault_dev                     # Database name
DB_USER=postgres                           # PostgreSQL user (if using postgres)
DB_PASSWORD=yourpassword                   # PostgreSQL password (if using postgres)
DB_STORAGE=./data/nutrivault_dev.db        # SQLite file path (if using sqlite)

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000                # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100                # Max requests per window

# CORS Configuration
CORS_ORIGIN=http://localhost:5173          # Frontend URL
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760                     # 10MB in bytes
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=debug                            # debug, info, warn, error
LOG_FILE_PATH=./logs/app.log

# Session
SESSION_SECRET=your-session-secret-change-this-in-production

# API Documentation
API_DOCS_ENABLED=true
```

### Frontend (.env)

Create a `frontend/.env` file with the following variables:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_TIMEOUT=30000

# Application Configuration
VITE_APP_NAME=NutriVault
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true

# Environment
VITE_ENVIRONMENT=development
```

### Production Environment

For production deployment, ensure you:

1. **Change all secrets** - Generate secure random strings for JWT_SECRET, JWT_REFRESH_SECRET, and SESSION_SECRET
2. **Use PostgreSQL** - Set DB_DIALECT=postgres and configure PostgreSQL connection
3. **Enable HTTPS** - Configure SSL/TLS certificates
4. **Set NODE_ENV=production** - This enables production optimizations
5. **Configure CORS** - Set CORS_ORIGIN to your production frontend URL
6. **Disable API docs** - Set API_DOCS_ENABLED=false in production
7. **Secure file uploads** - Configure appropriate file size limits and allowed types
8. **Set strong bcrypt rounds** - Use BCRYPT_ROUNDS=12 or higher for production

See [SECURITY.md](SECURITY.md) for detailed security guidelines.

### Docker Setup (Alternative)

```bash
docker-compose up
```

## Default Test Users

After seeding the database:

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Dietitian | dietitian1 | dietitian123 |
| Assistant | assistant1 | assistant123 |
| Viewer | viewer1 | viewer123 |

**⚠️ Change these passwords before deploying to production!**

## NPM Scripts

### Backend

- `npm run dev` - Start development server with auto-reload
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data
- `npm run db:reset` - Reset database (undo, migrate, seed)
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run component tests
- `npm run lint` - Run ESLint

## Project Structure

```
nutrivaul/
├── backend/                # Backend application
│   ├── data/              # SQLite database files (gitignored)
│   ├── logs/              # Application logs (gitignored)
│   ├── migrations/        # Database migrations
│   ├── seeders/           # Database seed files
│   ├── src/               # Source code
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Custom middleware
│   │   ├── models/        # Sequelize models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utility functions
│   ├── tests/             # Test files
│   └── package.json       # Backend dependencies
├── frontend/              # Frontend application
│   ├── public/            # Static files
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── store/         # State management
│   │   └── utils/         # Utility functions
│   └── package.json       # Frontend dependencies
├── docs/                  # Documentation
│   ├── agents/            # Multi-agent development docs
│   ├── api/               # API documentation
│   ├── architecture/      # Architecture docs
│   └── setup/             # Setup guides
├── docker-compose.yml     # Docker composition
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## Documentation

- **[Development Setup Guide](docs/setup/DEVELOPMENT_SETUP.md)** - Detailed setup instructions
- **[API Documentation](docs/api/)** - API endpoints reference
- **[Architecture Overview](docs/architecture/)** - System architecture
- **[Multi-Agent Development](docs/agents/)** - Agent collaboration guide
- **[Security Guidelines](docs/security/)** - Security best practices

## Development Approach

This project uses a **multi-agent development system** where 10 specialized AI agents collaborate:

1. **Project Architect** - System design and architecture
2. **Backend Developer** - API development and business logic
3. **Database Specialist** - Database design and ORM
4. **Security Specialist** - Authentication and authorization
5. **Frontend Developer** - React UI development
6. **UI/UX Specialist** - User interface design
7. **Audit Logger** - Logging and audit trail
8. **Testing Specialist** - Quality assurance and testing
9. **DevOps Specialist** - Deployment and infrastructure
10. **Documentation Specialist** - Comprehensive documentation

See [docs/agents/](docs/agents/) for more details.

## Security Features

- **Authentication**: JWT access tokens + refresh tokens
- **API Keys**: For programmatic access
- **Password Security**: bcrypt hashing with configurable rounds
- **Account Lockout**: Protection against brute force attacks
- **Rate Limiting**: Prevent DoS attacks
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Comprehensive validation on all endpoints
- **Audit Logging**: Track all data access and modifications
- **HTTPS**: TLS 1.2+ in production
- **Security Headers**: Helmet.js for Express security

## Database

### Development: SQLite
- File-based database at `backend/data/nutrivault_dev.db`
- Zero configuration required
- Perfect for local development
- Automatically created on first migration

### Production: PostgreSQL
- Robust, scalable relational database
- Advanced features (UUID, JSONB, etc.)
- Concurrent access support
- Production-ready performance

Both databases use the same Sequelize ORM, making migration seamless.

## Testing

### Backend Tests
```bash
cd backend
npm test                    # All unit tests
npm run test:coverage       # With coverage report
```

### Frontend Tests
```bash
cd frontend
npm test                    # Component tests (Vitest)
```

### E2E Tests (Playwright)
```bash
# Prerequisites: Backend and frontend must be running
cd backend && npm start
cd frontend && npm run dev

# Run E2E tests
npm run test:e2e            # All browsers, headless
npm run test:e2e:headed     # With visible browser
npm run test:e2e:ui         # Interactive UI mode
npm run test:e2e:chromium   # Chromium only
npm run test:e2e:report     # View HTML report
```

See [tests/e2e/README.md](tests/e2e/README.md) for comprehensive E2E testing documentation.

## Original Testing Section

```bash
# Backend tests
cd backend
npm test                    # All tests
npm run test:coverage       # With coverage report

# Frontend tests
cd frontend
npm test                    # Component tests
npm run test:e2e           # End-to-end tests
```

## Deployment

See [docs/setup/DEPLOYMENT.md](docs/setup/DEPLOYMENT.md) for production deployment instructions.

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the [repository](https://github.com/erikbeauvalot-sg/nutrivault)

2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Compliance

- **HIPAA**: Health Insurance Portability and Accountability Act considerations
- **GDPR**: General Data Protection Regulation ready
- **Data Retention**: Configurable retention policies
- **Audit Trail**: Comprehensive logging for compliance

## License

[Your License Here]

## Support

For support, please contact [erik@beauvalot.com] or open an issue on GitHub.

## Acknowledgments

Built with modern web technologies and best practices for healthcare data management.

---

**Last Updated**: 2026-01-07
**Version**: 1.0.0
**Status**: Phase 5.1 - E2E Testing Framework Complete
