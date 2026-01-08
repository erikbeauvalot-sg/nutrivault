# Development Setup Options

NutriVault supports multiple development configurations to suit different workflows:

## Option 1: VM Development with PostgreSQL in Docker (Recommended)

Run PostgreSQL in a container while running backend and frontend directly on your VM for faster development and debugging.

### Quick Start

```bash
# Start PostgreSQL
./postgres-dev.sh start

# Run backend (in another terminal)
cd backend
npm install
npm run dev

# Run frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Configuration

Create `backend/.env`:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_DIALECT=postgres
# ... other variables
```

See [docs/POSTGRES_DEV_SETUP.md](./POSTGRES_DEV_SETUP.md) for full documentation.

### Advantages
- ✅ Faster development (no Docker rebuilds)
- ✅ Direct debugging access
- ✅ Hot reload works naturally
- ✅ Consistent database environment
- ✅ Easy database management

### Helper Script

```bash
./postgres-dev.sh status    # Check PostgreSQL status
./postgres-dev.sh start     # Start PostgreSQL
./postgres-dev.sh stop      # Stop PostgreSQL
./postgres-dev.sh logs      # View logs
./postgres-dev.sh psql      # Connect to database
./postgres-dev.sh reset     # Reset database (deletes data)
```

---

## Option 2: Full Docker Development (SQLite)

Run everything in Docker with SQLite for a completely isolated environment.

```bash
docker-compose -f docker-compose.sqlite.yml up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Advantages
- ✅ Complete isolation
- ✅ Matches production-like environment
- ✅ No local dependencies needed

---

## Option 3: Full Docker Development (PostgreSQL)

Run everything in Docker with PostgreSQL for production-like development.

```bash
docker-compose -f docker-compose.postgres.yml up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- PostgreSQL: localhost:5432

### Advantages
- ✅ Production-like database
- ✅ Complete isolation
- ✅ Test database migrations

---

## Option 4: Local Development (No Docker)

Run everything locally without Docker.

### Setup

1. Install PostgreSQL or use SQLite
2. Configure `backend/.env`
3. Run backend: `cd backend && npm run dev`
4. Run frontend: `cd frontend && npm run dev`

### Advantages
- ✅ Maximum performance
- ✅ Easiest debugging
- ✅ Full control

---

## Comparison

| Feature | VM + Docker PG | Full Docker (SQLite) | Full Docker (PG) | All Local |
|---------|----------------|----------------------|------------------|-----------|
| Setup Time | Fast | Fast | Medium | Medium |
| Dev Speed | ⚡ Fast | Slow | Slow | ⚡ Fastest |
| Hot Reload | ✅ Yes | ⚠️ Limited | ⚠️ Limited | ✅ Yes |
| Debugging | ✅ Easy | ⚠️ Harder | ⚠️ Harder | ✅ Easy |
| DB Consistency | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Manual |
| Production-like | ✅ Yes | ⚠️ Partial | ✅ Yes | ⚠️ Depends |

**Recommendation**: Use **Option 1 (VM + Docker PostgreSQL)** for the best development experience.
