# ⚡ likeVercel

A self-hosted, full-stack VPS management dashboard. Connect to your remote servers over SSH and manage everything — terminal, files, processes, ports, and domain proxies — from a single browser-based interface.

> Built with React, Node.js, Prisma, Socket.io, and SSH2. Runs entirely on your own machine or server. No cloud account required.

---

## Features

- **Interactive Terminal** — Full browser-based SSH shell powered by Xterm.js and WebSockets. Tabs stay alive when you switch between them.
- **File Manager** — Browse, rename, move, and delete remote files via SFTP. Drag-and-drop upload up to 100MB.
- **Process Manager** — A graphical PM2 interface. Deploy Node.js, Python, or static apps with auto-detection. View live logs and errors per process. Auto-discovers existing PM2 processes on connection.
- **Live Resource Monitor** — Real-time CPU and RAM usage polled directly from `/proc/stat`.
- **Port Auditor** — Scan your VPS for all active listening ports and manage which ones are exposed.
- **Domain Proxy Manager** — Map public domains (e.g. `app.example.com`) to internal ports on your server.
- **SSH Key Manager** — Generate Ed25519 keypairs server-side, install public keys directly onto connected VPS instances, and store private keys encrypted at rest.
- **Credential Vault** — All passwords and private keys are encrypted with AES-256-GCM before being stored in the database.
- **Single-Admin Lock** — Only one account can be registered. All further registrations are blocked.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Xterm.js, Socket.io-client |
| Backend | Node.js, Express, TypeScript, Socket.io |
| Database | SQLite via Prisma ORM |
| SSH/SFTP | ssh2 |
| Security | JWT, Bcrypt, AES-256-GCM, Helmet |

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop) (recommended)
- Or: Node.js 20+ for running locally

---

### Option A — Docker (Recommended)

The easiest way to run likeVercel. One command spins up the full stack.

**1. Clone the repo**

```bash
git clone https://github.com/your-username/likeVercel.git
cd likeVercel
```

**2. Set up your environment**

```bash
cp .env.example .env
```

Open `.env` and fill in the required secrets:

```env
JWT_SECRET=your-long-random-string
JWT_REFRESH_SECRET=another-long-random-string
ENCRYPTION_KEY=a-64-character-hex-string
```

To generate a valid `ENCRYPTION_KEY` on Windows (PowerShell):
```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

On macOS / Linux:
```bash
openssl rand -hex 32
```

**3. Build and run**

```bash
docker compose up --build
```

The app will be live at **http://localhost:3001**

**Useful Docker commands:**

```bash
# Run in the background
docker compose up --build -d

# View live logs
docker compose logs -f

# Stop the app
docker compose down

# Full reset (wipes the database)
docker compose down -v
```

---

### Option B — Local Development

**1. Install dependencies**

```bash
npm run install:all
```

**2. Set up environment variables**

```bash
cp .env.example .env
# Fill in JWT_SECRET, JWT_REFRESH_SECRET, and ENCRYPTION_KEY
```

**3. Initialize the database**

```bash
cd backend
npm run db:push
```

**4. Start the dev servers**

```bash
# From the project root
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing refresh tokens |
| `ENCRYPTION_KEY` | ✅ | 64-character hex key for AES-256-GCM credential encryption |
| `PORT` | ❌ | Backend port (default: `3001`) |
| `NODE_ENV` | ❌ | `development` or `production` |
| `JWT_EXPIRES_IN` | ❌ | Access token TTL (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | ❌ | Refresh token TTL (default: `7d`) |
| `FRONTEND_URL` | ❌ | Used for CORS (default: `http://localhost:5173` in dev, `http://localhost:3001` in Docker) |
| `DATABASE_URL` | ❌ | Prisma DB path (default: `file:./dev.db`) |

---

## Production Deployment

To deploy likeVercel on a VPS:

**1. Build the project**

```bash
npm run build
```

**2. Set environment variables**

Set `NODE_ENV=production` in your `.env`. In production mode, the backend automatically serves the compiled frontend from `frontend/dist`.

**3. Start with PM2**

```bash
pm2 start backend/dist/index.js --name "likevercel"
```

Or use Docker on the server:

```bash
docker compose up -d
```

---

## Resetting Your Account

likeVercel only allows one admin account. If you forget your password, you need to wipe the database manually:

**Docker:**
```bash
docker compose down -v
docker compose up
```

**Local:**
```bash
# Stop the backend, then:
cd backend
rm prisma/dev.db
npm run db:push
```

---

## Health Check

```
GET /api/health
```

Returns server uptime and database status:

```json
{
  "status": "ok",
  "database": "ok",
  "uptime": 123.45,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## License

MIT License. Created by Heshan Jayakody.
