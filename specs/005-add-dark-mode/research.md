# Research: Dark Mode Implementation

**Feature**: 005 — Add dark mode to the UI

## Research Tasks

### 1. How to implement dark mode without FOUC (Flash of Unstyled Content)?

**Decision**: Inline `<script>` block in `<head>` of `base.html` that runs synchronously before the browser renders the page. The script reads `localStorage` for an explicit preference, falls back to `matchMedia('(prefers-color-scheme: dark)')` for OS detection, and sets `document.documentElement.setAttribute('data-theme', ...)` immediately.

**Rationale**: This is the only reliable way to prevent FOUC. The script must execute before the CSS is applied — placing it in `<head>` before any CSS `link` or inline `<style>` tags ensures it runs first. Any other approach (CSS-only `prefers-color-scheme`, or JS that runs after `DOMContentLoaded`) will show a flash.

**Alternatives considered**:
1. **CSS-only `prefers-color-scheme`**: Simple but cannot handle the user toggle override. User's explicit choice would be lost on page reload.
2. **SSR (server-rendered `data-theme`)**: Adds backend complexity (need to read a cookie or session). Overkill for a single-user local app.
3. **`<noscript>` fallback**: Useful but not needed here — localStorage is universally supported in modern browsers.

### 2. Where to store the theme preference?

**Decision**: Browser `localStorage` with key `reading-list-theme`.

**Rationale**: 
- **vs. cookies**: Cookies are sent with every request, adding unnecessary bandwidth. Theme is a client-side preference, not server-recognized state.
- **vs. server-side (database/session)**: Single-user app, preference is per-browser. localStorage is simpler, requires no backend changes, and persists across browser restarts.
- **vs. sessionStorage**: sessionStorage clears on tab close, which would reset the user's choice every time they close the tab. localStorage persists until explicitly cleared.

**Alternatives considered**:
1. **Cookie-based**: Would work but is overkill — theme doesn't need server recognition.
2. **Server-side in database**: Single-user app with no account system. No need for server-side storage.

### 3. Which CSS approach for theme switching?

**Decision**: CSS custom properties (variables) on `:root` for light theme, and `[data-theme="dark"]` for dark theme.

**Rationale**:
- **CSS variables** are the modern, maintainable approach. Colors are defined once in `:root`, and changing one variable changes it everywhere.
- **`[data-theme="dark"]` attribute selector** is the standard pattern — it overrides `:root` variables when the attribute is present.
- **vs. separate CSS files**: Two separate stylesheets (`light.css`, `dark.css`) require swapping `<link>` tags. More complex, more HTTP requests.
- **vs. JS-driven styles**: Adding `style` attributes via JavaScript for each element is fragile and hard to maintain. CSS variables are declarative.

**Alternatives considered**:
1. **Two separate CSS files**: Works but requires dynamic `<link>` swapping. More HTTP overhead.
2. **JS-driven inline styles**: Fragile, hard to maintain, defeats the purpose of CSS.

### 4. What color palette for dark theme?

**Decision**: Dark gray background (`#1a1a2e` or similar), light gray text (`#e0e0e0`), not pure black/white.

**Rationale**:
- Pure black (`#000`) backgrounds with pure white text create excessive contrast that can cause eye strain (halation effect).
- Dark gray (`#1a1a2e` or `#1e1e2e`) with light gray text (`#e0e0e0`) provides good readability with comfortable contrast.
- The toggle colors (blue accent `#0066cc`) work in both themes.

**Alternatives considered**:
1. **Pure black/white**: High contrast but causes eye strain over time (halation).
2. **Sepia/warm tones**: Adds complexity without clear benefit for a reading list.

## Research Conclusion

No novel research was required — all decisions follow established web development patterns for dark mode. The implementation is straightforward: CSS custom properties + a small inline script in the `<head>` + localStorage persistence.
