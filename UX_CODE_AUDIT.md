# Visual & Code Quality Audit: LikeVercel-Docker

**Date:** Saturday, May 9, 2026
**Auditor:** Gemini CLI

---

## 1. Visual & UX Audit (Aesthetics & Polish)

### 🎨 Typography & Identity
*   **Current:** Mixing 'Inter' (sans) and 'Space Grotesk' (display) inconsistently.
*   **Improvement:** Standardize **'Space Grotesk'** for all numeric values, headings, and primary navigation. Use 'Inter' strictly for long-form metadata.
*   **Goal:** Create a "high-tech" premium aesthetic consistent with modern infrastructure tools.

### ✨ Kinetic Interactions
*   **Current:** Standard CSS transitions on hover.
*   **Improvement:** 
    *   Enhance `premium-card` with **spring-physics transitions** (scale: 1.02) and dynamic shadow elevations.
    *   Add **"Glow" states** for active/online elements using the defined `--accent-primary-rgb` variable.
    *   Implement **liquid animation** for CPU/RAM usage bars in `VpsListView` and `MetricCard`.

### 📱 Layout Refinement
*   **Current:** Static sidebar border and standard glassmorphism.
*   **Improvement:** 
    *   Transition to a **"Kinetic" sidebar** with background blur and an animated "active indicator" that slides between routes.
    *   Unified border-radius: Ensure all panels use `--radius-xl` (32px) for a consistent "contained" feel.

---

## 2. Code Quality & Architecture Audit

### 🏗️ Backend Refactorings
*   **Prisma Singleton:** 
    *   *Issue:* Current `prisma.ts` may create multiple client instances during hot-reloads.
    *   *Fix:* Implement a global singleton pattern to preserve the connection pool.
*   **Modular Routing:**
    *   *Issue:* `backend/src/index.ts` manually imports and mounts 8+ route files.
    *   *Fix:* Create a centralized router index to clean up the main entry point.
*   **Graceful Shutdown:**
    *   *Issue:* Shutdown logic is present but could be more robust regarding SSH sessions.
    *   *Fix:* Ensure `sshManager.disconnectAll()` is awaited before the process exits to prevent zombie SSH processes on the server.

### ⚛️ Frontend Maintainability
*   **UI Component Library:**
    *   *Issue:* Buttons, inputs, and modals are styled locally or via global classes.
    *   *Fix:* Extract core primitives (Button, Card, Badge, Input) into a `src/components/UI` folder to enforce design consistency.
*   **State & Polling Optimization:**
    *   *Issue:* Dashboard polls for profiles and specs separately.
    *   *Fix:* Consolidate polling logic into a unified `useInfrastructure` hook to reduce network overhead and prevent "UI jitter."

### 🛠️ Tooling & Scripts
*   **Env Management:**
    *   *Issue:* Three separate `fix-env*.ts` scripts exist in the root.
    *   *Fix:* Consolidate into a single CLI tool (`scripts/env-manager.ts`) with subcommands.

---

## 3. Implementation Priority

| Priority | Task | Category |
| :--- | :--- | :--- |
| **P0** | Prisma Singleton & Graceful Shutdown | Stability |
| **P1** | Typography & Border-Radius Standardization | Visual |
| **P1** | Centralized UI Component Library | Maintainability |
| **P2** | Kinetic Animations (Glows/Liquid Fills) | UX |
| **P2** | Route Indexing & Polling Optimization | Architecture |
