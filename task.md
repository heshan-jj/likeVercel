# VPS Deployment Platform - Phase 1 MVP

## Planning
- [/] Create implementation plan
- [ ] Get user approval on plan

## Project Setup
- [x] Initialize monorepo (backend + frontend) with Vite + React + Node.js/Express
- [x] Configure TypeScript for backend and frontend
- [x] Set up PostgreSQL with Prisma ORM
- [x] Set up environment configuration (.env, dotenv)
- [x] Install core dependencies (ssh2, socket.io, xterm.js, bcrypt, jsonwebtoken)

## Authentication & User Management
- [ ] User database schema (Prisma) with encrypted credentials
- [ ] JWT-based auth (register/login/logout) with middleware
- [ ] Token refresh and session management
- [ ] Auth pages UI (Login, Register)

## VPS Connection Module
- [x] SSH connection manager class (ssh2)
- [x] Connection pooling & keep-alive
- [x] AES-256-GCM credential encryption/decryption
- [x] VPS profiles CRUD API + UI
- [x] Connection testing endpoint

## File Transfer System
- [ ] SFTP implementation (upload/download/stream)
- [ ] File browser API (list, create, delete, rename)
- [ ] File browser UI with drag & drop
- [ ] Progress indicators
- [ ] Path traversal prevention

## Built-in Terminal
- [x] PTY allocation via SSH shell
- [x] WebSocket terminal handler (Socket.io)
- [ ] Xterm.js integration with addons (fit, web-links)
- [ ] Terminal resize, copy/paste, themes
- [ ] Multiple terminal tabs

## Server Process Management
- [ ] Project type detection (Node, Python, static)
- [ ] Process launcher with environment injection
- [ ] Process monitor (start/stop/restart/status)
- [ ] Real-time log streaming
- [ ] Process management UI

## Port Management
- [x] Port allocation & conflict detection
- [x] Shareable access URL generation
- [ ] Port management UI

## Dashboard & UI
- [ ] Dashboard with VPS overview cards and status
- [ ] VPS detail view (tabbed: files, terminal, processes, ports)
- [ ] Responsive design with dark mode
- [ ] Navigation and layout components

## Verification
- [ ] Backend API tests (auth, VPS CRUD, file ops)
- [ ] Frontend build verification
- [ ] Browser-based UI walkthrough
