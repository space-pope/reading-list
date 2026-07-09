# Implementation Plan: URL Fetcher + Reading List Viewer

**Branch**: `002-url-fetcher` | **Date**: 2026-07-04 | **Spec**: [001-reading-list-viewer](../001-reading-list-viewer/spec.md) + [002-url-fetcher](../002-url-fetcher/spec.md)

**Input**: Two feature specs — Reading List Viewer (browse/tag/search) and URL Fetcher (add entries with headline/excerpt scraping).

**Note**: This plan covers both features as they are tightly coupled: the fetcher populates the data the viewer reads.

## Summary

The Reading List service is a local web app that reads entries from a SQLite database and displays them in a fast-loading text-list interface. Users can browse, tag, search, delete entries, and add new ones via a fetch flow that scrapes a URL's headline and excerpt. The service is a single-user, localhost-only tool with CLI and web UI.

## Technical Context

**Language/Version**: Python 3.11+

**Primary Dependencies**: 
- Web framework: Flask (sync, template rendering, single-user)
- HTML extraction: trafilatura (best-in-class headline/excerpt extraction, Apache 2.0, single dep `lxml`)
- HTTP client: httpx (sync mode, sufficient for single-user)
- Database: sqlite3 (stdlib), schema_version table + versioned SQL files for migrations
- CLI: typer

**Storage**: SQLite database at `~/.reading-list/db.sqlite`

**Testing**: pytest (sync, no asyncio needed)

**Target Platform**: Local desktop — macOS, Linux, Windows (single user)

**Project Type**: Web service + CLI tool (local, single-user)

**Performance Goals**: 
- Page load under 200ms (SC-001 from viewer spec)
- URL fetch under 5 seconds (SC-001 from fetcher spec)
- Search under 100ms for 10k entries (SC-004 from viewer spec)

**Constraints**: 
- localhost only (127.0.0.1)
- No authentication
- Single user
- SQLite (no external DB server)
- Simple text UI (no heavy frontend framework)

**Scale/Scope**: 1 user, up to 10k entries, one device

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|------------|-------|
| I. User-First Design | PASS | Features driven by user stories; browse/tag/search/add all mapped to user journeys |
| II. Documentation-Driven | PASS | Will document module interfaces before implementation; docstrings required |
| III. Test-First (NON-NEGOTIABLE) | PASS | Every FR has acceptance scenarios; tests written before code |
| IV. Accessibility | PASS | Text-based UI, machine-parseable data, keyboard-navigable interface |
| V. Simplicity/YAGNI | PASS | Generic HTML extraction for v1; site-specific scrapers deferred |
| Data & Storage Rules | PASS | SQLite used with schema definition; migrations planned |

**Gates**: All pass. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-url-fetcher/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: resolved technical decisions
├── data-model.md        # Phase 1: schema, entities, migration SQL
├── quickstart.md        # Phase 1: 10 validation scenarios
├── contracts/
│   ├── web-api.md       # Web API routes (8 endpoints)
│   └── cli.md           # CLI commands (9 subcommands)
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
reading_list/
├── __init__.py
├── main.py              # App entry point
├── config.py            # Configuration (port, db path)
├── db/
│   ├── __init__.py
│   ├── database.py      # Connection management, migrations
│   └── migrations.py    # Schema versioning
├── models/
│   ├── __init__.py
│   └── entry.py         # Entry data model
├── services/
│   ├── __init__.py
│   ├── list_service.py  # CRUD for entries
│   ├── tag_service.py   # Tag management
│   └── search_service.py # Search across entries
├── fetcher/
│   ├── __init__.py
│   ├── http_client.py   # URL fetching
│   ├── extractor.py     # Generic HTML extraction
│   └── registry.py      # Pluggable scraper registry
├── cli/
│   ├── __init__.py
│   └── commands.py      # CLI interface (add, list, delete)
└── web/
    ├── __init__.py
    ├── app.py           # Web app setup
    ├── routes.py        # HTTP route handlers
    ├── templates/       # HTML templates
    └── static/          # CSS/JS (minimal)

tests/
├── conftest.py
├── unit/
│   ├── test_entry.py
│   ├── test_extractor.py
│   └── test_search.py
├── integration/
│   ├── test_list_api.py
│   └── test_fetch_flow.py
└── contract/
    └── test_web_api.py
```

**Structure Decision**: Single-project layout. The service is a local web app with CLI — no need to split into frontend/backend since the UI is server-rendered HTML served from the same process.

## Complexity Tracking

> No constitution violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Pluggable scraper registry (FR-010) | Required by spec for future site-specific scrapers | Direct function calls would lock us into one extraction strategy |

## Phase 0: Research — COMPLETE

### Decisions (resolved)

1. **Web framework**: Flask (sync, template rendering, simpler for single-user app than FastAPI)
2. **HTML extraction**: trafilatura (best headline/excerpt quality, Apache 2.0, one dep `lxml`, single function call)
3. **SQLite migrations**: schema_version table + versioned SQL files (zero framework dep, simple for 1-user app)
4. **Async vs sync**: Sync (single-user, no concurrency benefit, simpler code)

**Research artifact**: `research.md`

## Phase 1: Design & Contracts — COMPLETE

### Data Model

**Artifact**: `data-model.md`

Full entity definitions with schema, indexes, FTS5 search, and migration SQL.

Key entities:
- **Entry**: id (auto), url (unique), title, excerpt, source_type, read (bool), created_at, updated_at
- **Tag**: id (auto), name (unique)
- **entry_tags**: junction table (many-to-many)
- **entries_fts**: FTS5 virtual table for full-text search

### Contracts

**Artifacts**: `contracts/web-api.md`, `contracts/cli.md`

- Web API: 8 routes (list, add, fetch, create, update, delete, tags list, tag create)
- CLI: 9 commands (list, add, delete, tag, untag, read, unread, tags, stats)

### Quickstart

**Artifact**: `quickstart.md`

10 validation scenarios (V1-V10) covering browse, fetch, CLI, tag/filter, read/unread, search, delete, error handling, performance, and stats.
