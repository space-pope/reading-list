# Research: URL Fetcher + Reading List Viewer

**Date**: 2026-07-04
**Feature**: 001-reading-list-viewer + 002-url-fetcher

---

## Research Item 1: Web Framework Choice

**Decision**: Flask

**Rationale**: Flask is the right fit for a synchronous, template-rendering, single-user CRUD app. It has a uniform pattern for routes, templates, and responses. FastAPI's async advantage is irrelevant for a single-user local service, and forcing async adds unnecessary complexity. FastAPI's strengths (auto OpenAPI docs, Pydantic validation) matter for multi-user API services, not local CRUD apps.

**Alternatives considered**:
- FastAPI — rejected: async requirement adds cognitive overhead for a sync use case; auto-docs and Pydantic are overkill
- Bottle — rejected: smaller ecosystem, Flask's maturity offsets minimal size difference
- Django — rejected: overkill (built-in admin, auth, ORM — none needed)

---

## Research Item 2: HTML Extraction Library

**Decision**: trafilatura

**Rationale**: trafilatura is the clear winner. Single function call (`trafilatura.extract(html, with_metadata=True)`) returns title, description, text, author, date. It's actively maintained (Apache 2.0), has only one dependency (`lxml`), and is benchmarked best on multiple independent evaluations. It handles diverse sites robustly via readability + jusText fusion. For a reading list app, the combination of title + description from OG/meta tags + extracted body text gives rich enough metadata.

**Alternatives considered**:
- beautifulsoup4 + manual DOM rules — rejected: inconsistent quality, relies on sites having good OG tags, no noise filtering
- newspaper3k — rejected: unmaintained for 8+ years, broken on modern Python, heavy dependencies (NLP, system libs)

---

## Research Item 3: SQLite Migration Strategy

**Decision**: Simple `schema_version` table with versioned SQL files and a tiny Python runner

**Rationale**: For a 1-user local SQLite app, the overhead of SQLAlchemy + alembic is disproportionate. The `schema_version` approach gives structure (version tracking, ordered SQL files, audit trail) with zero framework dependency. Rollback is essentially never needed for a single-user local app — if something goes wrong, drop and recreate the DB. Expected schema churn in year one is under 10 migrations.

**Alternatives considered**:
- Alembic + SQLAlchemy — rejected: adds ORM dependency, auto-generate unreliable on SQLite
- Lightweight migration libs — rejected: same trade-off as alembic with less support
- Inline `CREATE TABLE IF NOT EXISTS` — rejected: gets messy by migration #3 with no ordering or audit trail

---

## Research Item 4: Async vs Sync for HTTP Fetching

**Decision**: Synchronous HTTP fetching with `httpx` (sync mode)

**Rationale**: A single-user local service with typically <10 concurrent fetches doesn't need async. The fetch is I/O-bound but the user waits for it anyway (they click Fetch and see a loading state). Sync code is simpler, easier to test, and matches Flask's synchronous model. If performance becomes an issue later, httpx supports async natively so migration is straightforward.

**Alternatives considered**:
- Async with httpx — rejected: adds complexity for negligible benefit at this scale
