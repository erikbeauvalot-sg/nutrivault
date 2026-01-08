# Docker Testing Guide

This guide explains how to test the Docker deployment for NutriVault.

## Prerequisites

- Docker installed and running
- Docker Compose installed
- At least 4GB free disk space
- Ports 3001, 5173, 5432, and 8080 available

## Quick Test

Run the automated test suite:

```bash
./test-docker.sh
```

This script will:
1. Verify Docker is properly installed
2. Build and test backend Docker image
3. Build and test frontend Docker image
4. Test PostgreSQL docker-compose stack
5. Test SQLite docker-compose stack
6. Report results

## Manual Testing

### Test Backend Dockerfile

```bash
# Build backend image
docker build -t nutrivault-backend-test ./backend

# Run backend container (SQLite)
docker run -d --name backend-test \
  -p 3001:3001 \
  -e NODE_ENV=development \
  -e DB_DIALECT=sqlite \
  -e DB_STORAGE=/app/data/test.sqlite \
  -e JWT_SECRET=test-secret \
  -e JWT_REFRESH_SECRET=test-refresh-secret \
  nutrivault-backend-test

# Check backend health
curl http://localhost:3001/health

# Check logs
docker logs backend-test

# Cleanup
docker stop backend-test
docker rm backend-test
docker rmi nutrivault-backend-test
```

### Test Frontend Dockerfile

```bash
# Build frontend image
docker build -t nutrivault-frontend-test ./frontend

# Run frontend container
docker run -d --name frontend-test \
  -p 8080:80 \
  nutrivault-frontend-test

# Test frontend
curl http://localhost:8080/
curl http://localhost:8080/health

# Check logs
docker logs frontend-test

# Cleanup
docker stop frontend-test
docker rm frontend-test
docker rmi nutrivault-frontend-test
```

### Test PostgreSQL Stack

```bash
# Copy environment example
cp .env.example .env

# Edit .env if needed (optional)
nano .env

# Start stack
docker-compose -f docker-compose.postgres.yml up -d

# Wait for services to be healthy (check status)
docker-compose -f docker-compose.postgres.yml ps

# Check logs
docker-compose -f docker-compose.postgres.yml logs backend
docker-compose -f docker-compose.postgres.yml logs frontend
docker-compose -f docker-compose.postgres.yml logs postgres

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:5173/

# Access PostgreSQL
docker-compose -f docker-compose.postgres.yml exec postgres psql -U nutrivault_user -d nutrivault

# Run migrations
docker-compose -f docker-compose.postgres.yml exec backend npm run db:migrate

# Seed database
docker-compose -f docker-compose.postgres.yml exec backend npm run db:seed

# Cleanup
docker-compose -f docker-compose.postgres.yml down -v
```

### Test SQLite Stack

```bash
# Copy environment example
cp .env.example .env

# Start stack
docker-compose -f docker-compose.sqlite.yml up -d

# Check status
docker-compose -f docker-compose.sqlite.yml ps

# Check logs
docker-compose -f docker-compose.sqlite.yml logs backend
docker-compose -f docker-compose.sqlite.yml logs frontend

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:5173/

# Run migrations
docker-compose -f docker-compose.sqlite.yml exec backend npm run db:migrate

# Seed database
docker-compose -f docker-compose.sqlite.yml exec backend npm run db:seed

# Access SQLite database
docker-compose -f docker-compose.sqlite.yml exec backend sqlite3 /app/data/nutrivault.sqlite

# Cleanup
docker-compose -f docker-compose.sqlite.yml down -v
```

## Test Checklist

### Backend Dockerfile Tests
- [ ] Image builds successfully
- [ ] Image uses Node 18 Alpine
- [ ] Non-root user (nutrivault) is created
- [ ] Port 3001 is exposed
- [ ] Health check works
- [ ] Container starts without errors
- [ ] Required directories exist (/app/data, /app/uploads, /app/logs)
- [ ] node_modules are installed
- [ ] Application code is copied

### Frontend Dockerfile Tests
- [ ] Image builds successfully
- [ ] Image uses Nginx Alpine
- [ ] Non-root user (nutrivault) is created
- [ ] Port 80 is exposed
- [ ] Health check works
- [ ] Container starts without errors
- [ ] Built files are in /usr/share/nginx/html
- [ ] Nginx serves files correctly
- [ ] SPA routing works (nginx.conf)

### PostgreSQL Stack Tests
- [ ] All services start successfully
- [ ] PostgreSQL is healthy
- [ ] Backend is healthy
- [ ] Frontend is running
- [ ] Backend connects to PostgreSQL
- [ ] Backend health endpoint responds
- [ ] Frontend serves pages
- [ ] Database migrations run successfully
- [ ] Database seeding works
- [ ] Data persists in volumes

### SQLite Stack Tests
- [ ] All services start successfully
- [ ] Backend is healthy
- [ ] Frontend is running
- [ ] SQLite database file is created
- [ ] Backend health endpoint responds
- [ ] Frontend serves pages
- [ ] Database migrations run successfully
- [ ] Database seeding works
- [ ] Data persists in volumes

## Troubleshooting

### Backend container fails to start

**Check logs:**
```bash
docker-compose -f docker-compose.postgres.yml logs backend
# or
docker logs backend-test
```

**Common issues:**
- Missing environment variables
- Database connection failure
- Port already in use
- Permission issues

**Solutions:**
```bash
# Check environment variables
docker-compose -f docker-compose.postgres.yml exec backend env

# Test database connection
docker-compose -f docker-compose.postgres.yml exec backend nc -zv postgres 5432

# Check port availability
lsof -i :3001
```

### Frontend container fails to start

**Check logs:**
```bash
docker-compose -f docker-compose.postgres.yml logs frontend
```

**Common issues:**
- Build failure
- Nginx configuration error
- Port already in use

**Solutions:**
```bash
# Rebuild with no cache
docker-compose -f docker-compose.postgres.yml build --no-cache frontend

# Check nginx config
docker-compose -f docker-compose.postgres.yml exec frontend nginx -t

# Check port availability
lsof -i :5173
```

### PostgreSQL connection issues

**Check PostgreSQL logs:**
```bash
docker-compose -f docker-compose.postgres.yml logs postgres
```

**Test connection:**
```bash
# From host
psql -h localhost -p 5432 -U nutrivault_user -d nutrivault

# From backend container
docker-compose -f docker-compose.postgres.yml exec backend nc -zv postgres 5432
```

**Common issues:**
- Wrong credentials
- Database not initialized
- Network issues

### Health checks fail

**Check health check command:**
```bash
# Backend
docker-compose -f docker-compose.postgres.yml exec backend curl -f http://localhost:3001/health

# Frontend
docker-compose -f docker-compose.postgres.yml exec frontend wget --spider http://localhost/health
```

**Common issues:**
- Health endpoint not implemented
- Service not fully started
- Timeout too short

### Build failures

**Clear Docker cache:**
```bash
docker system prune -a -f
docker builder prune -a -f
```

**Rebuild without cache:**
```bash
docker-compose -f docker-compose.postgres.yml build --no-cache
```

**Check disk space:**
```bash
docker system df
df -h
```

## Performance Testing

### Measure build time

```bash
time docker build -t nutrivault-backend-test ./backend
time docker build -t nutrivault-frontend-test ./frontend
```

### Check image sizes

```bash
docker images | grep nutrivault
```

### Monitor resource usage

```bash
# While stack is running
docker stats

# Check specific container
docker stats nutrivault-backend
```

## Cleanup

### Remove all test containers

```bash
docker ps -a | grep nutrivault | awk '{print $1}' | xargs docker rm -f
```

### Remove all test images

```bash
docker images | grep nutrivault | awk '{print $3}' | xargs docker rmi -f
```

### Remove all volumes

```bash
docker volume ls | grep nutrivault | awk '{print $2}' | xargs docker volume rm
```

### Complete cleanup

```bash
# Stop all stacks
docker-compose -f docker-compose.postgres.yml down -v
docker-compose -f docker-compose.sqlite.yml down -v

# Remove everything
docker system prune -a -f --volumes
```

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
- name: Test Docker Build
  run: |
    chmod +x test-docker.sh
    ./test-docker.sh
```

## Best Practices

1. **Always test both stacks** (PostgreSQL and SQLite)
2. **Run tests before pushing** to repository
3. **Check logs** for warnings even if tests pass
4. **Verify health checks** work correctly
5. **Test migrations** on fresh database
6. **Monitor resource usage** during tests
7. **Clean up** after testing to free disk space
8. **Update tests** when Dockerfiles change

## Support

For issues with Docker testing:
1. Check this documentation
2. Review Docker logs
3. Run automated test script with verbose output
4. Check GitHub issues

---

**Last Updated**: 2026-01-08
**Script Version**: 1.0
