# ─────────────────────────────────────────
# Stage 1: Build frontend
# ─────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy workspace configuration and lock file
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install only frontend dependencies
RUN npm install --workspace=frontend

# Copy frontend source and build
COPY frontend/ ./frontend/
RUN npm run build --workspace=frontend


# ─────────────────────────────────────────
# Stage 2: Build backend
# ─────────────────────────────────────────
FROM node:20-alpine AS backend-builder

# Install build dependencies for native modules like bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace configuration and lock file
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma

# Install backend dependencies
RUN npm install --workspace=backend

# Generate Prisma client
RUN npx prisma generate --schema=backend/prisma/schema.prisma

# Copy backend source and build
COPY backend/ ./backend/
RUN npm run build --workspace=backend


# ─────────────────────────────────────────
# Stage 3: Production image
# ─────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files for production install
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma

# Install production deps only
RUN npm install --omit=dev --workspace=backend

WORKDIR /app/backend

# Copy compiled backend from builder
COPY --from=backend-builder /app/backend/dist ./dist

# Copy the generated Prisma client from builder
COPY --from=backend-builder /app/node_modules/.prisma ../node_modules/.prisma
COPY --from=backend-builder /app/node_modules/@prisma/client ../node_modules/@prisma/client

# Copy built frontend where Express expects it
COPY --from=frontend-builder /app/frontend/dist ../frontend/dist

# Persist the SQLite database via a named volume
RUN mkdir -p /app/backend/prisma/data
VOLUME ["/app/backend/prisma/data"]

EXPOSE 3001

CMD ["sh", "-c", "DATABASE_URL=file:/app/backend/prisma/data/prod.db npx prisma db push --skip-generate && node dist/index.js"]


