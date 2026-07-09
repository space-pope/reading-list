# Data Model: Entry & Display Configuration

**Feature**: 004 — Fallback Extractor & Reader Display

## Entry Model

No changes to database schema. The `entries` table already stores `headline`, `excerpt`, `url`, `source_type`, `read`, and timestamps.

### Extraction Result

The extractor now returns `ExtractResult` with fallback logic:

```python
class ExtractResult(TypedDict):
    headline: str   # From trafilatura, <title> fallback, or "Untitled"
    excerpt: str    # From trafilatura or empty string
```

### Extraction Priority

1. **trafilatura extraction** — Primary method (existing logic)
2. **`<title>` tag fallback** — If trafilatura returns empty headline
3. **"Untitled" fallback** — If no `<title>` tag exists

## Display Configuration

### Headline Truncation

- **Default**: 80 characters
- **Storage**: localStorage key `headline-truncation-length` (integer)
- **Range**: 20-500 characters (validated on input)
- **Behavior**: Truncate with ellipsis ("...") if headline exceeds limit

### Excerpt Display

- **CSS**: `line-clamp: 3` for responsive truncation
- **Fallback**: "[no excerpt available]" when excerpt is empty

### Visual Hierarchy

```
Entry Card
├── Headline (16px, bold, max 80 chars)
├── Excerpt (14px, muted, max 3 lines or "[no excerpt available]")
├── URL (12px, muted, clickable)
└── Actions (read/unread, delete, tag)
```

## Database Impact

**None.** No schema changes required. The headline field already exists in the `entries` table.
