# VPS GUI - Backend

Express.js API for managing VPS deployments through a web interface.

## Features

- **User Authentication** - JWT-based auth with access/refresh tokens
- **VPS Management** - Add, edit, delete VPS profiles with SSH credentials
- **SSH Connection** - Connect to VPS via password or private key
- **File Management** - Browse, upload, download, rename, delete files via SFTP
- **Process Management** - Start/stop/restart Node.js, Python, or static sites via PM2
- **Port Management** - View active ports and generate shareable URLs
- **Terminal** - Real-time SSH terminal via WebSocket

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite (via Prisma)
- **WebSocket:** Socket.io
- **SSH:** ssh2
- **Auth:** JWT + bcrypt
- **Validation:** Zod
- **Security:** Helmet, CORS, rate limiting

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── config/
│   │   └── index.ts       # Environment configuration
│   ├── middleware/
│   │   ├── auth.ts        # JWT authentication
│   │   └── errorHandler.ts # Error handling
│   ├── routes/
│   │   ├── auth.ts        # Register, login, refresh
│   │   ├── vps.ts         # VPS profile CRUD + connect
│   │   ├── files.ts       # File operations (SFTP)
│   │   ├── processes.ts   # PM2 process management
│   │   └── ports.ts       # Port listing
│   ├── services/
│   │   └── SSHManager.ts  # SSH connection pool
│   ├── utils/
│   │   ├── crypto.ts      # AES-256-GCM encryption
│   │   └── validators.ts  # Zod schemas
│   ├── websocket/
│   │   └── terminal.ts    # WebSocket terminal
│   └── index.ts           # App entry point
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- SQLite

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Create `backend/.env`:


### Database Setup

```bash
npm run db:generate
npm run db:push
```

### Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |

### VPS Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vps` | List VPS profiles |
| GET | `/api/vps/:id` | Get VPS details |
| POST | `/api/vps` | Create VPS profile |
| PUT | `/api/vps/:id` | Update VPS profile |
| DELETE | `/api/vps/:id` | Delete VPS profile |
| POST | `/api/vps/:id/connect` | Connect to VPS |
| POST | `/api/vps/:id/disconnect` | Disconnect from VPS |
| GET | `/api/vps/:id/status` | Get connection status |

### Files (SFTP)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vps/:id/files` | List directory |
| POST | `/api/vps/:id/files/upload` | Upload file |
| GET | `/api/vps/:id/files/download` | Download file |
| POST | `/api/vps/:id/files/mkdir` | Create directory |
| DELETE | `/api/vps/:id/files` | Delete file/directory |
| PUT | `/api/vps/:id/files/rename` | Rename/move file |

### Processes (PM2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vps/:id/processes` | List processes |
| POST | `/api/vps/:id/processes/start` | Start process |
| POST | `/api/vps/:id/processes/:deploymentId/stop` | Stop process |
| POST | `/api/vps/:id/processes/:deploymentId/restart` | Restart process |
| DELETE | `/api/vps/:id/processes/:deploymentId` | Delete process |
| GET | `/api/vps/:id/processes/:deploymentId/logs` | Get logs |

### Ports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vps/:id/ports` | List active ports |
| POST | `/api/vps/:id/ports/check` | Check port availability |
| GET | `/api/vps/:id/ports/share/:port` | Generate shareable URL |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## WebSocket Terminal

Connect to terminal via Socket.io:

```javascript
const socket = io('http://localhost:3001', {
  auth: { token: 'access-token' }
});

socket.emit('start-terminal', { vpsId: 'vps-id' });
socket.on('terminal-output', (data) => console.log(data));
socket.emit('terminal-input', 'ls\n');
socket.emit('terminal-resize', { rows: 24, cols: 80 });
socket.emit('close-terminal');
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |

## Security Notes

- Credentials are encrypted with AES-256-GCM
- JWT tokens with short expiration (15min) + refresh tokens (7d)
- Rate limiting on all endpoints
- Helmet for security headers
- CORS restricted to frontend URL


