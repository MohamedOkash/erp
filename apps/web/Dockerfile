# ============================================================================
# Multi-Stage Dockerfile for Vite React SPA Frontend
# ============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and app package descriptors
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install build dependencies
RUN npm --prefix apps/web install

# Copy source code and config
COPY apps/web ./apps/web

# Build static production bundle
RUN npm --prefix apps/web run build

# Stage 2: Nginx Static Server
FROM nginx:alpine AS runner

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built SPA dist from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
