# Frontend Dockerfile for NutriVault
# Multi-stage build: Build React app, then serve with Nginx

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
