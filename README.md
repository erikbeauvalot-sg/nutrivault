# NutriVault

A comprehensive nutrition practice management system for dietitians, assistants, and patients. Built with Node.js/Express backend and React/Vite frontend.

## Features

- **Patient Management**: Complete CRUD operations for patient records
- **Visit Tracking**: Schedule and manage patient visits with measurements
- **Billing System**: Invoice generation, payment processing, and financial reporting
- **Document Management**: Upload, preview, and organize patient documents
- **Role-Based Access Control**: Secure authentication with 4 user roles (Admin, Dietitian, Assistant, Viewer)
- **Audit Logging**: Comprehensive tracking of all system activities
- **Internationalization**: Support for English and French languages
- **Responsive Design**: Mobile-friendly interface

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Sequelize
- **Authentication**: JWT + API Keys
- **Security**: bcrypt, Helmet, CORS

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: React Bootstrap
- **Routing**: React Router v6
- **Internationalization**: react-i18next

## Quick Start

### Prerequisites
- Node.js 18+ LTS
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nutrivault
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install

   # Frontend
   cd ../frontend && npm install
   ```

3. **Set up environment variables**
   ```bash
   # For development
   cp .env.example .env

   # For production (optional - see .env.production.example for guide)
   # cp .env.production.example .env

   # Edit .env and update:
   # - JWT_SECRET (must be 32+ characters)
   # - REFRESH_TOKEN_SECRET (must be 32+ characters)
   # - Database settings (SQLite by default, or PostgreSQL)

   # Generate secure secrets:
   openssl rand -base64 32  # Use output for JWT_SECRET
   openssl rand -base64 32  # Use output for REFRESH_TOKEN_SECRET
   ```

4. **Set up database**

   ⚠️ **IMPORTANT**: Database commands MUST be run from the root directory, not `/backend/`

   ```bash
   # Run from project root (nutrivault/)
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development servers**
   ```bash
   # Backend (port 3001)
   cd backend && npm run dev

   # Frontend (port 5173) - in new terminal
   cd frontend && npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Default Login Credentials

- **Username**: admin
- **Password**: Admin123!

## Project Structure

```
nutrivault/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Authentication, validation, RBAC
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic layer
│   │   └── auth/            # JWT utilities
│   └── data/                # SQLite database files (dev)
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   ├── contexts/        # React contexts
│   │   └── locales/         # Translation files (i18n)
│   └── public/              # Static assets
├── models/                  # Sequelize models (ROOT level!)
├── migrations/              # Database migrations (ROOT level!)
├── seeders/                 # Database seeders (ROOT level!)
├── config/                  # Database configuration
└── docs/                    # Documentation
```

## Development

### Available Scripts

```bash
# Database (MUST run from root directory)
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with initial data
npm run db:reset     # Complete reset (undo all → migrate → seed)

# Backend (run from backend/ directory)
cd backend
npm run dev          # Start development server with hot reload
npm start            # Production server
npm test             # Run backend tests

# Frontend (run from frontend/ directory)
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# API integration tests
./test-auth.sh
./test-billing.sh
```

### Internationalization

The application supports English and French languages. All user-facing strings use translation keys. To add new translations:

1. Add keys to `frontend/src/locales/en.json`
2. Add corresponding translations to `frontend/src/locales/fr.json`
3. Use `t('key')` in components

### Troubleshooting

**Error: Cannot find "config/config.json" when running migrations**

This happens when you try to run database commands from the `/backend/` directory.

**Solution**: Always run database commands from the project root:
```bash
# Wrong (from backend/)
cd backend
npm run db:migrate  # ❌ Will fail

# Correct (from project root)
cd /path/to/nutrivault
npm run db:migrate  # ✅ Works
```

**Why?** The Sequelize configuration (`.sequelizerc`) is located at the root level and points to:
- Models: `/models/` (not `/backend/models/`)
- Migrations: `/migrations/` (not `/backend/migrations/`)
- Seeders: `/seeders/` (not `/backend/seeders/`)
- Config: `/config/database.js` (not `/backend/config/config.json`)

---

**Error: "Using environment 'production'" and "no such table" errors**

This happens when `NODE_ENV=production` but you want to use SQLite instead of PostgreSQL.

**Solution**: Set the database dialect explicitly in your `.env` file:
```bash
# At the project root, create/edit .env
NODE_ENV=production
DB_DIALECT=sqlite
DB_STORAGE=./backend/data/nutrivault_prod.db

# JWT secrets (required, at least 32 characters)
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
REFRESH_TOKEN_SECRET=another-different-secret-32-chars-long
```

Then run migrations:
```bash
npm run db:migrate
npm run db:seed
```

**Note**: The system now supports SQLite in production by default. To use PostgreSQL, set `DB_DIALECT=postgres` and configure the PostgreSQL connection variables.

## API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Patients
- `GET /api/patients` - List patients
- `POST /api/patients` - Create patient
- `GET /api/patients/:id` - Get patient details
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Visits
- `GET /api/visits` - List visits
- `POST /api/visits` - Create visit
- `GET /api/visits/:id` - Get visit details
- `PUT /api/visits/:id` - Update visit
- `DELETE /api/visits/:id` - Delete visit

### Billing
- `GET /api/billing/invoices` - List invoices
- `POST /api/billing/invoices/:id/payments` - Record payment

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id/download` - Download document

## Security

- **Password Security**: bcrypt with 12+ rounds
- **JWT Tokens**: 15-30 minute expiration with refresh tokens
- **Rate Limiting**: Multi-tier rate limiting (6 different limiters)
- **Input Validation**: Comprehensive validation on all inputs
- **CORS**: Restricted origins in production
- **Security Headers**: Helmet middleware for security headers

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in `docs/`
- Review troubleshooting guides in `.github/instructions/`

---

**Last Updated**: January 20, 2026