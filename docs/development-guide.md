# Development Guide

## Prerequisites
- Node.js (Latest LTS recommended)
- npm or yarn
- SQLite (for the database)

## Setup

1. **Install Dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install
   cd ..

   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

2. **Database Setup**
   The project uses Sequelize with SQLite.
   ```bash
   # Run migrations
   npm run db:migrate

   # Seed the database
   npm run db:seed
   ```

## Running the Application

### Backend
To run the backend development server:
```bash
cd backend
npm run dev
# Server generally runs on http://localhost:3000 or defined PORT
```

### Frontend
To run the frontend development server:
```bash
cd frontend
npm run dev
# Vite server usually runs on http://localhost:5173
```

## Testing
- **Backend**: There are `test-*.sh` scripts in the `backend/` directory (e.g., `test-auth.sh`, `test-billing.sh`).
- **Frontend**: Standard Vite test setup (check `package.json` for details if tests are configured).

## Deployment
- **Frontend**: Build for production using `npm run build` in the `frontend/` directory.
- **Backend**: Can be deployed as a standard Node.js application. Ensure environment variables are set.
