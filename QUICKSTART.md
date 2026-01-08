# Quick Start - VM Development Setup

**Fastest way to start developing with NutriVault**

## 🚀 One-Minute Setup

```bash
# 1. Start PostgreSQL in Docker
./postgres-dev.sh start

# 2. Setup and run backend (in new terminal)
cd backend
npm install
cp .env.example .env
# Edit .env: Set DB_HOST=localhost, DB_DIALECT=postgres
npm run db:migrate
npm run db:seed
npm run dev

# 3. Setup and run frontend (in new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 📋 Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs
- **PostgreSQL**: localhost:5432

## 🔑 Test Credentials

- **Admin**: `admin` / `Admin123!`

## 🛠️ Managing PostgreSQL

```bash
./postgres-dev.sh status    # Check status
./postgres-dev.sh logs      # View logs
./postgres-dev.sh psql      # Connect to database
./postgres-dev.sh stop      # Stop PostgreSQL
./postgres-dev.sh reset     # Reset database (WARNING: deletes data)
```

## 📚 More Information

- [Full Development Options](docs/DEV_SETUP_OPTIONS.md)
- [PostgreSQL Setup Details](docs/POSTGRES_DEV_SETUP.md)
- [Main README](README.md)

## ⚡ Why This Setup?

- Fast hot reload for code changes
- Easy debugging with Node.js inspector
- Consistent database environment
- No Docker rebuilds needed
- Production-like PostgreSQL

## 🐛 Troubleshooting

**Backend can't connect to PostgreSQL?**
```bash
./postgres-dev.sh status  # Check if running
# Make sure backend/.env has DB_HOST=localhost
```

**Port 5432 already in use?**
```bash
# Change port in .env file
DB_PORT=5433
# Then restart: ./postgres-dev.sh restart
```

**Need to reset everything?**
```bash
./postgres-dev.sh reset
cd backend && npm run db:migrate && npm run db:seed
```
