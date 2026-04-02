# Stage 1: Build Environment (Workspaces)
FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy root manifest and lockfile
COPY package*.json ./
# Copy workspace manifests
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies for all workspaces at once using root lockfile
# This is much faster and ensures consistency
RUN npm ci --include=dev

# Copy source code
COPY . .

# Generate Prisma client
WORKDIR /app/backend
RUN npx prisma generate

# Build both applications
WORKDIR /app
RUN npm run build --workspace=frontend
RUN npm run build --workspace=backend

# Stage 2: Final Production Image
FROM node:20-slim
RUN apt-get update && apt-get install -y openssl sqlite3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy Backend artifacts from the workspace-aware builder
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/backend/prisma ./prisma

# Copy Frontend static files from the workspace-aware builder
COPY --from=builder /app/frontend/dist ./frontend/dist

# Environment configuration
# Note: You should still provide JWT secrets and ENCRYPTION_KEY at runtime
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Apply versioned migrations on startup
# Then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

