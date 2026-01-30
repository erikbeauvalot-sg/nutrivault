# Backend Dockerfile for NutriVault
# Multi-stage build for optimized production image
# Build context: project root

# Build arguments for versioning
ARG VERSION=latest
ARG BUILD_DATE
ARG GIT_COMMIT

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
# --loglevel=warn suppresses deprecation notices from transitive dependencies
RUN npm ci --loglevel=warn && \
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

# Re-declare ARGs for this stage (ARGs don't persist across FROM)
ARG VERSION=latest
ARG BUILD_DATE
ARG GIT_COMMIT

# Add image labels for version tracking
LABEL org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.title="NutriVault Backend" \
      org.opencontainers.image.description="NutriVault Backend API Server" \
      org.opencontainers.image.vendor="NutriVault"

# Expose version as environment variable for runtime access
ENV APP_VERSION=${VERSION}

# Copy backend application code
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/.sequelizerc.docker ./.sequelizerc
COPY backend/migrate.js ./migrate.js
COPY backend/seed.js ./seed.js

# Copy models, migrations, seeders and config from project root
COPY models/ ./models/
COPY migrations/ ./migrations/
COPY backend/migrations/ ./migrations/
COPY seeders/ ./seeders/
COPY backend/seeders/ ./seeders/
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

# Install su-exec for dropping privileges
RUN apk add --no-cache su-exec

# Keep running as root - entrypoint will drop to nodejs after setup
# USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Entrypoint and start command
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
