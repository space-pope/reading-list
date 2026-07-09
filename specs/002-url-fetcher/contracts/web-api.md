# Web API Contract

**Feature**: 001-reading-list-viewer + 002-url-fetcher
**Date**: 2026-07-04

---

## Base URL

```
http://127.0.0.1:8080
```

## Content Types

- All responses: `text/html` (unless noted)
- All error responses: `application/json`

---

## Routes

### 1. GET `/` — Main reading list view

Renders the reading list page with paginated entries.

**Query Parameters**:
- `page` (int, default 1): Page number (1-indexed)
- `per_page` (int, default 50): Entries per page (max 200)
- `tag` (string, optional): Filter by tag name
- `q` (string, optional): Search query (full-text search across title and excerpt)
- `search` (string, optional): Alias for `q`

**Response**: HTML page with entry list.

**Empty state**: When no entries exist, show a message like "No items yet. Add one to get started." with a link/button to the add form.

---

### 2. GET `/add` — Add URL form

Renders the add dialog/form with a URL text field and a Fetch button.

**Response**: HTML form page.

---

### 3. POST `/fetch` — Fetch URL and extract metadata

**Request Body** (form-encoded):
- `url`: string — the URL to fetch

**Response**: `application/json`

**Success** (200):
```json
{
    "url": "https://example.com/article",
    "title": "Article Title",
    "excerpt": "A short excerpt from the article...",
    "fetch_time_ms": 1200
}
```

**Error — invalid URL** (400):
```json
{
    "error": "Invalid URL: missing scheme"
}
```

**Error — fetch failed** (502):
```json
{
    "error": "Failed to fetch URL: connection refused"
}
```

**Error — no extractable content** (422):
```json
{
    "error": "No headline or excerpt could be extracted from this page"
}
```

---

### 4. POST `/entries` — Create a new entry

**Request Body** (form-encoded or JSON):
- `url`: string — the URL (required)
- `title`: string — headline/title (required)
- `excerpt`: string — excerpt text (required)

**Response**: `application/json`

**Success** (201):
```json
{
    "id": 1,
    "url": "https://example.com/article",
    "title": "Article Title",
    "excerpt": "A short excerpt...",
    "read": false,
    "tags": [],
    "created_at": "2026-07-04T12:00:00",
    "updated_at": "2026-07-04T12:00:00"
}
```

**Error — duplicate URL** (409):
```json
{
    "error": "Entry with this URL already exists"
}
```

**Error — invalid data** (400):
```json
{
    "error": "Validation failed",
    "details": {
        "url": "Invalid URL",
        "title": "Title is required"
    }
}
```

---

### 5. PATCH `/entries/{id}` — Update entry

**Request Body** (form-encoded or JSON, all fields optional):
- `title`: string — new title
- `excerpt`: string — new excerpt
- `read`: boolean — read/unread status
- `tags`: list of strings — replacement tag list

**Response**: `application/json` — updated entry

**Error — not found** (404):
```json
{
    "error": "Entry not found"
}
```

---

### 6. DELETE `/entries/{id}` — Delete entry

**Response**: `application/json`

**Success** (200):
```json
{
    "message": "Entry deleted",
    "id": 1
}
```

**Error — not found** (404):
```json
{
    "error": "Entry not found"
}
```

---

### 7. GET `/tags` — List all tags

**Response**: `application/json`
```json
[
    {"id": 1, "name": "tech"},
    {"id": 2, "name": "science"}
]
```

---

### 8. POST `/tags` — Create a tag

**Request Body**:
- `name`: string — tag name

**Response**: `application/json` (201)
```json
{"id": 3, "name": "new-tag"}
```

---

## Notes

- All routes except `/` and `/add` are JSON APIs (used by the frontend JavaScript for interactive features like tagging, search, delete confirmation).
- The main view (`/`) is server-rendered HTML with minimal JavaScript for interactive actions (toggle read, add tag, delete).
- Pagination is server-side (not client-side).
- Search uses SQLite FTS5 against the `entries_fts` virtual table.
