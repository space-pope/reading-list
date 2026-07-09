# Data Model: Theme Preference

**Feature**: 005 — Add dark mode to the UI

## Overview

The theme preference is a **client-side only** concept. It is stored in the user's browser `localStorage`, not in the server-side SQLite database. There is no server-side data model or database migration required.

## Client-Side Storage

### localStorage Key

| Key | Value | Type |
|-----|-------|------|
| `reading-list-theme` | `"light"`, `"dark"`, or unset (follows OS) | string |

### Resolution Order

1. If `reading-list-theme` is set in `localStorage` → use that value
2. If `reading-list-theme` is NOT set → use OS preference (`prefers-color-scheme`)

## Theme Attribute on `<html>`

The `<html>` element receives a `data-theme` attribute that drives CSS:

| `data-theme` Value | CSS Target | Description |
|---|---|---|
| `"light"` (default, or when `data-theme="light"`) | `:root` CSS variables | Light theme |
| `"dark"` (when `data-theme="dark"`) | `[data-theme="dark"]` CSS variables | Dark theme |

When the attribute is absent or set to `"light"`, the `:root` CSS custom properties apply. When set to `"dark"`, the `[data-theme="dark"]` CSS custom properties override them.

## CSS Custom Properties

### Light Theme (`:root`)

| Variable | Default Value | Description |
|---|---|---|
| `--bg` | `#ffffff` | Page background |
| `--bg-alt` | `#fafafa` | Entry card background |
| `--text` | `#333333` | Primary text |
| `--text-muted` | `#666666` | Secondary text (URLs, timestamps) |
| `--text-faint` | `#888888` | Tertiary text (meta) |
| `--border` | `#eeeeee` | Borders |
| `--link` | `#0066cc` | Link color |
| `--link-hover` | `#0052a3` | Link hover color |
| `--accent` | `#0066cc` | Accent (unread indicator, buttons) |
| `--error` | `#d32f2f` | Error text/background |
| `--tag-bg` | `#e8f0fe` | Tag badge background |
| `--tag-text` | `#1a73e8` | Tag badge text |

### Dark Theme (`[data-theme="dark"]`)

| Variable | Value | Description |
|---|---|---|
| `--bg` | `#1a1a2e` | Dark background |
| `--bg-alt` | `#222240` | Dark entry card background |
| `--text` | `#e0e0e0` | Light text |
| `--text-muted` | `#aaaaaa` | Muted text |
| `--text-faint` | `#888888` | Faint text |
| `--border` | `#333355` | Dark borders |
| `--link` | `#66aaff` | Light-friendly link color |
| `--link-hover` | `#88ccff` | Light hover link |
| `--accent` | `#66aaff` | Dark accent |
| `--error` | `#ef5350` | Error color (slightly lighter for dark bg) |
| `--tag-bg` | `#2a3a5c` | Dark tag background |
| `--tag-text` | `#88bbff` | Dark tag text |

## Functions (JavaScript)

### `getTheme(): string`

Returns the resolved theme value:
1. Read `localStorage.getItem('reading-list-theme')`
2. If set and is `"light"` or `"dark"`, return it
3. Otherwise, return `"dark"` if `matchMedia('(prefers-color-scheme: dark)').matches`, else `"light"`

### `setTheme(theme: 'light' | 'dark')`

1. Write `localStorage.setItem('reading-list-theme', theme)`
2. Set `document.documentElement.setAttribute('data-theme', theme)`

### `toggleTheme()`

1. Call `getTheme()` to get current theme
2. Call `setTheme(theme === 'light' ? 'dark' : 'light')`

### `initTheme()`

Called on page load (in inline `<script>` in `<head>`):
1. Call `getTheme()`
2. Set `document.documentElement.setAttribute('data-theme', theme)`
3. Must run before any CSS is rendered (placed in `<head>` before `<link>` tags)

## Database Impact

**None.** The theme preference is entirely client-side. No database tables, no migrations, no Python code changes.
