# ─────────────────────────────────────────
# Stage 1: Build frontend
# ─────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy workspace configuration and lock file
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install only frontend dependencies (--legacy-peer-deps handles deprecated xterm packages)
RUN npm install --legacy-peer-deps --workspace=frontend

# Copy frontend source and build
COPY frontend/ ./frontend/
RUN npm run build --workspace=frontend


# ─────────────────────────────────────────
# Stage 2: Build backend
# ─────────────────────────────────────────
FROM node:20-alpine AS backend-builder

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace configuration and lock file
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma

# Install all backend dependencies (includes prisma CLI as devDep)
RUN npm install --workspace=backend

# Generate Prisma client
RUN npx prisma generate --schema=backend/prisma/schema.prisma

# Copy backend source and compile TypeScript
COPY backend/ ./backend/
RUN npm run build --workspace=backend


# ─────────────────────────────────────────
# Stage 3: Production image
# ─────────────────────────────────────────
FROM node:20-alpine AS production

# openssl is required by Prisma on Alpine (musl)
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

# Copy workspace + backend package files for production install
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma

# Install production deps only (python3/make/g++ needed to compile bcrypt)
RUN npm install --omit=dev --workspace=backend && \
    apk del python3 make g++

WORKDIR /app/backend

# Compiled backend
COPY --from=backend-builder /app/backend/dist ./dist

# Prisma client — main schema (line 72 already copies all of .prisma, including analytics-client subdir)
COPY --from=backend-builder /app/node_modules/.prisma ../node_modules/.prisma
COPY --from=backend-builder /app/node_modules/@prisma/client ../node_modules/@prisma/client

# Prisma package — needed at runtime for `prisma db push`
# (.bin/prisma is a symlink inside this package; no need to copy it separately)
COPY --from=backend-builder /app/node_modules/prisma ../node_modules/prisma

# Built frontend — Express serves this as static files in production
# index.ts resolves: path.resolve(__dirname, '../../frontend/dist')
# __dirname at runtime = /app/backend/dist → ../../frontend/dist = /app/frontend/dist ✓
COPY --from=frontend-builder /app/frontend/dist ../frontend/dist

# Persist the SQLite database via a named volume
RUN mkdir -p /app/backend/prisma/data
VOLUME ["/app/backend/prisma/data"]

EXPOSE 3001

# DATABASE_URL is injected by docker-compose.
# Push schema at startup, then boot the server.
CMD ["sh", "-c", "../node_modules/.bin/prisma db push --schema=./prisma/schema.prisma --skip-generate && node dist/index.js"]
