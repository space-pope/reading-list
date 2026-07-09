---

description: "Task list for adding dark mode to the reading list UI"

---

# Tasks: Add Dark Mode UI

**Input**: Design documents from `/specs/005-add-dark-mode/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: No test framework configured. Validation via manual testing per quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `reading_list/web/templates/`, `reading_list/web/static/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Review existing project structure and confirm no backend changes needed

- [ ] T001 Review existing project structure and confirm dark mode is pure frontend (no backend, no DB, no new deps)

**Checkpoint**: Confirmed — only `base.html`, `style.css`, and `app.js` need modification

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Set up CSS custom properties foundation that all themes and user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — the CSS variables must exist before theme switching can work

- [ ] T002 Define light theme CSS custom properties in `reading_list/web/static/style.css` (`:root` block with `--bg`, `--text`, `--border`, `--link`, `--accent`, `--tag-bg`, `--tag-text`, etc.)

**Checkpoint**: Foundation ready — CSS variables defined for light theme; user story implementation can now begin

---

## Phase 3: User Story 1 — Automatic dark mode detection (Priority: P1) 🎯 MVP

**Goal**: UI automatically matches the user's OS dark/light preference on page load, with no flash of wrong theme.

**Independent Test**: User sets OS to dark mode, opens reading list, verifies dark colors. User sets OS to light mode, refreshes, verifies light colors.

### Implementation for User Story 1

- [ ] T003 [P] [US1] Define dark theme CSS custom properties in `reading_list/web/static/style.css` (`[data-theme="dark"]` block overriding `:root` variables with dark values)
- [ ] T004 [P] [US1] Add inline `<script>` block in `<head>` of `reading_list/web/templates/base.html` that reads `localStorage`, detects OS preference via `prefers-color-scheme`, and sets `data-theme` attribute on `<html>` before render (prevents FOUC)
- [ ] T005 [US1] Add `prefers-reduced-motion` CSS rule in `reading_list/web/static/style.css` to disable theme transitions when user prefers reduced motion

**Checkpoint**: User Story 1 is fully functional — OS theme detection works with no FOUC, reduced motion respected

---

## Phase 4: User Story 2 — Manual dark mode toggle (Priority: P1)

**Goal**: User can toggle between light and dark mode via a button in the header, with immediate visual update and proper accessibility.

**Independent Test**: User opens reading list, clicks the theme toggle, verifies UI switches immediately. User navigates to another page, verifies toggle is present and theme persists.

### Implementation for User Story 2

- [ ] T006 [P] [US2] Implement `getTheme()`, `setTheme()`, and `toggleTheme()` functions in `reading_list/web/static/app.js` (reads/writes `localStorage` key `reading-list-theme`, sets `data-theme` attribute)
- [ ] T007 [P] [US2] Add theme toggle button (sun/moon icon) in `<header>` of `reading_list/web/templates/base.html` with `aria-label` describing current state, keyboard accessible (Tab + Enter/Space)
- [ ] T008 [US2] Wire toggle button `onclick` handler in `reading_list/web/static/app.js` to call `toggleTheme()` and update `aria-label` to reflect new state

**Checkpoint**: User Stories 1 AND 2 both work — OS detection + manual toggle with accessibility

---

## Phase 5: User Story 3 — Persistent theme preference (Priority: P1)

**Goal**: User's explicit theme choice persists across page refreshes, browser restarts, and page navigation. Explicit preference overrides OS setting.

**Independent Test**: User sets theme to dark, closes browser, reopens reading list — dark mode is still active. User changes OS setting, refreshes — explicit preference is honored.

### Implementation for User Story 3

- [ ] T009 [US3] Verify `initTheme()` in inline `<script>` (from T004) correctly resolves preference priority: explicit localStorage > OS `prefers-color-scheme`, and applies `data-theme` before render
- [ ] T010 [US3] Verify `setTheme()` in `app.js` (from T006) persists to `localStorage` and that `toggleTheme()` correctly flips between light/dark
- [ ] T011 [US3] Verify theme applies consistently across all pages (index.html and add.html inherit base.html and receive the same theme)

**Checkpoint**: All user stories complete — theme auto-detects, toggles, and persists across sessions

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and final checks

- [ ] T012 [P] Run quickstart.md validation scenarios V1–V10, A1–A3, P1–P2 manually to confirm all acceptance criteria pass
- [ ] T013 Verify no flash of wrong theme (FOUC) by clearing localStorage and reloading — page loads directly in correct theme
- [ ] T014 Verify contrast ratios meet WCAG AA (4.5:1) in both light and dark themes using DevTools accessibility panel

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — defines CSS variables that all themes need
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion
  - US1 (Phase 3) can start after Phase 2 — defines dark CSS variables + FOUC prevention
  - US2 (Phase 4) can start after Phase 3 — builds on CSS variables + adds JS toggle logic
  - US3 (Phase 5) can start after Phase 4 — verifies persistence across the full implementation
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 (CSS variables defined) — no dependencies on other stories
- **User Story 2 (P1)**: Depends on Phase 3 (CSS variables + base theme working) — adds toggle on top of US1
- **User Story 3 (P1)**: Depends on Phases 3–4 (theme + toggle working) — verifies persistence of the full system

### Within Each User Story

- CSS (style.css) before template (base.html) before JS logic (app.js) where applicable
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T003 and T004 (US1) can run in parallel — different files (style.css vs base.html)
- T006 and T007 (US2) can run in parallel — different files (app.js vs base.html)
- T012 and T013 (Polish) can run in parallel — independent validation checks

---

## Parallel Example: User Story 1

```bash
# Launch T003 and T004 together (different files, no dependencies):
Task: "Define dark theme CSS custom properties in reading_list/web/static/style.css"
Task: "Add inline script block in reading_list/web/templates/base.html for FOUC prevention"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (confirm scope)
2. Complete Phase 2: Foundational (light theme CSS variables)
3. Complete Phase 3: User Story 1 (dark theme CSS + FOUC prevention script)
4. **STOP and VALIDATE**: Test OS auto-detection (V1, V2, V9 from quickstart.md)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → CSS variables ready
2. Add User Story 1 → OS auto-detection works (MVP!)
3. Add User Story 2 → Manual toggle with accessibility
4. Add User Story 3 → Persistence verified across sessions
5. Polish → Full validation against quickstart.md

### Notes

- This is a **pure frontend change** — no Python, no Flask routes, no database, no new dependencies
- Only 3 files modified: `base.html`, `style.css`, `app.js`
- Theme preference stored in browser `localStorage` (key: `reading-list-theme`)
- No test framework configured — validate manually using quickstart.md scenarios
- Commit after each phase or logical group
