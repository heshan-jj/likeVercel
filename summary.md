# LikeVercel-Docker: Application Summary

## Overview
LikeVercel-Docker is a self-hosted, cloud-management platform designed to provide a streamlined, "Vercel-like" experience for managing Virtual Private Servers (VPS). It allows developers to provision, monitor, and manage their own infrastructure through a sleek, unified web interface, bridging the gap between raw SSH access and complex cloud consoles.

---

## Core Philosophy
- **Security First**: Everything is protected by a PIN-based authentication system and AES-256-GCM encryption for sensitive data (like SSH keys).
- **Direct Infrastructure Control**: Unlike managed platforms, you own the hardware. The app acts as an orchestrator over your existing VPS nodes.
- **Real-time Feedback**: Utilizing WebSockets for live terminals and resource monitoring.

---

## Technical Stack
- **Frontend**: React (TypeScript), Tailwind CSS, Lucide Icons, Xterm.js (Terminal).
- **Backend**: Node.js (Express), TypeScript, Prisma ORM (SQLite).
- **Infrastructure**: Docker-ready for easy deployment.
- **Communication**: REST APIs and WebSockets (Socket.io).

---

## Key Features & Modules

### 1. Infrastructure Dashboard
- **Node Management**: Add, edit, and decommission VPS instances.
- **Status Monitoring**: Real-time "Live/Offline" status detection for all connected nodes.
- **Resource Overview**: Compact resource charts (CPU/RAM) visible directly on the dashboard.
- **View Modes**: Toggle between Grid and List views with persistent preferences.

### 2. VPS Detail View (The Management Hub)
Each VPS node has a dedicated control center with five specialized modules:
- **Terminal**: A full-featured, browser-based SSH terminal (xterm.js) for direct command-line interaction.
- **File System**: A graphical file manager to browse, upload, download, and manage files on the remote server.
- **App Clusters (Process Manager)**: Monitor running processes (via `top`/`ps` integration) to keep track of application health.
- **Networking (Port Manager)**: Scan and monitor open ports and active network connections on the VPS.
- **Proxies (Domain Manager)**: Manage Nginx/Proxy configurations to point domains to local services.

### 3. Access Vault (SSH Key Manager)
- **Identity Provisioning**: Paste existing SSH keys or generate new secure Ed25519 pairs.
- **Cluster Distribution**: Seamlessly "push" public keys to any connected VPS node to authorize access without manual `authorized_keys` editing.
- **Encryption**: Private keys are encrypted at rest using industry-standard protocols.

### 4. System Security & Maintenance
- **PIN Authentication**: Secure entry point for the entire application.
- **Theme Engine**: Support for Dark, Light, and System-synced visual profiles.
- **Data Persistence**: Tools to rotate access tokens, download SQLite database backups, or restore system state from a snapshot.
- **Factory Reset**: A "Danger Zone" option to purge all configurations and start fresh.

---

## Core Logic & Workflows

### SSH Management Logic
The backend uses a specialized `SSHManager` service to maintain persistent connections to nodes. This service handles authentication (Password or SSH Key) and provides the bridge for the terminal, file operations, and resource polling.

### Layout & Responsiveness
The UI uses a flexible, centered layout (max-width containers) for management pages while providing a full-screen immersive experience for the VPS Detail view and Terminal. The application is scaled globally for high readability (currently set to 125% base scale).

### Connection Resilience
The application distinguishes between "Profile Data" (what you saved) and "Live Specs" (what the server actually reports). If a server goes offline, the UI gracefully falls back to "Offline States," restricting access to remote-only modules like the Terminal or File Manager until the connection is restored.
