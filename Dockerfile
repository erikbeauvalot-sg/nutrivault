# Multi-stage Dockerfile for NutriVault
# Builds frontend and runs backend in a single container

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Stage 2: Build Backend
FROM node:18-alpine AS backend-build

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy root package files for database CLI
COPY package*.json ./
RUN npm ci --only=production

# Copy backend package files
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Stage 3: Production Image
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nutrivault && \
    adduser -u 1001 -S nutrivault -G nutrivault

WORKDIR /app

# Copy root dependencies and scripts
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/package*.json ./

# Copy backend
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/

# Copy database models, migrations, seeders (at root level)
COPY models/ ./models/
COPY migrations/ ./migrations/
COPY seeders/ ./seeders/
COPY config/ ./config/
COPY .sequelizerc ./

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create necessary directories
RUN mkdir -p /app/backend/data && \
    mkdir -p /app/backend/logs && \
    mkdir -p /app/backend/uploads && \
    chown -R nutrivault:nutrivault /app

# Switch to non-root user
USER nutrivault

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start command (can be overridden)
CMD ["node", "backend/src/server.js"]
