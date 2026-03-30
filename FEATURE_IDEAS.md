# likeVercel-Docker — Feature Ideas & UI Improvements

> Generated: 2026-03-31
> Based on a full read of all backend routes and frontend pages.

---

## New features

### 1. Cron job manager

**What's missing:** There's no way to schedule recurring tasks on a VPS from the dashboard.  
**What to build:** A new tab on VpsDetail — "Cron Jobs" — that reads the user's crontab via SSH, lets them add/remove entries with a visual schedule builder (instead of raw cron syntax), and saves changes back. A simple dropdown picker for common intervals (every hour, daily, weekly) would be enough.

**Backend:** One new route file `backend/src/routes/cron.ts` using `sshManager.executeCommand` to read/write the crontab.

```
GET  /api/vps/:id/cron         → crontab -l
POST /api/vps/:id/cron         → append entry to crontab
DELETE /api/vps/:id/cron/:index → remove line N from crontab
```

---

### 2. Environment variable manager

**What's missing:** Processes are started with `pm2 start`, but there's no way to set or update `.env` files from the dashboard.  
**What to build:** On the ProcessManager panel, add an "Env Vars" section per deployment. Show a key-value table editor backed by reading/writing the `.env` file in the project directory, and a "Restart process" button to apply changes.

**Backend:** Add to `files.ts` or a new `env.ts` route:

```
GET  /api/vps/:id/env?path=/var/www/myapp   → reads .env file, parses into key-value pairs
PUT  /api/vps/:id/env?path=/var/www/myapp   → receives key-value pairs, serializes back to .env
```

---

### 3. VPS health alerts

**What's missing:** Resource usage is polled passively every 30 seconds — there's no proactive alerting when a server gets overloaded.  
**What to build:** A threshold system where the user can set CPU/RAM alert percentages per VPS. When a usage poll breaches the threshold, a toast is shown immediately and the metric card pulses red. Store thresholds in localStorage client-side to keep it simple (no new backend table needed).

```ts
// In Dashboard.tsx, after usage fetch:
if (usageData.cpu > threshold.cpu) {
  showToast(`⚠ ${profile.name}: CPU at ${usageData.cpu}%`, 'error');
}
```

---

### 4. Process log streaming

**What's missing:** The process logs endpoint (`GET /api/vps/:id/processes/:deploymentId/logs`) returns a static snapshot. Tailing logs requires the user to keep clicking refresh manually.  
**What to build:** Add a WebSocket event that streams `pm2 logs <name> --lines 0` output into the existing terminal WebSocket infrastructure, and display it in a scrollable log panel inside ProcessManager with a "Live" toggle button.

**Backend:** Reuse the `socket.io` instance already in place. Emit `process-log` events to the room for that VPS, streamed from an SSH exec with a persistent channel.

---

### 5. Snapshot / restore point for deployments

**What's missing:** Deleting a deployment is permanent and there's no undo.  
**What to build:** Before deleting, run `pm2 save` to persist the process list on the server. Add a "Restore last save" button that runs `pm2 resurrect`. This is a single backend command, not a full versioning system, but gives users a safety net.

```
POST /api/vps/:id/processes/save      → pm2 save
POST /api/vps/:id/processes/resurrect → pm2 resurrect
```

---

### 6. SSH fingerprint verification on connect

**What's missing:** When connecting to a VPS for the first time, the server's host key is implicitly trusted with no verification step. This is a TOFU (trust-on-first-use) issue.  
**What to build:** On first connect, retrieve the server's host key fingerprint from the `ssh2` `handshake` event and show it to the user in a confirmation modal before completing the connection. Store the fingerprint in the `VpsProfile` table and on subsequent connects verify it matches.

**Schema change:**
```prisma
model VpsProfile {
  // ...
  hostFingerprint String? // stored after first-connect approval
}
```

---

### 7. Multi-user support (future)

**What's missing:** Registration is hard-limited to one user, and everything is scoped to a single account. The infrastructure is already multi-user in schema (`userId` on every table).  
**What to build:** Add an `isAdmin` field to `User`. The admin can invite additional users via a generated invite link. Non-admin users can only see their own VPS profiles. The single-user registration block in `auth.ts` can be replaced with an invite-token check.

---

## UI improvements

### 8. Specs and usage on the dashboard cards

**What's now:** The dashboard VPS cards show name, host, and connection status. Specs (OS, CPU, RAM, disk) are fetched but only used for a tooltip in the list view.  
**What to improve:** Show a compact CPU% bar and RAM% bar directly on each card (both grid and list view), using the `cpuLoad` data already being fetched. If the VPS is offline, show "—" instead of a bar.

---

### 9. Sidebar navigation badges

**What's now:** The sidebar has icons and labels for Dashboard, Keys, and Settings with no contextual info.  
**What to improve:** Show a count badge on the Dashboard link reflecting how many servers are offline. Show a badge on Keys reflecting total saved keys. These are already available from API responses cached in state.

---

### 10. "Add VPS" — live SSH connection test before saving

**What's now:** The form saves the VPS profile and the user has to go back to the dashboard to click Connect and find out if credentials are wrong.  
**What to improve:** Add a "Test Connection" button on the AddVps/EditVps form. Clicking it submits the credentials to a new backend endpoint that attempts a connect-then-disconnect and returns success/failure within a few seconds. Show a green check or red X inline before the user commits.

```
POST /api/vps/test-connection
Body: { host, port, username, authType, password?, privateKey?, passphrase? }
Returns: { success: boolean, error?: string, latencyMs?: number }
```

---

### 11. VpsDetail — remember last active tab per VPS

**What's now:** The active tab is read from `?tab=` query param on load but defaults to `terminal` on every navigation. Switching to Files, then clicking Back, then re-entering the VPS always resets to the Terminal tab.  
**What to improve:** Persist the active tab to `localStorage` keyed by `vpsId` so the user returns to where they left off.

```ts
// On tab change:
localStorage.setItem(`lastTab:${id}`, newTab);

// On mount:
const saved = localStorage.getItem(`lastTab:${id}`) as Tab | null;
const [activeTab, setActiveTab] = useState<Tab>(initialTab || saved || 'terminal');
```

---

### 12. File manager — code editor for text files

**What's now:** Files can be downloaded but not edited in place. Editing a config file means downloading it, editing locally, and re-uploading.  
**What to improve:** When a file with a recognized text extension (`.env`, `.conf`, `.json`, `.yaml`, `.sh`, `.ts`, `.js`, `.py`, `.txt`, etc.) is clicked in FileManager, open it in a lightweight in-browser editor (CodeMirror or Monaco) with a Save button that writes back via SFTP. This replaces the most common download-edit-upload cycle.

---

### 13. Settings — profile name editing

**What's now:** The Settings page shows the user's name and email but there's no way to change the display name from the UI. The `PUT /api/auth/profile` endpoint already exists and accepts `{ name }`.  
**What to improve:** Add an inline editable name field on the identity card with a pencil icon. Clicking it turns the name into an input, and pressing Enter or clicking Save calls the existing API endpoint.

---

### 14. ProxyManager — SSL certificate expiry display

**What's now:** The proxy list shows domain, port, and whether SSL is enabled — but no info about when the cert expires.  
**What to improve:** After fetching proxy configs, run an additional command on connected VPSes to read the cert expiry date from `certbot certificates` or directly from the cert file, and display it as a badge (e.g. "Expires in 47 days" in green, red if under 14 days).

```bash
certbot certificates 2>/dev/null | grep -A 2 "Domains: <domain>"
# or
openssl x509 -enddate -noout -in /etc/letsencrypt/live/<domain>/fullchain.pem
```

---

### 15. Dashboard — sort by last connected

**What's now:** Sort options are "Name" and "Status". The `lastConnectedAt` field is stored in the database and returned by the API but unused in the frontend.  
**What to improve:** Add "Last Connected" as a third sort option in the sort dropdown. This lets the user quickly see which servers they haven't touched in a while.

---

### 16. Keyboard shortcut: `N` to add a new VPS

**What's now:** `/` is already wired up in `App.tsx` to focus the search input. That's the only keyboard shortcut.  
**What to improve:** Add `N` to navigate to `/vps/add` and `K` to navigate to `/keys` when the user is not focused in an input. Small additions to the existing `handleKeyDown` handler in `App.tsx`.

```ts
if (e.key === 'n' && !isInputFocused) navigate('/vps/add');
if (e.key === 'k' && !isInputFocused) navigate('/keys');
```

---

### 17. Process manager — deployed URL copy button

**What's now:** The ProcessManager shows a URL like `http://<host>:<port>` but it's just text — no one-click copy or open-in-browser.  
**What to improve:** Add a small copy icon and an external link icon next to each process URL, reusing the same copy-to-clipboard pattern already used in KeyManager.

---

### 18. Empty state on dashboard — prompt to add first VPS

**What's now:** When there are zero VPS profiles, the dashboard shows a dashed empty box with "No servers found". This appears even on a fresh install for a new user.  
**What to improve:** When `profiles.length === 0` (not just filtered results), show a proper onboarding empty state with a "Add your first server" CTA button that navigates to `/vps/add`, and a brief one-liner explaining what likeVercel does.

---

## Minor DX improvements

- **`EditVps.tsx`:** Pre-fill the form with the existing connection name and host — currently users have to re-enter everything to update credentials.
- **`AddVps.tsx`:** Tab order on the form skips the SSH port field when using keyboard navigation.
- **`KeyManager.tsx`:** The fingerprint uses MD5 which is outdated. Display SHA-256 instead (already available via `ssh-keygen -l -E sha256 -f <keyfile>`).
- **`VpsDetail.tsx`:** The specs header (OS, CPU, RAM, disk, region) is fetched once on mount but never refreshed. Add a subtle refresh on re-focus of the window.
- **`Dashboard.tsx`:** The `error` state is shared between connect/disconnect failures and general fetch failures. Separate these so a rollback error doesn't overwrite a real fetch error.
