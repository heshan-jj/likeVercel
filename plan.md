# Authentication System Refactor Plan: PIN-Based Onboarding

This document outlines the strategy for migrating the current **LikeVercel** authentication system from a traditional Email/Password model to a streamlined **Onboarding + PIN/Passcode** security model.

---

## 1. Objectives
- **Simplify Access**: Replace cumbersome registration with a one-time "Onboarding" setup.
- **Fast Security**: Protect the dashboard with a quick 4-6 digit PIN entry.
- **Single User Focus**: Optimize the entire app for a single-admin self-hosted experience.
- **Premium Experience**: Implement a visually stunning PIN pad and smooth transitions.

---

## 2. Phase 1: Backend Refactoring (Database & API)

### 2.1 Database Schema (`prisma/schema.prisma`)
Modify the `User` model to simplify it for single-user PIN access.
- Remove: `email`, `password`, `name`.
- Add: `hashedPin` (hashed using bcrypt), `onboardingCompleted` (boolean).
- Keep: `id`, `refreshTokens`, `vpsProfiles`, etc. (to maintain data relations).

### 2.2 Auth API Updates
Replace existing routes in `backend/src/routes/auth.ts`:
- **NEW `POST /api/auth/setup`**:
    - Only allowed if no user exists.
    - Accepts a PIN and basic name.
    - Creates the initial admin record.
- **NEW `POST /api/auth/unlock`**:
    - Accepts a PIN.
    - Verifies against `hashedPin`.
    - Issues JWT Access & Refresh tokens.
- **REMOVE**: `/api/auth/register`, `/api/auth/login`.

---

## 3. Phase 2: Frontend Refactoring (UI & State)

### 3.1 Onboarding Flow
Create an `Onboarding.tsx` page that acts as the entry point for fresh installations:
1. **Welcome Screen**: "Welcome to LikeVercel. Let's secure your dashboard."
2. **PIN Setup**: Interactive keypad to set a 6-digit PIN.
3. **Confirmation**: Re-enter PIN to verify.
4. **Finalize**: Auto-login and redirect to Dashboard.

### 3.2 Unlock Screen
Create a premium `Unlock.tsx` page (replaces `Login.tsx`):
- **Glassmorphism Design**: High-end visual style.
- **Animated Keypad**: Smooth hover/press effects with subtle haptics (visual).
- **Auto-Submit**: Trigger verification as soon as the last digit is entered.

### 3.3 Auth Context & Routing
- Update `AuthContext.tsx` to handle `isSetup` state.
- If `!isSetup` -> Redirect all routes to `/onboarding`.
- If `isSetup` but `!isAuthenticated` -> Redirect to `/unlock`.

---

## 4. Phase 3: Premium Polish & Security

- **Rate Limiting**: Brute-force protection on the `/unlock` endpoint (max 5 attempts per 10 mins).
- **Session Persistence**: Ensure Refresh Tokens work seamlessly with the new PIN model.
- **Micro-Animations**: Use Framer Motion for keypad entry and error "shaking" effects.

---

## 5. Technical Tasks Checklist

### Backend
- [ ] Update `schema.prisma` and run `npx prisma migrate dev`.
- [ ] Refactor `auth.ts` controllers for Setup/Unlock.
- [ ] Update `authMiddleware.ts` to validate tokens against the new user structure.

### Frontend
- [ ] Create `PinKeypad` shared component.
- [ ] Implement `Onboarding` step-through.
- [ ] Implement `Unlock` page with auto-focus and error states.
- [ ] Clean up obsolete components (`Login.tsx`, `Register.tsx`).

---

## 6. Security Considerations
- **PIN Hashing**: Even though it's a "PIN", it must be hashed with a strong salt (Bcrypt) to prevent local file leaks.
- **JWT Integrity**: Tokens will still be used for all API requests to maintain standard REST security.
- **Lockout Policy**: Implement backend-side lockout to prevent PIN brute-forcing.
