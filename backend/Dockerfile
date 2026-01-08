# Backend Dockerfile for NutriVault
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies (production only)
RUN npm ci --omit=dev && npm cache clean --force

# Development dependencies for build
FROM base AS build-deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci

# Build stage (if needed for TypeScript compilation)
FROM build-deps AS builder
WORKDIR /app
COPY . .
# Uncomment if using TypeScript
# RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nutrivault

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy models from root first (before backend code)
COPY --chown=nutrivault:nodejs models/ ./models/

# Copy application code (backend directory excluding models which was copied above)
COPY --chown=nutrivault:nodejs backend/ .

# Create necessary directories
RUN mkdir -p /app/data /app/uploads /app/logs && \
    chown -R nutrivault:nodejs /app/data /app/uploads /app/logs

# Switch to non-root user
USER nutrivault

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]
