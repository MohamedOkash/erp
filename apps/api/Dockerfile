# ============================================================================
# Multi-Stage Dockerfile for NestJS API Service
# ============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and app package descriptors
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install build dependencies
RUN npm --prefix apps/api install

# Copy source code and database migrations
COPY apps/api ./apps/api
COPY db ./db
COPY scripts ./scripts

# Build production bundle
RUN npm --prefix apps/api run build

# Stage 2: Lean Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm --prefix apps/api install --omit=dev && npm cache clean --force

# Copy compiled artifacts and runtime scripts from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts ./scripts

# Create uploads directory for documents
RUN mkdir -p /app/apps/api/uploads/documents

# Expose API port
EXPOSE 3000

# Start production server
CMD ["node", "apps/api/dist/main.js"]
