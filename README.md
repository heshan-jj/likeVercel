# 🚀 LikeVercel-Docker

A self-hosted, cloud-management platform designed to provide a streamlined, "Vercel-like" experience for managing Virtual Private Servers (VPS). Bridge the gap between raw SSH access and complex cloud consoles.

![Dashboard Preview](https://via.placeholder.com/800x450?text=LikeVercel+Dashboard+Preview)

## ✨ Features

- **Unified Dashboard**: Manage your entire VPS fleet from a single interactive interface.
- **Browser-based Terminal**: Full xterm.js terminal integration for direct SSH access.
- **Visual File Manager**: Browse, upload, and manage remote files without SFTP clients.
- **Process Orchestration**: 
  - Deploy apps (Node, Python, Go, Rust, PHP, Static) with one click.
  - Auto-install PM2 if missing.
  - Adopt existing unmanaged processes.
- **Reverse Proxy Manager**: Configure Nginx reverse proxies via UI—no manual `.conf` editing.
- **Resource Monitoring**: Real-time CPU and RAM telemetry.
- **Security-First**: AES-256-GCM encryption for credentials, SSH key vault, and PIN-protected access.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, Prisma (SQLite), Socket.io.
- **Infrastructure**: SSH2, Docker, PM2.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20 or higher (for local development).
- **Docker & Docker Compose**: (for production/containerized deployment).
- **Git**: To clone the repository.

### 2. Environment Setup
Copy the example environment file and update the values:
```bash
cp .env.example .env
```
> **Note**: For Docker, ensure `DATABASE_URL` is set to `file:/app/backend/data/db.sqlite`.

---

## 💻 Local Development

Run the entire stack concurrently:

```bash
# Install dependencies
npm install

# Run backend & frontend together
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend**: [http://localhost:3001](http://localhost:3001)

---

## 🐳 Docker Deployment (Recommended)

The easiest way to run LikeVercel-Docker in production.

### Using NPM Scripts (Wrappers)
We've included several helper scripts in the root `package.json`:

| Command | Description |
| :--- | :--- |
| `npm run docker:build` | Build the production image |
| `npm run docker:up` | Start the container in detached mode |
| `npm run docker:rebuild` | Rebuild and restart (best for updates) |
| `npm run docker:stop` | Stop the container |
| `npm run docker:logs` | Follow container logs |

### Manual Docker Commands
```bash
docker-compose up -d --build
```

The application will be accessible at **[http://localhost:3001](http://localhost:3001)**.

---

## 🛡️ Security Configuration

- **PIN Setup**: On first launch, you will be prompted to set a master PIN.
- **Encryption Key**: Ensure `ENCRYPTION_KEY` in `.env` is a 64-character hex string. This is used to encrypt your VPS credentials at rest.
- **SSH Keys**: You can generate or import SSH keys within the "Keys" tab to securely connect to your servers.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
MIT License - Copyright (c) 2026
