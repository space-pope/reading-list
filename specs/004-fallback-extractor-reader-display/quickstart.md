# Quickstart: Fallback Extractor & Reader Display

**Feature**: 004 — Fallback Extractor & Reader Display

## Prerequisites

- Reading list web server running at `http://127.0.0.1:3000`
  - Start with: `python -m reading_list.main --serve`
- A browser to view the reading list

## Validation Scenarios

### V1 — Fallback to <title> tag when trafilatura fails

1. Find or create a URL with a `<title>` tag but no readable content (e.g., a minimal HTML page)
2. Add the URL via CLI: `reading-list add "URL" --fetch`
3. **Expected**: The headline is extracted from the `<title>` tag
4. **Expected**: No error message about missing headline/excerpt

### V2 — Generic "Untitled" fallback when no <title> exists

1. Find or create a URL with no `<title>` tag (extremely rare, but possible)
2. Add the URL via CLI: `reading-list add "URL" --fetch`
3. **Expected**: The headline is "Untitled"
4. **Expected**: Entry is saved successfully

### V3 — Reader displays headline (truncated)

1. Add a URL with a very long headline (100+ characters)
2. Open the reading list in browser
3. **Expected**: Headline is truncated to 80 characters with "..." at the end
4. **Expected**: Truncation is consistent across all entries

### V4 — Reader displays excerpt in smaller font

1. Add a URL with a readable excerpt (trafilatura extraction)
2. Open the reading list in browser
3. **Expected**: Excerpt is displayed in smaller font than headline
4. **Expected**: Excerpt is truncated after ~3 lines or ~200 characters

### V5 — "[no excerpt available]" when excerpt is empty

1. Add a URL that trafilatura cannot extract an excerpt from (e.g., minimal page)
2. Open the reading list in browser
3. **Expected**: The text "[no excerpt available]" is displayed where the excerpt would be
4. **Expected**: No blank space or missing text

### V6 — URL is clickable and truncated

1. Add a URL with a very long path (e.g., `https://example.com/very/long/path/that/exceeds/available/space`)
2. Open the reading list in browser
3. **Expected**: URL is displayed as a clickable link
4. **Expected**: URL is visually truncated if it overflows the entry width
5. **Expected**: Full URL is visible on hover (browser tooltip)

### V7 — Configurable headline truncation

1. Open browser DevTools → Application → Local Storage → `http://127.0.0.1:3000`
2. Add key `headline-truncation-length` with value `60`
3. Refresh the reading list page
4. **Expected**: Headlines longer than 60 characters are truncated at 60 characters
5. Remove the localStorage key, refresh, and verify default (80 chars) applies

### V8 — Visual hierarchy is clear

1. Open the reading list in browser
2. **Expected**: Headline is largest text (16px, bold)
3. **Expected**: Excerpt is smaller (14px, muted color)
4. **Expected**: URL is smallest (12px, muted color)
5. **Expected**: Visual hierarchy makes it easy to scan entries

### V9 — Performance with fallback headlines

1. Add 10 URLs that require fallback extraction (no trafilatura headline)
2. Open the reading list in browser
3. **Expected**: Page loads in <200ms (no performance degradation from fallback)

## Edge Cases

### EC1 — Whitespace-only <title> tag

1. Add URL with `<title>   </title>` (whitespace only)
2. **Expected**: Falls through to "Untitled" (not empty string)

### EC2 — Very long <title> tag (SEO stuffing)

1. Add URL with `<title>` containing 500+ characters of keywords
2. **Expected**: Headline is truncated to 80 characters (or configured length)

### EC3 — HTML entities in headline

1. Add URL with headline containing `&amp;`, `&lt;`, etc.
2. **Expected**: Headline displays with entities decoded (e.g., "&" not "&amp;")

### EC4 — Malformed HTML

1. Add URL with malformed HTML (unclosed tags, invalid structure)
2. **Expected**: Fallback extractor handles gracefully, no crash
3. **Expected**: Either `<title>` is extracted or "Untitled" is used

## Accessibility

### A1 — Headline is readable

1. Use browser accessibility inspector
2. **Expected**: Headline is associated with the entry (not just decorative)

### A2 — URL is keyboard accessible

1. Tab through the reading list entries
2. **Expected**: URLs are focusable and clickable via keyboard

### A3 — "[no excerpt available]" is not confusing

1. Read the reading list with screen reader
2. **Expected**: "[no excerpt available]" is announced clearly, not confused with actual content
