---

description: "Task list for Reading List Viewer + URL Fetcher implementation"

---

# Tasks: Reading List Viewer + URL Fetcher

**Input**: Design documents from `/specs/002-url-fetcher/`
**Spec**: `specs/001-reading-list-viewer/spec.md` + `specs/002-url-fetcher/spec.md`
**Plan**: `specs/002-url-fetcher/plan.md`
**Tech**: Flask, httpx (sync), trafilatura, typer, SQLite (stdlib)

**Tests**: Tests are optional — not included. Validate via `quickstart.md` scenarios.

**Organization**: Tasks organized by user story. Each phase is independently verifiable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Single project at repository root:
- `reading_list/` — application source
- `tests/` — test files (if tests are added later)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization

- [x] T001 Create project directory structure: `reading_list/`, `reading_list/db/`, `reading_list/models/`, `reading_list/services/`, `reading_list/fetcher/`, `reading_list/web/`, `reading_list/web/templates/`, `reading_list/web/static/`, `reading_list/cli/`
- [x] T002 Create `pyproject.toml` with dependencies: `flask`, `httpx`, `trafilatura`, `typer`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story work begins

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Implement database connection module — `reading_list/db/database.py`: create_engine, get_connection, close, context manager; database path from config
- [x] T004 [P] Implement config module — `reading_list/config.py`: env var reading (`READING_LIST_DB_PATH`, `READING_LIST_PORT`), defaults (db path `~/.reading-list/db.sqlite`, port 8080), validate config
- [x] T005 [P] Implement Entry data model — `reading_list/models/entry.py`: dataclass with url, title, excerpt, read, source_type, created_at, updated_at; validators (url valid, title non-empty max 500 chars, excerpt non-empty max 2000 chars)
- [x] T006 Implement SQLite migrations — `reading_list/db/migrations.py`: schema_version table, migration runner (V1_init.sql), create_engine helper; write `reading_list/db/migrations/V1_init.sql` from data-model.md schema
- [x] T007 Create Flask app skeleton — `reading_list/web/app.py`: Flask app factory, register blueprints/routes placeholder, app config from `config.py`

**Checkpoint**: Foundation ready — DB works, config loads, Entry model validates, migrations apply, Flask app starts

---

## Phase 3: US1 — Reading List Viewer + Fetch Flow (Priority: P1) 🎯 MVP

**Goal**: User can browse entries, add entries via fetch flow, and see a fast-loading list

**Independent Test**: User starts the app, opens `http://127.0.0.1:8080/`, sees an empty list. Adds an entry via CLI (`reading-list add "https://example.com" --title "Test" --excerpt "A test"`). The entry appears in the list on the web page.

### Implementation for User Story 1

- [x] T008 [P] [US1] Implement entry CRUD service — `reading_list/services/list_service.py`: `get_entries(page, per_page, tag_filter)`, `get_entry(id)`, `create_entry(url, title, excerpt)`, `update_entry(id, **kwargs)`, `delete_entry(id)`, `get_tags()`, `add_tag(entry_id, tag_name)`, `remove_tag(entry_id, tag_name)` — uses `database.py` and `migrations.py`
- [x] T009 [P] [US1] Implement HTTP fetcher — `reading_list/fetcher/http_client.py`: `fetch_url(url)` using httpx sync, returns `Response` object; handles timeouts (30s), redirects (follow up to 5), sets User-Agent header
- [x] T010 [P] [US1] Implement generic HTML extractor — `reading_list/fetcher/extractor.py`: `extract(html_text)` using trafilatura, returns dict with `headline` and `excerpt`; handles missing content gracefully (returns empty strings)
- [x] T011 [US1] Implement fetch service — `reading_list/services/fetch_service.py`: `fetch_and_extract(url)` — orchestrates http_client.fetch_url + extractor.extract + returns result dict; validates URL before fetching (raises `InvalidUrlError`); measures fetch time for response
- [x] T012 [P] [US1] Implement web routes — `reading_list/web/routes.py`: `GET /` (paginated entry list with optional tag filter), `GET /add` (render add form), `POST /fetch` (JSON: url → headline/excerpt via fetch_service), `POST /entries` (create entry with url/title/excerpt), `PATCH /entries/{id}` (update entry), `DELETE /entries/{id}` (delete entry) — all use list_service and fetch_service
- [x] T013 [P] [US1] Create HTML templates — `reading_list/web/templates/base.html` (layout with nav), `reading_list/web/templates/index.html` (entry list with pagination, empty state, tag filter, search box), `reading_list/web/templates/add.html` (URL input field + Fetch button + results preview area)
- [x] T014 [US1] Implement CLI commands — `reading_list/cli/commands.py` with typer: `list` (paginated, --tag, --search, --json), `add` (with optional --fetch flag for interactive fetch), `delete` (with confirmation), `tag`, `untag`, `read`, `unread`, `tags`, `stats` — uses list_service
- [x] T015 [US1] Wire up app entry point — `reading_list/main.py`: create app via Flask factory, apply migrations on startup, parse CLI args (if `--serve` run web server, else dispatch to CLI commands), bind to 127.0.0.1

**Checkpoint**: MVP complete — `python -m reading_list.main --serve` starts server, `python -m reading_list.main list` shows empty list, `python -m reading_list.main add "https://example.com" --title "Test" --excerpt "A test"` creates an entry visible in the browser

---

## Phase 4: US2 — Error Handling (Priority: P2)

**Goal**: User gets clear error messages for invalid URLs, unreachable sites, and extraction failures

**Independent Test**: User pastes `not-a-url` into the add form, clicks Fetch, and sees an error message. User pastes `https://this-domain-does-not-exist-12345.com`, clicks Fetch, and sees a connection error message. No entries are created in either case.

### Implementation for User Story 2

- [x] T016 [US2] Implement URL validation — `reading_list/fetcher/validators.py`: `validate_url(url)` — checks scheme (http/https), checks host is non-empty, raises `InvalidUrlError` with descriptive message; called before `http_client.fetch_url`
- [x] T017 [US2] Implement error responses in web routes — `reading_list/web/routes.py`: `POST /fetch` returns 400 with `{"error": "..."}` for invalid URLs, 502 with `{"error": "..."}` for connection failures, 422 with `{"error": "No headline or excerpt..."}` for empty extraction; `POST /entries` returns 409 for duplicate URL, 404 for not found on PATCH/DELETE
- [x] T018 [US2] Implement error display in HTML templates — `reading_list/web/templates/add.html`: show error messages inline below the URL field (red text, dismissable); show loading spinner while fetching; disable Fetch button during fetch

**Checkpoint**: Error handling complete — bad URLs show user-friendly errors, no crashes, no phantom entries

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements across all features

- [x] T019 [P] Add minimal CSS — `reading_list/web/static/style.css`: clean typewriter-style list layout, compact entry rows, responsive grid, read/unread visual distinction (strikethrough for read), tag badges, pagination controls
- [x] T020 [P] Add minimal JS for interactivity — `reading_list/web/static/app.js`: fetch button triggers POST /fetch via AJAX, shows loading state, renders preview, Save/Cancel buttons; delete confirmation dialog; tag inline edit
- [x] T021 [US2] Add pagination controls to index template — `reading_list/web/templates/index.html`: previous/next buttons, page indicator, configurable per-page (50/100/200)
- [x] T022 [US2] Add search input to index template — `reading_list/web/templates/index.html`: search box that submits `?q=` query parameter to server-side FTS5 search
- [x] T023 [US2] Verify stats CLI output — `reading_list/cli/commands.py`: `stats` command shows total entries, unread count, tag count, date range — ensure all numbers are correct

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — can proceed after Phase 2
- **User Story 2 (Phase 4)**: Depends on Phase 3 — error handling builds on fetch flow
- **Polish (Phase 5)**: Depends on all user stories being complete

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before UI integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks can run in parallel (different files)
- All Foundational tasks marked [P] can run in parallel (config, Entry model)
- Phase 3 [P] tasks (T008 entry service, T009 http_client, T010 extractor) can run in parallel (different files)
- Phase 3 [P] tasks (T012 routes, T013 templates) can run in parallel (code vs templates)

---

## Implementation Strategy

### MVP First (Phase 3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run `python -m reading_list.main add "https://example.com" --title "Test" --excerpt "test"` then `python -m reading_list.main list` then open browser
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 → MVP: add entries, browse list (works end-to-end)
3. Phase 4 → Error handling: robust against bad URLs
4. Phase 5 → Polish: CSS, JS interactivity, pagination, search

---

## Notes

- [P] tasks = different files, no dependencies
- Each user story should be independently completable and testable
- Commit after each phase or logical group
- Stop at any checkpoint to validate story independently
- Validation via `specs/002-url-fetcher/quickstart.md` scenarios
