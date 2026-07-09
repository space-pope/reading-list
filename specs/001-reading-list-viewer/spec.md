# Feature Specification: Reading List Viewer

**Feature Branch**: `001-reading-list-viewer`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "The service must read a local sqlite database to display a list of URLs / headlines / content excerpts in a quick-to-load web interface."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse reading list (Priority: P1)

A user opens the web interface in their browser and sees a compact text list of their reading items: title, URL, and a short excerpt for each. The page loads quickly with no visual clutter.

**Why this priority**: This is the core value of the feature — seeing the reading list quickly. Without it, nothing else matters.

**Independent Test**: User opens the web URL in a browser and verifies they can see a list of entries with titles, URLs, and excerpts.

**Acceptance Scenarios**:

1. **Given** entries exist in the database, **When** the user opens the web interface, **Then** a list of entries is displayed showing title, URL, and excerpt for each entry.
2. **Given** the database is empty, **When** the user opens the web interface, **Then** an empty-state message is shown (e.g., "No items yet" with a link to import).
3. **Given** the user is viewing entries, **When** they click a URL, **Then** the browser navigates to the linked resource.
4. **Given** entries exist in the database, **When** the user opens the page, **Then** the page loads in under 200ms from initial request.

---

### User Story 2 — Tag and manage entries (Priority: P2)

A user wants to organize and track their reading progress by tagging entries as read/unread and adding personal notes.

**Why this priority**: Tagging transforms a static list into a personal tool. It's the difference between "here's data" and "this works for me."

**Independent Test**: User can mark entries as read, add/edit/delete tags, and see those changes reflected immediately.

**Acceptance Scenarios**:

1. **Given** an entry exists, **When** the user clicks "Mark as read", **Then** the entry's status changes and visual indicator updates (e.g., strikethrough or dimmed text).
2. **Given** an entry exists, **When** the user adds a text tag/note, **Then** the tag is saved and displayed alongside the entry.
3. **Given** an entry has tags, **When** the user edits or removes a tag, **Then** the change is saved and reflected immediately.
4. **Given** entries have tags, **When** the user filters by tag, **Then** only matching entries are shown.

---

### User Story 3 — Search reading list (Priority: P2)

A user has many entries and needs to find specific ones by searching across titles and excerpts.

**Why this priority**: As the list grows, search becomes essential. Without it, the interface becomes unusable at scale.

**Independent Test**: User types a query in the search field and sees filtered results matching title or excerpt content.

**Acceptance Scenarios**:

1. **Given** entries exist, **When** the user types a search query, **Then** entries whose title or excerpt contains the query are shown, others are hidden.
2. **Given** the user clears the search query, **When** they press clear, **Then** all entries are shown again.
3. **Given** a search returns no matches, **When** the user searches, **Then** a "no results" message is displayed.

---

### User Story 4 — Import new entries (Priority: P3)

A user has reading items from other sources (browser bookmarks, RSS exports, manually collected URLs) and needs to get them into the database.

**Why this priority**: The service manages writes, so there must be a way to get data in. Without it, the database stays empty.

**Independent Test**: User provides a new entry (via CLI or web form) and it appears in the database and is visible in the interface.

**Acceptance Scenarios**:

1. **Given** the user submits a new entry with a URL and optional title/excerpt, **When** the submission succeeds, **Then** the entry is stored in the database and appears in the list.
2. **Given** the user submits an entry with an invalid URL, **When** they submit, **Then** an error message is shown and no entry is saved.
3. **Given** the user imports a batch of items (e.g., from a file), **When** the import completes, **Then** all valid items are added and invalid items are reported with reasons.

---

### User Story 5 — Delete entries (Priority: P3)

A user wants to remove entries they no longer need from the reading list.

**Why this priority**: Basic lifecycle management. Users need a way to clean up the list.

**Independent Test**: User deletes an entry and it is removed from both the database and the web interface.

**Acceptance Scenarios**:

1. **Given** an entry exists, **When** the user deletes it, **Then** the entry is removed from the database and no longer appears in the interface.
2. **Given** the user attempts to delete an entry, **When** they confirm deletion, **Then** the entry is permanently removed (with undo confirmation before deletion).

---

### Edge Cases

- What happens when the SQLite database is missing or corrupt on startup?
- How does the system handle entries with extremely long excerpts or titles?
- What happens when the user's browser is offline — does the interface still load?
- How does the system handle concurrent writes from multiple import sources?
- What is the behavior when the database file is locked by another process?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST serve a web interface at a configurable local port (default 8080) accessible via HTTP.
- **FR-002**: The system MUST read entries from a local SQLite database and display them as a text list showing title, URL, and excerpt.
- **FR-003**: The system MUST paginate or lazy-load entries so the initial page renders quickly (under 200ms time-to-first-byte).
- **FR-004**: The system MUST allow users to mark entries as read/unread with visual feedback in the interface.
- **FR-005**: The system MUST allow users to add, edit, and remove text tags/notes on entries.
- **FR-006**: The system MUST support filtering entries by tag.
- **FR-007**: The system MUST support full-text search across entry titles and excerpts.
- **FR-008**: The system MUST allow users to add new entries via CLI and/or web form.
- **FR-009**: The system MUST allow users to delete entries with a confirmation step.
- **FR-010**: The system MUST validate URLs and reject malformed entries on import.
- **FR-011**: The system MUST persist all changes (tags, status, new entries, deletions) to the SQLite database atomically.
- **FR-012**: The system MUST start on localhost only (127.0.0.1) by default, not bind to external interfaces.

### Key Entities

- **Entry**: URL (unique, primary key source), title, excerpt, read status (boolean), tags (list of strings), created_at (timestamp), updated_at (timestamp)
- **Tag**: Name (free-text), associated Entry IDs (many-to-many)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The web interface loads and renders the first page of entries in under 200ms from the initial HTTP request.
- **SC-002**: The interface displays 500+ entries without noticeable slowdown in page load time or scroll responsiveness.
- **SC-003**: Users can mark entries as read/unread and add tags within 1 click per action, with changes persisted immediately.
- **SC-004**: Search queries return results in under 100ms for databases containing up to 10,000 entries.
- **SC-005**: Importing 100 entries via CLI completes in under 5 seconds.
- **SC-006**: 100% of database writes are atomic — a crash during write cannot leave partial or corrupted data.

## Assumptions

- The service runs on a single user's local machine (no multi-user or authentication needs).
- The SQLite database is stored at `~/.reading-list/db.sqlite` by default.
- The service binds to `127.0.0.1:8080` by default (configurable via CLI flag or env var).
- Excerpts are pre-computed and stored in the database during ingest (not generated on-the-fly at read time) to ensure fast page loads.
- The service supports one user, so no session management or account system is needed.
- Tag names are free-form text (not a predefined vocabulary).
- Search is case-insensitive.
