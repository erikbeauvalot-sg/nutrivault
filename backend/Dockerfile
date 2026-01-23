# Backend Dockerfile for NutriVault
# Multi-stage build for optimized production image
# Build context: project root

FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    sqlite

WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./

# Install ALL dependencies (including devDependencies for sequelize-cli)
# sequelize-cli is needed for database migrations
RUN npm ci && \
    npm cache clean --force

# Development stage
FROM base AS development
COPY backend/ .
COPY models/ ./models/
COPY migrations/ ./migrations/
COPY config/ ./config/
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Copy backend application code
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/.sequelizerc.docker ./.sequelizerc
COPY backend/migrate.js ./migrate.js
COPY backend/seed.js ./seed.js

# Copy models, migrations and config from project root
COPY models/ ./models/
COPY migrations/ ./migrations/
COPY backend/migrations/ ./backend-migrations/
COPY config/ ./config/

# Create symbolic link for models at root level (for ../../models require in server.js)
RUN ln -s /app/models /models && \
    ln -s /app/config /config

# Make entrypoint script executable
RUN chmod +x /app/scripts/docker-entrypoint.sh

# Create directories for data persistence
RUN mkdir -p /app/data /app/temp_uploads /app/uploads /app/logs && \
    chmod 777 /app/data /app/temp_uploads /app/uploads /app/logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Entrypoint and start command
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
