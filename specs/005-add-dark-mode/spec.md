# Feature Specification: Dark Mode UI

**Feature Branch**: `005-add-dark-mode`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "Add a dark mode to the UI. Color scheme should follow system defaults, but include a toggle on the page for setting it explicitly."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Automatic dark mode detection (Priority: P1)

A user opens the reading list in their browser. If their operating system is set to dark mode, the reading list automatically displays with a dark color scheme. If their OS is set to light mode, the reading list displays with a light color scheme.

**Why this priority**: This is the default behavior users expect from modern applications. It requires no user action and provides immediate value.

**Independent Test**: User sets their OS to dark mode, opens the reading list, and verifies the UI uses dark colors. User sets OS to light mode, refreshes the page, and verifies the UI switches to light colors.

**Acceptance Scenarios**:

1. **Given** the user's operating system is set to dark mode, **When** the user opens the reading list, **Then** the UI displays with dark colors (dark background, light text).
2. **Given** the user's operating system is set to light mode, **When** the user opens the reading list, **Then** the UI displays with light colors (light background, dark text).
3. **Given** the user changes their OS dark/light mode setting, **When** the user refreshes the page, **Then** the UI updates to match the new OS setting.
4. **Given** the user's OS prefers reduced motion, **When** the page loads, **Then** any theme transitions respect the reduced motion preference.

---

### User Story 2 — Manual dark mode toggle (Priority: P1)

A user wants to override the OS default and explicitly choose light or dark mode. The user toggles the theme setting on the reading list page and the UI updates immediately.

**Why this priority**: Users may have different preferences than their OS setting (e.g., dark mode OS but light mode reading list for better readability). The toggle gives them control.

**Independent Test**: User opens the reading list, clicks the theme toggle, and verifies the UI switches from dark to light (or light to dark). User refreshes the page and verifies their choice persists.

**Acceptance Scenarios**:

1. **Given** the OS is set to dark mode, **When** the user clicks the theme toggle to "light", **Then** the UI switches to light mode immediately.
2. **Given** the OS is set to light mode, **When** the user clicks the theme toggle to "dark", **Then** the UI switches to dark mode immediately.
3. **Given** the user has set an explicit theme preference, **When** the user refreshes the page or navigates to a different page, **Then** the explicit preference is honored (not overridden by OS setting).
4. **Given** the user has set an explicit theme preference, **When** they click the toggle again, **Then** the preference flips (dark → light or light → dark) and persists.

---

### User Story 3 — Persistent theme preference (Priority: P1)

A user sets a theme preference (dark or light) and closes the browser. When they reopen the reading list later, their preference is still applied.

**Why this priority**: Without persistence, users must set their preference every time they visit, which is frustrating and defeats the purpose of a toggle.

**Independent Test**: User sets theme to dark mode, closes the browser, reopens the reading list, and verifies dark mode is still active.

**Acceptance Scenarios**:

1. **Given** the user has set a theme preference, **When** they close the browser, **Then** the preference is saved.
2. **Given** the user has set a theme preference, **When** they reopen the reading list in the same browser, **Then** the preference is reapplied immediately on page load.
3. **Given** the user has set a theme preference, **When** they navigate to any page within the reading list, **Then** the preference persists across all pages.
4. **Given** the user resets their preference to "follow OS", **When** they refresh the page, **Then** the theme reverts to matching the OS setting.

---

## Functional Requirements *(mandatory)*

### FR-1: OS Theme Detection

1. **FR-1.1**: The UI MUST automatically detect and match the user's operating system dark/light mode preference on page load.
2. **FR-1.2**: If no explicit user preference is set, the UI MUST use the OS preference as the default theme.
3. **FR-1.3**: The UI MUST update its theme when the user changes their OS dark/light mode setting (on next page load or refresh).
4. **FR-1.4**: The UI MUST respect the user's "reduce motion" preference — no animation plays when the user prefers reduced motion.

### FR-2: Theme Toggle

5. **FR-2.1**: The UI MUST include a visible theme toggle control on every page.
6. **FR-2.2**: The toggle MUST allow the user to switch between light and dark themes.
7. **FR-2.3**: The toggle MUST update the UI theme immediately upon interaction (no page reload required).
8. **FR-2.4**: The toggle control MUST have a clear label and/or icon indicating its current state (e.g., sun icon for light, moon icon for dark).
9. **FR-2.5**: The toggle MUST be accessible via keyboard navigation (Tab to focus, Enter/Space to toggle).
10. **FR-2.6**: The toggle MUST include an `aria-label` describing its function and current state for screen readers.

### FR-3: Theme Persistence

11. **FR-3.1**: When the user sets an explicit theme preference, the preference MUST be saved in the browser so it persists across browser sessions.
12. **FR-3.2**: The saved preference MUST override the OS setting when explicitly set.
13. **FR-3.3**: If the user has no saved preference, the UI MUST fall back to the OS setting.
14. **FR-3.4**: The theme preference MUST be applied on page load before the UI renders (to prevent flash of wrong theme).

### FR-4: Visual Design

15. **FR-4.1**: The dark theme MUST use a dark background color with light text for readability.
16. **FR-4.2**: The light theme MUST use a light background color with dark text for readability.
17. **FR-4.3**: All UI elements (backgrounds, text, borders, links, buttons) MUST have appropriate contrast ratios in both themes to meet accessibility standards (minimum 4.5:1 for normal text).
18. **FR-4.4**: Theme colors MUST be centrally defined and easily adjustable for maintenance.
19. **FR-4.5**: The theme MUST apply consistently across all pages of the reading list.

---

## Success Criteria *(mandatory)*

### SC-1: Automatic Detection

1. **SC-1.1**: When the OS is set to dark mode and no user preference exists, the UI displays in dark mode on 100% of page loads.
2. **SC-1.2**: When the OS is set to light mode and no user preference exists, the UI displays in light mode on 100% of page loads.
3. **SC-1.3**: When the user changes OS theme and refreshes the page (with no explicit preference), the UI updates to match on the next load.

### SC-2: Manual Toggle

4. **SC-2.1**: Clicking the theme toggle switches the UI theme from dark to light or light to dark on the first click (100% of interactions).
5. **SC-2.2**: The theme toggle updates the UI within 100ms of user interaction (no perceptible delay).
6. **SC-2.3**: The theme toggle is visible and accessible on 100% of pages in the reading list.
7. **SC-2.4**: The theme toggle is operable via keyboard (Tab + Enter/Space) on 100% of supported browsers.

### SC-3: Persistence

8. **SC-3.1**: After setting a theme preference, the preference persists across 100% of browser restarts and page refreshes.
9. **SC-3.2**: An explicit theme preference overrides the OS setting on 100% of page loads.
10. **SC-3.3**: The theme is applied on page load without any visible flash of the wrong theme (no FOUC — Flash of Unstyled Content).

### SC-4: Accessibility

11. **SC-4.1**: Text contrast ratios meet WCAG AA minimums (4.5:1) in both light and dark themes for all UI text.
12. **SC-4.2**: The theme toggle has an `aria-label` describing its function and current state on 100% of pages.
13. **SC-4.3**: The theme toggle is focusable and operable via keyboard on 100% of supported browsers.
14. **SC-4.4**: Theme transitions respect `prefers-reduced-motion` — no animation plays when the user prefers reduced motion.

### SC-5: Performance

15. **SC-5.1**: Page load time is not measurably increased by theme detection/persistence (increase < 10ms).
16. **SC-5.2**: The theme is applied within 50ms of DOM content loaded (prevents visible flash).

---

## Key Entities *(mandatory)*

| Entity | Description |
|--------|-------------|
| **Theme Preference** | User's explicit choice of light/dark theme, stored in browser local storage. Overrides OS setting when set. |
| **OS Theme Setting** | System-level dark/light mode preference detected via CSS media queries (`prefers-color-scheme`). |
| **CSS Custom Properties** | Theme variables (colors for backgrounds, text, borders, links) defined as CSS `--var(--key)` for both light and dark themes. |

---

## Assumptions *(mandatory)*

1. **A-1**: The reading list is accessed primarily from modern browsers (Chrome, Firefox, Safari, Edge) that support OS theme detection.
2. **A-2**: Theme preference is stored in the browser (not server-side) since it is a per-browser client preference, not user data.
3. **A-3**: Default OS detection is sufficient; no manual OS detection logic is needed.
4. **A-4**: The toggle control uses a sun/moon icon (universal symbol for light/dark mode).
5. **A-5**: Color choices for light/dark themes follow common reading list conventions: light theme uses white/off-white backgrounds with dark text; dark theme uses dark gray (not pure black) backgrounds with light gray text for reduced eye strain.
6. **A-6**: The toggle is placed in the navigation bar/header for easy access from any page.

---

## Out of Scope

- Custom color themes beyond light/dark (e.g., sepia, high contrast).
- Per-entry theme override (e.g., a specific article displayed in dark mode while the list is light).
- Server-side theme preference storage (preference is client-side only).
- Animated theme transitions (beyond basic CSS transitions, if any).
- Theme detection for non-browser clients (CLI, API).

---

## Open Questions

1. **O-1**: Should the theme preference be stored server-side (database) or client-side (localStorage)? **Status**: Client-side localStorage — theme is a per-browser preference, not user data. Simpler, no backend changes.
2. **O-2**: Should there be a "Follow OS" option in the toggle (three-state: light / dark / auto)? **Status**: Two-state toggle (light/dark) is sufficient — "auto" is the default when no preference is set. A three-state toggle adds complexity without clear user benefit.
3. **O-3**: Should the toggle include an animation/transition when switching themes? **Status**: Minimal CSS transition (opacity or color fade) is acceptable if it does not violate `prefers-reduced-motion`. No elaborate animations.
