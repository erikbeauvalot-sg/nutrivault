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
   # Copy environment files
   cp .env.example .env  # Root level
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env

   # Edit .env files with your configuration
   ```

4. **Set up database**
   ```bash
   cd backend
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
│   │   └── utils/          # Helper utilities
│   ├── config/             # Database and app configuration
│   ├── migrations/         # Database schema migrations
│   ├── models/             # Sequelize models
│   └── seeders/            # Database seed data
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── contexts/       # React contexts
│   │   └── locales/        # Translation files
│   ├── public/             # Static assets
│   └── tests/              # Frontend tests
├── docs/                   # Documentation
├── utils/                  # Shared utilities
└── config/                 # Shared configuration
```

## Development

### Available Scripts

```bash
# Backend
cd backend
npm run dev          # Start development server with hot reload
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with initial data
npm test            # Run backend tests

# Frontend
cd frontend
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
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

**Last Updated**: January 11, 2026