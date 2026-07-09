# Research: Title Tag Fallback Extraction

**Feature**: 004 — Fallback Extractor & Reader Display

## Research Tasks

### 1. How to extract `<title>` tag from HTML?

**Decision**: Use simple regex `r'<title[^>]*>(.*?)</title>'` with `re.IGNORECASE | re.DOTALL`.

**Rationale**:
- **vs. BeautifulSoup**: Adds dependency for simple extraction
- **vs. trafilatura**: Already being used; if it fails, we need something lightweight
- **vs. HTMLParser**: More code, no benefit for single tag

Regex is sufficient because:
- `<title>` tags are simple — no nested HTML, no attributes to parse
- We only need the text content
- Error handling wraps the regex in try/except anyway

**Alternatives considered**:
1. **BeautifulSoup**: Overkill for single tag, adds dependency
2. **trafilatura again**: Already failed, would just fail again
3. **HTMLParser**: More complex than regex for this use case

### 2. What to do when both trafilatura and `<title>` fail?

**Decision**: Use generic "Untitled" fallback.

**Rationale**:
- Every entry must have a headline (per spec SC-001)
- "Untitled" is clear that extraction failed
- Domain name could be misleading (e.g., "example.com" for a blog post)

**Alternatives considered**:
1. **URL path**: Could work but often meaningless (e.g., `/index.html`)
2. **First 50 chars of HTML**: Too raw, not user-friendly
3. **Empty string**: Violates spec requirement for non-empty headline

### 3. How to truncate headlines and excerpts for display?

**Decision**: Backend truncation with ellipsis ("...") for headlines; CSS `line-clamp` for excerpts.

**Rationale**:
- **Headlines**: Truncate at configurable length (default 80 chars) — known length, predictable
- **Excerpts**: Use CSS `line-clamp: 3` for responsive truncation — varies by font size/screen

**Alternatives considered**:
1. **CSS-only truncation**: Works but less predictable for headlines
2. **Backend truncation only**: Less flexible for responsive design
3. **Mixed approach**: Best of both — backend for headlines (known length), CSS for excerpts (flexible)

### 4. Should truncation be configurable per-user or global?

**Decision**: Global setting stored in localStorage (client-side).

**Rationale**:
- Single-user app, so no per-user complexity
- localStorage persists across sessions
- Easy to implement — just a setting in the page

**Alternatives considered**:
1. **Database storage**: Overkill for single user
2. **Server-side setting**: Adds backend complexity
3. **No configuration**: Default 80 chars is fine, but users may want to adjust

## Research Conclusion

Simple approach: regex for `<title>`, CSS for display truncation, localStorage for settings. No new dependencies, minimal code changes.
