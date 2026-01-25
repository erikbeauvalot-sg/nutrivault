# Frontend Dockerfile for NutriVault
# Multi-stage build: Build React app, then serve with Nginx

# Build arguments for versioning
ARG VERSION=latest
ARG BUILD_DATE
ARG GIT_COMMIT

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files from frontend directory
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code from frontend directory
COPY frontend/ .

# Build the application
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine AS production

# Re-declare ARGs for this stage
ARG VERSION=latest
ARG BUILD_DATE
ARG GIT_COMMIT

# Add image labels for version tracking
LABEL org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.title="NutriVault Frontend" \
      org.opencontainers.image.description="NutriVault Frontend Web Application" \
      org.opencontainers.image.vendor="NutriVault"

# Copy custom nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Set proper permissions for nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
