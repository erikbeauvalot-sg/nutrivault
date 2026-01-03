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
   cd nutrivaul
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

3. **Frontend Setup** (in a new terminal)
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000 (or http://localhost:5173)
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api-docs

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

1. Fork the repository
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

For support, please contact [your-email@example.com] or open an issue on GitHub.

## Acknowledgments

Built with modern web technologies and best practices for healthcare data management.

---

**Last Updated**: 2026-01-03
**Version**: 1.0.0
**Status**: Phase 1 - Foundation Complete
