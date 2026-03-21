# ─────────────────────────────────────────
# Stage 1: Build frontend
# ─────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install -f

COPY frontend/ ./
RUN npm run build


# ─────────────────────────────────────────
# Stage 2: Build backend
# ─────────────────────────────────────────
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma

# Install all deps
RUN npm install -f

# Generate Prisma client BEFORE compiling so it exists in node_modules
RUN npx prisma generate

# Compile TypeScript
RUN npm run build


# ─────────────────────────────────────────
# Stage 3: Production image
# ─────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app/backend

# Install production deps only
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm install --omit=dev

# Copy compiled backend from builder
COPY --from=backend-builder /app/backend/dist ./dist

# Copy the generated Prisma client from builder (includes .prisma & @prisma/client)
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy built frontend where Express expects it
COPY --from=frontend-builder /app/frontend/dist ../frontend/dist

# Persist the SQLite database via a named volume
RUN mkdir -p /app/backend/prisma/data
VOLUME ["/app/backend/prisma/data"]

EXPOSE 3001

CMD ["sh", "-c", "DATABASE_URL=file:/app/backend/prisma/data/prod.db npx prisma db push --skip-generate && node dist/index.js"]
