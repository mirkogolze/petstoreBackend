# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for Petstore API
# Follows Docker best practices for Node.js applications
# https://docs.docker.com/language/nodejs/

# =========================================
# Stage 1: Dependencies Installation
# =========================================
ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION} AS deps

# Install system dependencies for Prisma
RUN apk add --no-cache \
    openssl \
    libc6-compat

WORKDIR /app

# Copy package files for dependency resolution
COPY package*.json ./

# Install ALL dependencies (needed for build stage)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# =========================================
# Stage 2: Build Stage
# =========================================
FROM node:${NODE_VERSION} AS build

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript application
RUN npm run build

# =========================================
# Stage 3: Production Dependencies
# =========================================
FROM node:${NODE_VERSION} AS prod-deps

# Install system dependencies for Prisma
RUN apk add --no-cache \
    openssl \
    libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
# Set npm_config_ignore_scripts to skip prepare script (husky)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts

# Copy Prisma schema for client generation
COPY prisma ./prisma/

# Generate Prisma Client for production
# Set dummy DATABASE_URL for generation (not used at build time)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate
ENV DATABASE_URL=""

# =========================================
# Stage 4: Final Production Image
# =========================================
FROM node:${NODE_VERSION} AS final

# Install runtime dependencies
RUN apk add --no-cache \
    openssl \
    dumb-init \
    curl

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/prisma ./prisma

# Copy production dependencies
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy package.json for npm scripts
COPY --chown=nodejs:nodejs package*.json ./

# Copy OpenAPI specification
COPY --chown=nodejs:nodejs openapi ./openapi

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production \
    PORT=3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/src/index.js"]
