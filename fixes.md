# Backend Code Review - Issues & Fixes

## Security Issues

### 1. Hardcoded Fallback Secrets (Critical)
**File:** `backend/src/config/index.ts:12-13, 19`
- JWT_SECRET and JWT_REFRESH_SECRET have insecure fallback defaults
- ENCRYPTION_KEY has a weak fallback that looks like a placeholder
- **Fix:** Remove fallback values and require these env vars to be set, or throw error on startup if missing

### 2. SSH Command Injection Risk
**File:** `backend/src/routes/processes.ts:81, 93, 98, 102, 106`
- Commands built with string interpolation: `ls ${projectPath}`, `cd ${projectPath} && ...`
- **Fix:** Validate/sanitize projectPath more rigorously, use parameterized commands, or validate against whitelist

### 3. Weak Path Sanitization
**File:** `backend/src/routes/processes.ts:75`
- `projectPath.replace(/\.\./g, '')` - doesn't handle edge cases like `.../file` or encoded chars
- **Fix:** Use a proper path normalization that resolves and validates the final path stays within allowed directory

### 4. No Auth Type Validation
**File:** `backend/src/utils/validators.ts:14-22`
- When `authType='password'`, password should be required
- When `authType='privateKey'`, privateKey should be required
- **Fix:** Add conditional validation using Zod's `.refine()`

## Code Quality Issues

### 5. Duplicate PrismaClient Instances
**Files:** `routes/auth.ts`, `routes/vps.ts`, `routes/files.ts`, `routes/processes.ts`, `routes/ports.ts`, `websocket/terminal.ts`
- Each file creates its own `new PrismaClient()` - creates multiple DB connections
- **Fix:** Create a shared Prisma client instance (e.g., `backend/src/utils/prisma.ts`)

### 6. Duplicate verifyVps Helper
**Files:** `routes/files.ts:43-60`, `routes/processes.ts:13-30`, `routes/ports.ts:12-29`
- Identical helper function repeated 3 times
- **Fix:** Extract to shared utility file

### 7. Non-null Assertion on userId
**File:** `backend/src/routes/vps.ts:111`
- Uses `req.userId!` - could throw if middleware fails
- **Fix:** Check `req.userId` exists before using

### 8. Empty Object Passes Validation
**File:** `backend/src/utils/validators.ts:24`
- `updateVpsSchema = createVpsSchema.partial()` allows empty object `{}`
- **Fix:** Add minimum 1 field requirement with `.refine()`

## Error Handling Issues

### 9. Broken ZodError JSON Parsing
**File:** `backend/src/middleware/errorHandler.ts:14`
- Tries `JSON.parse(err.message)` but ZodError.message is not JSON
- **Fix:** Access `err.errors` directly instead of parsing message

### 10. Unhandled Crypto Errors
**File:** `backend/src/utils/crypto.ts:29-42`
- `decrypt()` can throw raw crypto errors
- **Fix:** Wrap in try-catch and return meaningful error

### 11. SFTP Stream Cleanup
**File:** `backend/src/routes/files.ts:71-72, 120-128`
- `sftp.end()` called in callbacks but might leave streams in bad state
- **Fix:** Use try-finally or proper stream handling with cleanup

### 12. Missing Command Timeouts
**File:** `backend/src/services/SSHManager.ts:134-164`
- `executeCommand()` has no timeout - could hang forever
- **Fix:** Add command timeout parameter (default 30-60s)

## Potential Bugs

### 13. Terminal Events After Disconnect
**File:** `backend/src/websocket/terminal.ts:63-75`
- Shell events could fire after disconnect causing errors
- **Fix:** Check `socket.connected` before emitting

### 14. Fragile Project Detection
**File:** `backend/src/routes/processes.ts:79-86`
- Parses `ls` output as plain string - fragile
- **Fix:** Use SFTP or proper command with structured output

### 15. Active Shell Not Cleaned on Server Disconnect
**File:** `backend/src/services/SSHManager.ts:95-99`
- When SSH connection closes, activeShell reference not cleared from socket
- **Fix:** Emit event to Socket.io to clean up terminal state

## Missing Features

### 16. No Graceful Prisma Shutdown
- Prisma connections not closed on SIGTERM/SIGINT
- **Fix:** Add `prisma.$disconnect()` in server shutdown handlers

### 17. No Request Logging
- No middleware for logging requests
- **Fix:** Add request logging middleware (morgan or custom)

### 18. No Health Check for Database
**File:** `backend/src/index.ts:64-66`
- Health endpoint doesn't check DB connectivity
- **Fix:** Add Prisma ping to health check

### 19. WebSocket No Rate Limiting
**File:** `backend/src/websocket/terminal.ts`
- No limit on terminal connections per user
- **Fix:** Add connection limits per user

### 20. Terminal Doesn't Verify VPS Ownership Per-Message
**File:** `backend/src/websocket/terminal.ts:85-95`
- Only checks ownership on connect, not for each terminal input
- **Fix:** Store verified vpsId with socket and validate on each operation

## Minor Issues

### 21. Unused Import
**File:** `backend/src/routes/files.ts:7`
- `SFTPWrapper` imported but only used inline
- **Fix:** Remove unused type import

### 22. Inconsistent Error Responses
- Some routes return `{ error: string }`, others return `{ error, details }`
- **Fix:** Standardize error response format

### 23. Missing Type for Catch Error
**Multiple files**
- Uses `catch (error: any)` inconsistently
- **Fix:** Use proper error types or `unknown` with type guards
