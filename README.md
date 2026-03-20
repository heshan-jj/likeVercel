# ⚡️ likeVercel (formerly VDP)

A robust, full-stack management suite for remote servers. Orchestrate your infrastructure with a professional, laboratory-grade interface. 🧪✨

![likeVercel Dashboard](https://via.placeholder.com/800x450.png?text=likeVercel+Platform+Dashboard)

## 🚀 Key Capabilities & Functions

### 🖥 Unified Dashboard
The command center of your hosting fleet.
- **Monitoring**: Visualize your overall server health.
- **Node Overview**: Lists all your connected VPS instances with real-time status indicators (Online/Dormant).
- **Fast Access**: Jump directly into any node's console or files from one screen.

### 🐚 Remote Terminal (Interactive Shell)
A high-performance, browser-aware SSH client.
- **Persistence**: Swapping tabs doesn't sever your connection. Your terminal stays alive in the background.
- **WebSocket Streaming**: Real-time terminal output with low-latency input using Xterm.js.
- **Full Shell Access**: Run standard linux commands (ls, cd, nano, etc.) directly in your browser.

### 🛡 Node Management & Security
Securely orchestrate your hardware.
- **Credential Vault**: Encrypts your passwords and Private Keys using military-grade AES-256-GCM before storing them in the database.
- **SSH Manager**: A unified service that pools and maintains active SSH connections, meaning you only authenticate once.

### 📂 File System Explorer
A visual SFTP manager for your remote storage.
- **File Operations**: Browse, rename, move, and delete files without typing a single command.
- **Drag & Drop Upload**: Upload project files up to 100MB directly to your server.
- **Secure Download**: Download your remote project files to your local machine instantly.

### 📦 App Deployment (Process Manager)
A graphical layer on top of PM2 for application orchestration.
- **Auto-Detect**: Scans your project path and guesses if it’s a Node.js, Python, or Static project.
- **Launch Protocol**: Automatically runs `npm install` and `pm2 start` to get your web-apps online.
- **Live Logs**: View standard output (logs) and error buffers for any running process in real-time.
- **🔍 Auto-Discovery**: Scanned a pre-existing VPS? likeVercel finds any existing PM2 processes and lets you "adopt" them into your dashboard.

### 🔌 Connectivity & Networking
Manage your server's public gateway.
- **Port Auditor**: Scan your VPS for active listening ports and filter them based on what's authorized.
- **Domain Proxies**: Maps your public domain names (like `app.example.com`) to internal ports on your server.

### 🔑 Local Authentication & Security
likeVercel is designed as a secure local dashboard.
- **Single Admin Lock**: Only one admin account can be registered. Further registrations are blocked.
- **Password Recovery**: Because there is no central server to send a reset email, forgetting your password requires a factory reset. Stop the backend, delete `backend/prisma/dev.db`, and run `npm run db:push` to wipe the DB and create a new account.

## 🛠 Tech Stack

### 💅 Frontend
- **Framework**: React 18 + Vite
- **Styling**: Vanilla CSS (Custom "Laboratory" Theme)
- **Icons**: Lucide React
- **Terminal**: Xterm.js + Socket.io-client

### ⚙️ Backend
- **Runtime**: Node.js + Express
- **Database**: SQLite (via Prisma ORM)
- **Communication**: Socket.io (WebSockets)
- **SSH/SFTP**: SSH2
- **Security**: JWT, Bcrypt, AES-256-GCM, Helmet

## 🏁 Getting Started

### 📦 1. Installation
Install dependencies for the entire workspace:

```bash
npm run install:all
```

### 🔨 2. Database Initialization
```bash
cd backend
npm run db:push
```

### 🚀 3. Run Development
Run both frontend and backend concurrently:

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 🚢 Production Deployment

To deploy likeVercel to your own VPS:

1. Build the project:
   ```bash
   npm run build
   ```
2. Set `NODE_ENV=production` in your `.env`.
3. Start the backend with PM2:
   ```bash
   pm2 start backend/dist/index.js --name "likeVercel"
   ```

The backend is configured to serve the frontend static files automatically in production mode. 🌐

## ⚖️ License
MIT License. Created by Heshan Jayakody. 👨‍💻
