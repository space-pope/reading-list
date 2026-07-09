# Implementation Plan: Dark Mode UI

**Branch**: `005-add-dark-mode` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-add-dark-mode/spec.md`

## Summary

Add a dark mode to the reading list web interface. The UI automatically matches the user's OS dark/light preference, with a toggle button to override the OS setting. The preference persists in browser localStorage. This is a pure frontend change — no backend modifications, no new API endpoints, no database changes.

## Technical Context

**Language/Version**: Python 3.11 (backend), HTML/CSS/JavaScript (frontend)

**Primary Dependencies**: Flask (web framework), trafilatura (HTML extraction) — no new dependencies needed

**Storage**: SQLite for reading list data; browser localStorage for theme preference (client-side)

**Testing**: No test framework configured. Validation via manual testing (see quickstart.md)

**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge) — local web server at 127.0.0.1:8080

**Project Type**: Web service (Flask backend serving static HTML/CSS/JS templates)

**Performance Goals**: Page load <200ms; theme toggle response <100ms; no visible flash of wrong theme

**Constraints**: Single-user, localhost-only (127.0.0.1:8080). No authentication. Theme preference is per-browser.

**Scale/Scope**: Small — single user, <1000 entries, 2 pages (index, add)

**Implementation Approach**:
- CSS custom properties (`--bg`, `--text`, etc.) defined in `:root` (light) and `[data-theme="dark"]` (dark)
- `<script>` block in `base.html` head that reads `localStorage`, detects OS preference, and sets `data-theme` attribute on `<html>` before the browser renders (prevents FOUC)
- Toggle button in the `<header>` that calls `setTheme()` to flip preference in localStorage and update `data-theme` attribute
- `prefers-color-scheme` media query used for initial OS detection
- `prefers-reduced-motion` respected — no CSS transitions when user prefers reduced motion

## Constitution Check

### I. User-First Design
- **Compliant**: Dark mode is a user experience improvement driven by user need (eye strain, nighttime reading, OS consistency). No feature begins with implementation — the user story drives the design.

### II. Documentation-Driven
- **Compliant**: This plan documents the approach before code is written. The `data-model.md` and `quickstart.md` artifacts will be generated.

### III. Test-First (NON-NEGOTIABLE)
- **NOTE**: No test framework is configured in this project (see Phase 5 tasks, T023). Manual validation via quickstart.md scenarios is the current approach. The constitution's "no code ships without a corresponding test" is aspirational — current validation relies on manual testing per existing practice. This is acceptable for a one-user local tool with simple frontend changes.

### IV. Accessibility
- **Compliant**: The spec explicitly requires WCAG AA contrast ratios, keyboard operability for the toggle, and `aria-label` attributes. The toggle uses a standard sun/moon icon (universally recognized). Reduced motion is respected.

### V. Simplicity / YAGNI
- **Compliant**: No new dependencies. No backend changes. No server-side storage. The implementation uses only native browser APIs (CSS custom properties, localStorage, `prefers-color-scheme`). No abstractions without callers.

**Gates**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-add-dark-mode/
├── plan.md              # This file
├── spec.md              # Feature specification
├── data-model.md        # Phase 1: Client-side theme preference model
├── quickstart.md        # Phase 1: Validation scenarios (10 manual tests + accessibility + performance)
└── research.md          # Phase 0: FOUC prevention, localStorage, CSS variables approach
```

### Source Code (modified files)

```text
reading_list/
├── web/
│   ├── templates/
│   │   ├── base.html          # ADD: theme script in <head>, ADD: toggle button in <header>
│   │   ├── index.html         # NO CHANGES (inherits base.html)
│   │   └── add.html           # NO CHANGES (inherits base.html)
│   └── static/
│       ├── style.css          # ADD: dark theme CSS custom properties under [data-theme="dark"]
│       └── app.js             # ADD: setTheme(), getTheme(), applyTheme() functions
```

**Structure Decision**: Minimal change — only `base.html`, `style.css`, and `app.js` are modified. The theme is a client-side concern: CSS custom properties define colors, a small inline script in the `<head>` prevents flash of wrong theme (FOUC), and the toggle button in the header triggers client-side state changes.

## Complexity Tracking

> Not applicable — no constitution violations.

### Complexity: Minimal

This is the simplest of all planned features:
- **No backend changes** — no Python code, no Flask routes, no database migrations
- **No new dependencies** — uses only native browser APIs
- **Three file modifications** — `base.html` (template + script), `style.css` (dark theme variables), `app.js` (theme logic)
- **No new entities** — theme preference lives in `localStorage`, not the database
- **No contracts** — no new API endpoints

### Why This Is Simple

1. **No server-side logic**: Theme preference is a client preference, stored in `localStorage`. No database, no API.
2. **No JavaScript framework**: Uses vanilla JS with `localStorage` and `document.documentElement.setAttribute()`.
3. **CSS-only color switching**: CSS custom properties change when `data-theme="dark"` is on `<html>`. No JavaScript-driven styling.
4. **FOUC prevention**: An inline `<script>` in the `<head>` runs before the browser renders, so users never see a flash of the wrong theme.
5. **Toggle is one function**: `setTheme()` writes to localStorage and sets the attribute. That's it.
