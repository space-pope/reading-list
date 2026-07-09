# Data Model: Reading List

**Feature**: 001-reading-list-viewer + 002-url-fetcher
**Date**: 2026-07-04

---

## Schema Version: 1

### Tables

#### `schema_version`

Tracks the current database schema version for migrations.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| version | INTEGER | PRIMARY KEY | Current schema version |

**Initial row**: `version = 1`

---

#### `entries`

Stores reading list entries. Each entry represents a URL the user wants to read.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal ID |
| url | TEXT | NOT NULL, UNIQUE | The URL being tracked |
| title | TEXT | NOT NULL | Headline/title of the page |
| excerpt | TEXT | NOT NULL | Short excerpt/summary |
| read | INTEGER | NOT NULL, DEFAULT 0 | 0 = unread, 1 = read (SQLite has no native boolean) |
| source_type | TEXT | NOT NULL, DEFAULT 'generic' | 'generic' or scraper name (for future site-specific scrapers) |
| created_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp |
| updated_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp (updated on tag/status changes) |

**Indexes**:
- `idx_entries_url` on `url` (UNIQUE, enforced by UNIQUE constraint)
- `idx_entries_read` on `read`
- `idx_entries_created_at` on `created_at` DESC

**Search**: SQLite FTS5 full-text index on `title` and `excerpt` columns (see FTS table below).

---

#### `tags`

Stores tag names. Each tag is a free-form string.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal ID |
| name | TEXT | NOT NULL, UNIQUE | Tag name (case-sensitive) |

---

#### `entry_tags`

Junction table for many-to-many relationship between entries and tags.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| entry_id | INTEGER | NOT NULL, REFERENCES entries(id) ON DELETE CASCADE | |
| tag_id | INTEGER | NOT NULL, REFERENCES tags(id) ON DELETE CASCADE | |

**Composite primary key**: `(entry_id, tag_id)`

---

### FTS5 Full-Text Search Table

```sql
CREATE VIRTUAL TABLE entries_fts USING fts5(
    title,
    excerpt,
    content='entries',
    content_rowid='id'
);
```

Populated via triggers on INSERT/UPDATE/DELETE of `entries`. Used for the search feature (SC-004: search under 100ms).

---

## Migration: v1 Initial Schema

```sql
CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
INSERT INTO schema_version (version) VALUES (1);

CREATE TABLE entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    source_type TEXT NOT NULL DEFAULT 'generic',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE entry_tags (
    entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX idx_entries_read ON entries(read);
CREATE INDEX idx_entries_created_at ON entries(created_at DESC);

CREATE VIRTUAL TABLE entries_fts USING fts5(
    title, excerpt,
    content='entries',
    content_rowid='id'
);

CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(rowid, title, excerpt) VALUES (new.id, new.title, new.excerpt);
END;

CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN
    DELETE FROM entries_fts WHERE rowid = old.id;
END;

CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN
    UPDATE entries_fts SET title = new.title, excerpt = new.excerpt WHERE rowid = new.id;
END;
```

---

## Entity Diagram

```
entries ──M:N── tags
  │
  ├── id (PK)
  ├── url (UNIQUE)
  ├── title
  ├── excerpt
  ├── read (bool)
  ├── source_type
  ├── created_at
  └── updated_at
```

---

## Validation Rules

- `url` must be a valid URL (scheme + host)
- `title` must be non-empty (truncated to 500 chars)
- `excerpt` must be non-empty (truncated to 2000 chars)
- `source_type` must be one of: 'generic', or a registered scraper name (future)
- `entry_tags` cannot reference non-existent entry_id or tag_id (enforced by FK)
- Tag names are case-sensitive and must be non-empty
