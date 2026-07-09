---

description: "Task list for Add URL Fetch feature"
---

# Tasks: Add URL Fetch

**Input**: Design documents from `/specs/002-add-url-fetch/`
**Feature Branch**: `002-add-url-fetch`

**Tests**: Test-First is NON-NEGOTIABLE per project constitution. All tests written before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Source: `src/` at repository root
- Tests: `tests/` at repository root
- Contracts: `specs/002-add-url-fetch/contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project directory structure (`src/`, `tests/`, `tests/unit/`, `tests/integration/`)
- [ ] T002 Initialize Python project with dependencies: `httpx`, `beautifulsoup4`, `lxml`, `pydantic` in `pyproject.toml`
- [ ] T003 [P] Configure linting (ruff) and formatting (black) in `pyproject.toml`
- [ ] T004 [P] Configure pytest in `pyproject.toml` with test discovery settings

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create Entry model/schema in `src/models/entry.py` (URL unique, headline, excerpt, source, created_at)
- [ ] T006 [P] Implement SQLite database layer in `src/db.py` (connection, CRUD operations for Entry)
- [ ] T007 [P] Implement URL validation utility in `src/utils/url_validation.py` (well-formed URL check using pydantic)
- [ ] T008 [P] Implement generic HTML scraper in `src/services/scraping.py` (extracts title, meta description, first paragraphs from HTML)
- [ ] T009 [P] Implement HTTP fetch client in `src/services/fetch_client.py` (httpx-based with configurable timeout, non-HTML response detection)
- [ ] T010 Setup error handling module in `src/errors.py` (custom exceptions: InvalidUrlError, FetchTimeoutError, NonHtmlResponseError, FetchError)
- [ ] T011 Configure logging in `src/logging_config.py`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 — Add entry via URL fetch (Priority: P1) MVP

**Goal**: User can add a new entry by pasting a URL, clicking Fetch, and having the headline/excerpt scraped and saved to the reading list.

**Independent Test**: User clicks "Add", pastes a URL, clicks "Fetch", and verifies that a new entry with a headline and excerpt appears in the reading list.

### Tests for User Story 1

- [ ] T012 [P] [US1] Unit test for URL validation in `tests/unit/test_url_validation.py`
- [ ] T013 [P] [US1] Unit test for Entry model in `tests/unit/test_entry_model.py`
- [ ] T014 [P] [US1] Unit test for generic HTML scraper in `tests/unit/test_scraping.py`
- [ ] T015 [P] [US1] Unit test for fetch client (success, timeout, non-HTML, connection error) in `tests/unit/test_fetch_client.py`
- [ ] T016 [P] [US1] Integration test for full fetch-and-save flow in `tests/integration/test_fetch_and_save.py`

### Implementation for User Story 1

- [ ] T017 [US1] Implement fetch service in `src/services/fetch_service.py` (orchestrates URL validation → HTTP fetch → scraping → save to DB)
- [ ] T018 [US1] Implement web endpoint/handler for URL fetch in `src/api/fetch.py` (receives URL input, calls fetch service, returns result)
- [ ] T019 [US1] Implement web UI: Add button, URL text field, and Fetch button in `src/static/add_form.html` (or equivalent frontend file)
- [ ] T020 [US1] Wire fetch endpoint to frontend form submission in `src/api/routes.py`
- [ ] T021 [US1] Handle duplicate URL detection via database unique constraint in `src/db.py`

**Checkpoint**: User Story 1 is fully functional — user can add entries via URL fetch end-to-end

---

## Phase 4: User Story 2 — Fetch with loading feedback (Priority: P2)

**Goal**: User sees visual feedback (loading indicator, disabled button) while fetching, and the button re-enables on completion or timeout.

**Independent Test**: User clicks "Fetch" on a slow-loading URL and observes a loading indicator until the result appears or an error is shown.

### Tests for User Story 2

- [ ] T022 [P] [US2] Unit test for fetch timeout behavior in `tests/unit/test_fetch_timeout.py`
- [ ] T023 [P] [US2] Integration test for loading state transitions in `tests/integration/test_fetch_loading_state.py`

### Implementation for User Story 2

- [ ] T024 [US2] Add fetch timeout configuration (default ~10 seconds) in `src/services/fetch_client.py`
- [ ] T025 [US2] Update web UI to disable Fetch button and show loading spinner during fetch in `src/static/add_form.html`
- [ ] T026 [US2] Update web UI to re-enable button and hide spinner on success/failure/timeout in `src/static/add_form.html`
- [ ] T027 [US2] Display user-friendly error messages for timeout, unreachable host, and invalid URL in `src/static/add_form.html`

**Checkpoint**: User Stories 1 AND 2 both work — fetch has proper loading feedback and error handling

---

## Phase 5: User Story 3 — Preview before saving (Priority: P3)

**Goal**: After fetching, user sees extracted headline and excerpt in a preview area; they can edit, confirm save, or discard.

**Independent Test**: User fetches a URL and sees the extracted headline and excerpt in a preview area; they can edit the text or confirm to save.

### Tests for User Story 3

- [ ] T028 [P] [US3] Integration test for preview-save flow in `tests/integration/test_preview_save.py`
- [ ] T029 [P] [US3] Integration test for preview-discard flow in `tests/integration/test_preview_discard.py`

### Implementation for User Story 3

- [ ] T030 [US3] Modify fetch service to return extracted data without auto-saving in `src/services/fetch_service.py`
- [ ] T031 [US3] Add preview UI component showing headline and excerpt with edit fields in `src/static/preview.html` (or inline in `src/static/add_form.html`)
- [ ] T032 [US3] Add Save and Discard buttons in preview UI in `src/static/add_form.html`
- [ ] T033 [US3] Implement save-from-preview endpoint that persists edited headline/excerpt in `src/api/fetch.py`
- [ ] T034 [US3] Implement discard action that dismisses preview and resets form in `src/static/add_form.html`

**Checkpoint**: All user stories complete — full add-entry flow with preview is functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T035 [P] Add docstrings and type hints to all modules per Documentation-Driven principle
- [ ] T036 [P] Add README with quickstart instructions for running the service
- [ ] T037 Verify scraper extracts correctly for sample news, blog, and documentation sites (SC-002: 80% success rate)
- [ ] T038 [P] Code cleanup: remove any debug logging, ensure consistent error messages
- [ ] T039 Verify architecture supports plugging in per-domain scrapers without changing UI flow (SC-005)
- [ ] T040 Run full test suite and confirm all tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion
  - Stories can proceed sequentially (P1 → P2 → P3) or in parallel if staffed
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — extends US1 with loading feedback
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — extends US1 with preview step

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Test-First, NON-NEGOTIABLE)
- Models before services
- Services before endpoints/UI
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] (T006–T010) can run in parallel
- Once Foundational phase completes, all user stories can start in parallel
- All tests within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different agents

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for URL validation in tests/unit/test_url_validation.py"
Task: "Unit test for Entry model in tests/unit/test_entry_model.py"
Task: "Unit test for generic HTML scraper in tests/unit/test_scraping.py"
Task: "Unit test for fetch client in tests/unit/test_fetch_client.py"
Task: "Integration test for full fetch-and-save flow in tests/integration/test_fetch_and_save.py"

# Launch implementation after tests fail:
Task: "Implement fetch service in src/services/fetch_service.py"
Task: "Implement web endpoint for URL fetch in src/api/fetch.py"
Task: "Implement web UI add form in src/static/add_form.html"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently end-to-end
5. Demo: paste URL → fetch → entry appears in list

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Demo (MVP!)
3. Add User Story 2 → Test independently → Demo (loading feedback)
4. Add User Story 3 → Test independently → Demo (preview before save)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers/agents:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Agent A: User Story 1
   - Agent B: User Story 2
   - Agent C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (Test-First, NON-NEGOTIABLE per constitution)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
