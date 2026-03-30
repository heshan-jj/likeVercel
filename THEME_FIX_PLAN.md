# likeVercel-Docker — Dark/Light Theme Consistency Plan

> Generated: 2026-03-31
> Problem: The app has a working theme system (`[data-theme="dark"]` in CSS, `ThemeContext`, `localStorage`) but large parts of the UI are hard-coded to light-mode Tailwind values and ignore the theme entirely.

---

## Root cause

There are two token systems running side by side and they don't fully agree:

1. **CSS variables** (`--bg-primary`, `--text-primary`, etc.) defined in `index.css` — these correctly swap between light and dark via `[data-theme="dark"]` overrides.
2. **Raw Tailwind classes** (`bg-white`, `text-slate-900`, `border-slate-200`, `bg-slate-50`, etc.) — these are hard-coded to Slate/White and **never change** regardless of the active theme.

The Tailwind config extends the palette with `bg-primary`, `bg-secondary`, `text-primary`, etc., wired to the CSS variables — but the components mostly use raw Tailwind instead of these semantic aliases. The result is a UI that stays fully light even when dark mode is selected.

There is also a **second inconsistency in the theme toggle itself**: `ThemeContext.tsx` reads from `localStorage` key `vps-deploy-theme`, while `Settings.tsx` reads and writes using key `theme` and calls a standalone `applyTheme()` function that bypasses the context entirely. These two systems can silently disagree, producing a state where the CSS renders dark but the context thinks it's light.

---

## Audit: components with hard-coded light-mode colours

### `Sidebar.tsx`
```
bg-white                          → bg-bg-secondary
border-slate-200                  → border-border-light
text-slate-900                    → text-text-primary
text-slate-400                    → text-text-muted
text-slate-500                    → text-text-secondary
hover:bg-slate-50                 → hover:bg-bg-tertiary
hover:text-slate-900              → hover:text-text-primary
bg-blue-50 (active nav)          → use CSS var or keep as semantic override
border-slate-100                  → border-border-light
bg-slate-50/50 (footer)         → bg-bg-secondary
bg-white (user card)            → bg-bg-primary
border-slate-200 (user card)    → border-border-light
text-slate-900 (name)           → text-text-primary
text-slate-400 (role)           → text-text-muted
bg-orange-100 (avatar)          → acceptable, but adjust text-orange-600 in dark if needed
```

### `Layout.tsx` / `AppLayout.tsx`
```
bg-[#f8fafc]                     → bg-bg-primary
bg-white (mobile header)        → bg-bg-secondary
border-slate-200 (header)       → border-border-light
text-slate-900 (brand name)     → text-text-primary
text-slate-500 (menu button)    → text-text-secondary
text-slate-400 (X button)       → text-text-muted
```

### `MetricCard.tsx`
```
bg-white                         → bg-bg-secondary
border-slate-200                 → border-border-light
text-slate-900 (value)          → text-text-primary
text-slate-400 (label, sub)     → text-text-muted
```

### `VpsListView.tsx`
```
bg-white (table wrapper)        → bg-bg-secondary
border-slate-200                 → border-border-light
bg-slate-50/50 (thead)         → bg-bg-tertiary/50
border-slate-100 (dividers)     → border-border-light
text-slate-400 (th labels)      → text-text-muted
hover:bg-slate-50/80            → hover:bg-bg-tertiary/30
text-slate-900 (name)           → text-text-primary
text-slate-500 (region)         → text-text-secondary
text-slate-400 (host)           → text-text-muted
bg-slate-100 (cpu bar track)   → bg-bg-tertiary
text-slate-900 (cpu %)         → text-text-primary
bg-slate-50/50 (footer)        → bg-bg-secondary/50
border-slate-100 (footer)       → border-border-light
bg-slate-100 (disconnect btn)  → bg-bg-tertiary
text-slate-500 (disconnect btn) → text-text-secondary

Status badges — already use emerald/red, fine to keep as-is since they're semantic.
```

### `VpsGridView.tsx`
```
bg-white (card)                  → bg-bg-secondary
border-slate-200                 → border-border-light
text-slate-900 (name)           → text-text-primary
text-slate-400 (host)           → text-text-muted
bg-slate-50 (offline icon bg)  → bg-bg-tertiary
text-slate-400 (offline icon)  → text-text-muted
bg-slate-100 (disconnect btn)  → bg-bg-tertiary
text-slate-400 (disconnect)    → text-text-muted
```

### `Dashboard.tsx`
```
text-slate-900 (headings)       → text-text-primary
text-slate-500 (subtitle)       → text-text-secondary
bg-red-50 (error banner)        → bg-error-bg (CSS var)
text-red-600 (error text)       → text-error (CSS var)
border-red-100 (error)          → border-error/20
bg-white (search input)         → bg-bg-secondary
border-slate-200 (search)       → border-border-light
text-slate-900 (search)         → text-text-primary
text-slate-400 (search icon)    → text-text-muted
bg-white (sort select)          → bg-bg-secondary
border-slate-200 (sort)         → border-border-light
text-slate-600 (sort)           → text-text-secondary
bg-slate-100 (view toggle bg)  → bg-bg-tertiary
text-slate-400 (inactive view)  → text-text-muted
text-slate-900 (page title)     → text-text-primary
bg-white (empty state)          → bg-bg-secondary
border-slate-200 (empty)        → border-border-light
text-slate-400 (empty text)     → text-text-muted
bg-slate-100 (status filter pill) → bg-bg-tertiary
text-slate-600 (filter text)    → text-text-secondary
```

### `VpsDetail.tsx`
```
bg-bg-secondary/20 (header)     ← already using CSS var ✓
border-border-light             ← already using CSS var ✓
text-text-secondary             ← already using CSS var ✓
text-text-primary               ← already using CSS var ✓
bg-bg-tertiary (offline icon)   ← already using CSS var ✓

The VpsDetail header is mostly correct.
The tab bar (bg-bg-secondary/10) is fine.
The "Edit Settings" button has bg-bg-secondary / hover:bg-bg-tertiary — already correct.
```

### `Settings.tsx`
```
Most elements use CSS var-based classes (bg-bg-primary, text-text-primary) ← correct.
The gradient avatar (from-blue-600 to-indigo-700) is fine — intentional brand colour.
The theme buttons use bg-bg-secondary/border-border-light ← correct.
No hard-coded slate values here — Settings is largely theme-safe already.
```

### `KeyManager.tsx`
```
Uses bg-bg-primary, bg-bg-secondary, text-text-primary throughout ← mostly correct.
Key type badge colours (emerald, blue, purple) are semantic ← fine.
No hard-coded slate issues found.
```

---

## Fix plan

### Step 1 — Unify the theme key and remove the duplicate toggle

**Files:** `ThemeContext.tsx`, `Settings.tsx`

The `ThemeContext` stores to key `vps-deploy-theme`. `Settings.tsx` independently reads/writes key `theme` and mutates `data-theme` on the DOM directly, bypassing the context. This means changing the theme in Settings doesn't update the context state, and vice versa.

**Fix:** Delete `applyTheme()` from `Settings.tsx`. Replace all `localStorage.getItem('theme')` / `localStorage.setItem('theme', ...)` calls in Settings with `useTheme()` from the context.

```tsx
// Settings.tsx — replace local state with context
import { useTheme } from '../context/ThemeContext';

const { theme, setTheme } = useTheme(); // expose setTheme from context

// Remove: const [theme, setTheme] = useState<Theme>(...)
// Remove: function applyTheme(theme: Theme) { ... }
// Remove: const handleChangeTheme = (t: Theme) => { setTheme(t); applyTheme(t); }
// Replace with: const handleChangeTheme = (t: Theme) => setTheme(t);
```

**Also:** Update `ThemeContext.tsx` to support all three values (`'light' | 'dark' | 'system'`) since Settings already uses `'system'` as a valid option. Export `setTheme` from the context, not just `toggleTheme`.

```tsx
// ThemeContext.tsx — expanded
type Theme = 'light' | 'dark' | 'system';

const ThemeProvider: React.FC<...> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || 'dark'
  );

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

> Also consolidate the localStorage key to a single value: `theme`. Remove `vps-deploy-theme`.

---

### Step 2 — Fix `Layout.tsx` and `AppLayout.tsx`

These two files (which appear to be duplicates — see note below) are the outermost shell and set the default background. They use `bg-[#f8fafc]` which is hardcoded light and never changes.

```tsx
// Before
<div className="flex h-screen bg-[#f8fafc] overflow-hidden ...">
<header className="... bg-white border-b border-slate-200 ...">
<span className="... text-slate-900">likeVercel</span>

// After
<div className="flex h-screen bg-bg-primary overflow-hidden ...">
<header className="... bg-bg-secondary border-b border-border-light ...">
<span className="... text-text-primary">likeVercel</span>
```

> **Side note:** `AppLayout.tsx` and `Layout.tsx` are near-identical. One of them should be deleted.

---

### Step 3 — Fix `Sidebar.tsx`

This is the most visually prominent dark-mode breakage — the sidebar stays bright white regardless of theme.

```tsx
// Outer sidebar div
// Before:  bg-white border-r border-slate-200
// After:   bg-bg-secondary border-r border-border-light

// Brand area
// Before:  text-slate-900
// After:   text-text-primary
// Before:  text-slate-400 (subtitle)
// After:   text-text-muted

// Nav items (inactive)
// Before:  text-slate-500 hover:bg-slate-50 hover:text-slate-900
// After:   text-text-secondary hover:bg-bg-tertiary hover:text-text-primary

// Nav items (active)
// Before:  bg-blue-50 text-blue-600 border-blue-100/50
// After:   bg-blue-500/10 text-blue-500 border-blue-500/20
// (These are already theme-neutral since they use opacity/alpha — fine as-is)

// Footer section
// Before:  border-slate-100 bg-slate-50/50
// After:   border-border-light bg-bg-tertiary/30

// User card
// Before:  bg-white border-slate-200
// After:   bg-bg-primary border-border-light
// Before:  text-slate-900 (name)
// After:   text-text-primary
// Before:  text-slate-400 (role)
// After:   text-text-muted
```

---

### Step 4 — Fix `MetricCard.tsx`

```tsx
// Before:  bg-white border-slate-200
// After:   bg-bg-secondary border-border-light

// Before:  text-slate-900 (value)
// After:   text-text-primary

// Before:  text-slate-400 (label, sub)
// After:   text-text-muted

// Active ring
// border-blue-500 ring-4 ring-blue-500/10  ← fine, keep
// Inactive border
// Before:  border-slate-200
// After:   border-border-light
```

---

### Step 5 — Fix `VpsListView.tsx`

```tsx
// Table wrapper
// Before:  bg-white border-slate-200
// After:   bg-bg-secondary border-border-light

// thead
// Before:  border-b border-slate-100 bg-slate-50/50
// After:   border-b border-border-light bg-bg-tertiary/40

// th text
// Before:  text-slate-400
// After:   text-text-muted

// tbody row hover
// Before:  hover:bg-slate-50/80
// After:   hover:bg-bg-tertiary/30

// td: instance name
// Before:  text-slate-900 group-hover:text-blue-600
// After:   text-text-primary group-hover:text-blue-500

// td: region
// Before:  text-slate-500
// After:   text-text-secondary

// td: host (monospace)
// Before:  text-slate-400
// After:   text-text-muted

// CPU bar track
// Before:  bg-slate-100
// After:   bg-bg-tertiary

// CPU % text
// Before:  text-slate-900
// After:   text-text-primary

// Disconnect button
// Before:  bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500
// After:   bg-bg-tertiary text-text-muted hover:bg-red-500/10 hover:text-red-500

// Footer row
// Before:  bg-slate-50/50 border-t border-slate-100
// After:   bg-bg-tertiary/30 border-t border-border-light
// Before:  text-slate-400
// After:   text-text-muted
```

---

### Step 6 — Fix `VpsGridView.tsx`

```tsx
// Card wrapper
// Before:  bg-white border-slate-200
// After:   bg-bg-secondary border-border-light

// Offline server icon bg
// Before:  bg-slate-50 text-slate-400
// After:   bg-bg-tertiary text-text-muted

// Server name
// Before:  text-slate-900
// After:   text-text-primary

// Host (monospace)
// Before:  text-slate-400
// After:   text-text-muted

// Disconnect button
// Before:  bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50
// After:   bg-bg-tertiary text-text-muted hover:text-red-500 hover:bg-red-500/10
```

---

### Step 7 — Fix `Dashboard.tsx`

```tsx
// Page title & subtitle
// Before:  text-slate-900 / text-slate-500
// After:   text-text-primary / text-text-secondary

// Error banner
// Before:  bg-red-50 text-red-600 border border-red-100
// After:   bg-error-bg text-error border border-error/20

// Search input
// Before:  bg-white border-slate-200 text-slate-900
// After:   bg-bg-secondary border-border-light text-text-primary

// Search placeholder icon
// Before:  text-slate-400
// After:   text-text-muted

// Sort select
// Before:  bg-white border-slate-200 text-slate-600
// After:   bg-bg-secondary border-border-light text-text-secondary

// View toggle background
// Before:  bg-slate-100
// After:   bg-bg-tertiary

// Inactive view toggle icon
// Before:  text-slate-400
// After:   text-text-muted

// Active Instances heading
// Before:  text-slate-900
// After:   text-text-primary

// Status filter pill
// Before:  bg-slate-100 text-slate-600
// After:   bg-bg-tertiary text-text-secondary

// Empty state
// Before:  bg-white border-slate-200 ... text-slate-400
// After:   bg-bg-secondary border-border-light ... text-text-muted
```

---

### Step 8 — Fix `index.css` — `.glass-effect` in light mode

Currently `.glass-effect` uses `rgba(255, 255, 255, 0.7)` as its background, which is explicitly white. This makes glass-effect panels appear light-coloured even in dark mode until the `[data-theme="dark"]` override kicks in. The dark override is correct, but the light version should use the CSS variable too.

```css
/* Before */
.glass-effect {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* After — use variable so it reads correctly on both themes */
.glass-effect {
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid var(--border-light);
}

[data-theme="dark"] .glass-effect {
  background: rgba(22, 27, 34, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

> `color-mix()` is supported in all modern browsers (Chrome 111+, Firefox 113+, Safari 16.2+). If you need broader support, use `background: var(--bg-secondary)` with `opacity` instead.

---

### Step 9 — Fix `index.css` — `kinetic-gradient-text` in dark mode

The `.kinetic-gradient-text` class uses `#0f172a` (near-black) as the gradient start colour. In dark mode this renders as an invisible or near-invisible gradient text.

```css
/* Before */
.kinetic-gradient-text {
  background: linear-gradient(135deg, #0f172a 0%, var(--kinetic-blue) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* After */
.kinetic-gradient-text {
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--kinetic-blue) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

### Step 10 — Fix `index.css` — `kinetic-grid` in dark mode

The grid lines use `rgba(0, 0, 0, 0.03)` which is invisible on dark backgrounds.

```css
/* Before */
.kinetic-grid {
  background-image: linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
}

/* After */
.kinetic-grid {
  background-image: linear-gradient(to right, var(--border-light) 1px, transparent 1px),
                    linear-gradient(to bottom, var(--border-light) 1px, transparent 1px);
}
```

---

## Summary of changes by file

| File | Changes |
|---|---|
| `ThemeContext.tsx` | Unify key to `theme`, add `'system'` support, expose `setTheme` |
| `Settings.tsx` | Remove `applyTheme()`, remove local theme state, use `useTheme()` |
| `Layout.tsx` | `bg-[#f8fafc]` → `bg-bg-primary`, header to semantic classes |
| `AppLayout.tsx` | Same as Layout.tsx (consider deleting one of these) |
| `Sidebar.tsx` | All `slate-*` and `white` → semantic CSS var classes |
| `MetricCard.tsx` | `bg-white`, `slate-*` → semantic CSS var classes |
| `VpsListView.tsx` | Table, thead, rows, footer → semantic CSS var classes |
| `VpsGridView.tsx` | Card, icon bg, buttons → semantic CSS var classes |
| `Dashboard.tsx` | Headings, inputs, sort, toggles, error banner → semantic CSS var classes |
| `index.css` | `.glass-effect`, `.kinetic-gradient-text`, `.kinetic-grid` dark-mode fixes |

## What does NOT need changes

- `VpsDetail.tsx` — already uses `bg-bg-primary/secondary/tertiary` and `text-text-*` throughout. ✓
- `Settings.tsx` (content) — already theme-safe except for the duplicate localStorage logic. ✓
- `KeyManager.tsx` — already uses semantic classes. ✓
- `AddVps.tsx` — uses `bg-bg-primary`, `border-border-light`, `text-text-primary` etc. ✓
- Status badge colours (emerald/red for online/offline) — intentionally semantic, fine in both modes. ✓
- Blue gradient buttons (`icon-grad-blue`) — brand colour, intentionally static. ✓
