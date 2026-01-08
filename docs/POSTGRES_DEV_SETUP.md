# PostgreSQL Only Setup

This configuration runs only PostgreSQL in Docker, while backend and frontend run directly on the VM.

## Quick Start

### 1. Start PostgreSQL

```bash
docker-compose -f docker-compose.postgres-only.yml up -d
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nutrivault
DB_USER=nutrivault_user
DB_PASSWORD=nutrivault_password
DB_DIALECT=postgres

# Server Configuration
NODE_ENV=development
PORT=3001

# JWT Configuration (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Other Settings
BCRYPT_ROUNDS=10
DB_LOGGING=true
DB_SYNC=true
```

### 3. Run Backend

```bash
cd backend
npm install
npm run dev
```

The backend will be available at http://localhost:3001

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:5173

## Managing PostgreSQL

### Check PostgreSQL Status

```bash
docker-compose -f docker-compose.postgres-only.yml ps
```

### View PostgreSQL Logs

```bash
docker-compose -f docker-compose.postgres-only.yml logs -f postgres
```

### Stop PostgreSQL

```bash
docker-compose -f docker-compose.postgres-only.yml down
```

### Stop and Remove Data

```bash
docker-compose -f docker-compose.postgres-only.yml down -v
```

### Access PostgreSQL CLI

```bash
docker exec -it nutrivault-postgres-dev psql -U nutrivault_user -d nutrivault
```

## Environment Variables

You can override default values by creating a `.env` file in the root directory:

```bash
# .env
DB_NAME=nutrivault
DB_USER=nutrivault_user
DB_PASSWORD=nutrivault_password
DB_PORT=5432
```

## Advantages of This Setup

- **Faster Development**: No need to rebuild Docker images for code changes
- **Better Debugging**: Direct access to Node.js debugger and console
- **Hot Reload**: Frontend and backend hot reload work naturally
- **Database Consistency**: PostgreSQL in container ensures consistent database environment
- **Easy Database Management**: Docker volumes for easy backup/restore

## Troubleshooting

### Backend Can't Connect to Database

1. Check PostgreSQL is running:
   ```bash
   docker-compose -f docker-compose.postgres-only.yml ps
   ```

2. Verify DB_HOST is set to `localhost` (not `postgres`)

3. Check PostgreSQL logs:
   ```bash
   docker-compose -f docker-compose.postgres-only.yml logs postgres
   ```

### Port Already in Use

If port 5432 is already in use, change it in `.env`:

```bash
DB_PORT=5433
```

Then update your backend `.env` to match.
