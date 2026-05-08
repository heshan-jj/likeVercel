# Security Audit Report: LikeVercel-Docker

**Date:** Saturday, May 9, 2026
**Status:** Completed
**Auditor:** Gemini CLI

---

## 1. Executive Summary
The LikeVercel-Docker application demonstrates a strong security foundation with modern cryptographic practices (AES-256-GCM), secure password hashing (bcrypt), and robust shell escaping for VPS operations. However, several high-impact vulnerabilities related to administrative actions and session management were identified that require immediate attention.

---

## 2. Findings by Severity

### 🔴 High Severity

#### 2.1 Unvalidated Database Restore
*   **Location:** `backend/src/routes/auth.ts` (`/api/auth/restore`)
*   **Vulnerability:** The endpoint allows any authenticated user to upload and overwrite the production SQLite database with only a "magic header" check.
*   **Impact:** Full application takeover. An attacker can upload a database with a modified admin PIN, granting them full control over all connected VPS instances.
*   **Recommendation:** 
    *   Require a secondary confirmation (e.g., Re-entering PIN) for restores.
    *   Validate database schema and integrity before applying.
    *   Restrict restores to system-generated, signed backups.

#### 2.2 Critical Dependency Vulnerabilities (`tar`)
*   **Location:** `node_modules/tar`
*   **Vulnerability:** Identified via `npm audit`. Path traversal vulnerabilities (GHSA-34x7-hfp2-rc4v) allow arbitrary file creation/overwrite.
*   **Impact:** Potential remote code execution if the app processes untrusted archives.
*   **Recommendation:** Execute `npm audit fix` immediately to update to patched versions.

---

### 🟡 Medium Severity

#### 3.1 Unrestricted VPS Filesystem Access
*   **Location:** `backend/src/routes/files.ts`
*   **Vulnerability:** The File Manager allows authenticated users to browse and modify the entire root filesystem (`/`) of connected VPS instances.
*   **Impact:** Extreme privilege escalation if a user session is hijacked. An attacker could modify `/etc/shadow`, `/root/.ssh/authorized_keys`, or other critical system files.
*   **Recommendation:** 
    *   Implement a "jail" or scoped view (e.g., `/var/www` or `/home`) by default.
    *   Require a "system access" toggle with a warning for modifying directories outside of standard app paths.

#### 3.2 Sensitive Token Storage (`localStorage`)
*   **Location:** `frontend/src/context/AuthContext.tsx`
*   **Vulnerability:** `accessToken` and `refreshToken` are stored in `localStorage`.
*   **Impact:** High susceptibility to token theft via Cross-Site Scripting (XSS). Any script running in the browser context can read these tokens.
*   **Recommendation:** Move JWT storage to `httpOnly`, `secure`, and `SameSite=Strict` cookies to isolate them from JavaScript access.

---

### 🟢 Moderate / Low Severity

#### 4.1 Insecure Temporary Key Handling
*   **Location:** `backend/src/routes/vps.ts`
*   **Vulnerability:** Generated private keys are written to the OS temp directory (`os.tmpdir()`) with `0o600` permissions.
*   **Impact:** Information disclosure on multi-tenant servers where `/tmp` might be accessible or monitored by other processes.
*   **Recommendation:** Perform key manipulation in-memory (using buffers) or use a private application-specific temporary directory.

#### 4.2 Shell Argument Flag Injection
*   **Location:** `backend/src/utils/helpers.ts` (`escapeShellArg`)
*   **Vulnerability:** While strings are escaped, some tools (like `pm2`) might interpret escaped strings starting with `-` as flags.
*   **Impact:** Unexpected behavior or command bypass.
*   **Recommendation:** Use the `--` separator where supported (e.g., `pm2 start script.js -- --user-arg`) to explicitly terminate flag parsing.

---

## 3. Remediation Roadmap

1.  **Phase 1 (Immediate):** Run `npm audit fix` and disable or secure the `/api/auth/restore` endpoint.
2.  **Phase 2 (Short-term):** Transition frontend auth to use `httpOnly` cookies.
3.  **Phase 3 (Medium-term):** Implement filesystem scoping in the backend File Manager and move key generation to in-memory buffers.
