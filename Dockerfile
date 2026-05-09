# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Stage 2: Build Backend
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production Server
FROM node:22-alpine
WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy backend dependencies and build
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/prisma ./backend/prisma

# Copy frontend build to the location the backend expects
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

# Expose the API port
EXPOSE 3001

# Command to ensure DB is updated and start the server
# Note: we use sh -c to chain the database push and the server start
CMD ["sh", "-c", "npx prisma db push && npm start"]
