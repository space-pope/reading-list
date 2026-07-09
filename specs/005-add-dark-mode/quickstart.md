# Quickstart: Dark Mode Validation

**Feature**: 005 — Add dark mode to the UI

## Prerequisites

- Reading list web server running at `http://127.0.0.1:8080`
  - Start with: `python -m reading_list.main --serve`
- A modern browser (Chrome, Firefox, Safari, or Edge)
- Optional: Browser DevTools for inspecting localStorage and CSS custom properties

## Validation Scenarios

### V1 — OS dark mode is automatically detected

1. Set your OS (macOS, Windows, or Linux) to **dark mode**
2. Open `http://127.0.0.1:8080/`
3. **Expected**: The page displays with dark background and light text
4. Open DevTools → Console → run `localStorage.getItem('reading-list-theme')`
5. **Expected**: Returns `null` (no explicit preference set — OS default is in effect)

### V2 — OS light mode is automatically detected

1. Set your OS to **light mode**
2. Refresh `http://127.0.0.1:8080/` (clear localStorage first via DevTools → Application → Local Storage)
3. **Expected**: The page displays with light background and dark text

### V3 — Toggle switches from dark to light

1. Set OS to dark mode
2. Open `http://127.0.0.1:8080/` — page should be in dark mode
3. Click the theme toggle button in the header
4. **Expected**: Page immediately switches to light mode
5. Click DevTools → Application → Local Storage → `reading-list-theme`
6. **Expected**: Value is now `"light"`

### V4 — Toggle switches from light to dark

1. Set OS to light mode
2. Open `http://127.0.0.1:8080/` — page should be in light mode
3. Click the theme toggle button
4. **Expected**: Page immediately switches to dark mode
5. **Expected**: localStorage `reading-list-theme` is now `"dark"`

### V5 — Preference persists after page refresh

1. Set theme explicitly to dark (toggle if needed)
2. Note the current state (dark mode active)
3. Refresh the page
4. **Expected**: Page remains in dark mode (not reverted to OS default)
5. **Expected**: localStorage `reading-list-theme` still holds `"dark"`

### V6 — Preference persists after browser restart

1. Set theme explicitly to dark
2. Close the browser completely
3. Reopen the browser and navigate to `http://127.0.0.1:8080/`
4. **Expected**: Page loads in dark mode (not light)

### V7 — Explicit preference overrides OS setting

1. Set OS to light mode
2. Open reading list — should be in light mode
3. Toggle to dark mode
4. Change OS back to dark mode
5. Refresh the page
6. **Expected**: Page stays in dark mode (explicit preference overrides OS)

### V8 — Toggle is on the Add page too

1. Navigate to `http://127.0.0.1:8080/add`
2. **Expected**: The theme toggle button is visible in the header
3. **Expected**: The page uses the same theme as the index page

### V9 — No flash of wrong theme (FOUC)

1. Set OS to dark mode
2. Clear localStorage (DevTools → Application → Local Storage → clear)
3. Refresh the page
4. **Expected**: The page loads directly in dark mode — no flash of light background

### V10 — Reduced motion is respected

1. Set OS to "reduce motion" / "reduce transparency"
2. Toggle the theme back and forth
3. **Expected**: Theme changes happen instantly with no fade/transition animation

## Accessibility Checks

### A1 — Toggle has aria-label

1. Open DevTools → Elements
2. Find the theme toggle button
3. **Expected**: It has an `aria-label` attribute describing its function and current state (e.g., "Switch to dark mode" or "Switch to light mode")

### A2 — Toggle is keyboard accessible

1. Press `Tab` to focus the toggle button
2. Press `Enter` or `Space`
3. **Expected**: Theme toggles (dark ↔ light)

### A3 — Contrast ratios meet WCAG AA

1. Use a contrast checker tool (e.g., WebAIM Contrast Checker or browser DevTools accessibility panel)
2. Check text-on-background ratios for both light and dark themes
3. **Expected**: All text meets 4.5:1 minimum contrast ratio (WCAG AA)

## Performance Check

### P1 — Theme applied before render

1. Open DevTools → Performance tab
2. Record a page load
3. **Expected**: The `data-theme` attribute is set on `<html>` before the first paint (no visible flash)

### P2 — Page load not measurably slower

1. Load the page with and without an explicit theme preference set
2. **Expected**: Page load time differs by <10ms (the localStorage read is negligible)
