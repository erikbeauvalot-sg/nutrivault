# Frontend Dockerfile for NutriVault
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for Vite
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nutrivault -u 1001 && \
    chown -R nutrivault:nodejs /usr/share/nginx/html && \
    chown -R nutrivault:nodejs /var/cache/nginx && \
    chown -R nutrivault:nodejs /var/log/nginx && \
    chown -R nutrivault:nodejs /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nutrivault:nodejs /var/run/nginx.pid

# Switch to non-root user
USER nutrivault

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
