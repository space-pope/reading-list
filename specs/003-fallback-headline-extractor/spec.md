# Feature Specification: Fallback Headline Extractor

**Feature Branch**: `003-fallback-headline-extractor`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "Create a fallback extractor that uses a page's `<title>` text as the default headline. Each list item in the reader should display a headline (truncated to fit within a configurable length), an excerpt if available (Also truncated, but the font is smaller, so more text can be displayed) or a `'[no excerpt available]'` fallback text if not, and the URL."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Fallback headline extraction (Priority: P1)

A user fetches a URL and trafilatura cannot extract a headline (e.g., for minimal HTML pages, JavaScript-rendered content, or pages with no `<h1>`). The system gracefully falls back to the page's `<title>` tag as the headline.

**Why this priority**: Without a headline, the reading list shows broken or empty entries, degrading the user experience. Fallback ensures every entry has a readable title.

**Independent Test**: User adds a URL that lacks a clear headline structure (e.g., a simple page with only `<title>`). The entry displays the `<title>` text as the headline in the reader.

**Acceptance Scenarios**:

1. **Given** a URL's HTML contains a `<title>` tag but no extractable headline via trafilatura, **When** the URL is fetched and extracted, **Then** the `<title>` text is used as the headline.
2. **Given** a URL's HTML has no `<title>` tag, **When** the URL is fetched and extracted, **Then** a generic fallback (e.g., "Untitled" or the URL domain) is used as the headline.
3. **Given** a headline is extracted successfully via trafilatura, **When** the entry is displayed, **Then** the extracted headline is used (not the `<title>`).
4. **Given** the headline is long, **When** the entry is displayed in the reader, **Then** the headline is truncated to a configurable length with an ellipsis ("...").

---

### User Story 2 — Reader display with headline and excerpt (Priority: P1)

A user views their reading list and sees each entry with a headline, optional excerpt, and URL. The layout is compact and scannable.

**Why this priority**: This is the core reading experience. The headline and excerpt help users decide what to read next.

**Independent Test**: User opens the reading list and verifies each entry shows headline (truncated), excerpt (if available, truncated with smaller font), and URL.

**Acceptance Scenarios**:

1. **Given** an entry has a headline and excerpt, **When** the user views the list, **Then** the headline is displayed (truncated), followed by the excerpt in smaller font (truncated), then the URL.
2. **Given** an entry has a headline but no excerpt, **When** the user views the list, **Then** the headline is displayed (truncated), followed by "[no excerpt available]" (or similar fallback text), then the URL.
3. **Given** the headline exceeds the configurable truncation length (default 80 characters), **When** the entry is displayed, **Then** the headline is truncated with an ellipsis ("...") at the end.
4. **Given** the excerpt exceeds the display area (default ~200 characters or 3 lines), **When** the entry is displayed, **Then** the excerpt is truncated with an ellipsis.
5. **Given** the user adjusts the headline truncation length in settings, **When** the page reloads, **Then** headlines are truncated to the new length.

---

### User Story 3 — Configurable truncation settings (Priority: P2)

A user wants to customize how much text is displayed for headlines and excerpts to suit their screen size or preference.

**Why this priority**: Different users prefer different amounts of detail. Configurable truncation lets them optimize the reading experience.

**Independent Test**: User changes the headline truncation length in settings from 80 to 120 characters. The reading list updates to show more text per headline.

**Acceptance Scenarios**:

1. **Given** the user sets headline truncation to 60 characters, **When** the reading list loads, **Then** headlines longer than 60 characters are truncated.
2. **Given** the user sets headline truncation to 200 characters, **When** the reading list loads, **Then** headlines are displayed in full (if under 200 chars) or truncated at 200.
3. **Given** the user adjusts truncation settings, **When** they navigate away and return, **Then** the settings persist.
4. **Given** the user resets truncation to defaults, **When** they view the list, **Then** headlines truncate at 80 characters and excerpts at ~200 characters.

---

## Functional Requirements *(mandatory)*

### FR-1: Fallback Extraction Logic

1. **FR-1.1**: The extractor MUST use trafilatura's extraction as the primary method for headline and excerpt.
2. **FR-1.2**: If trafilatura returns no headline (empty or None), the extractor MUST fall back to the HTML `<title>` tag text.
3. **FR-1.3**: If the HTML has no `<title>` tag, the extractor MUST use a generic fallback (e.g., "Untitled" or the URL domain).
4. **FR-1.4**: The fallback headline MUST be stored in the database the same way as an extracted headline.

### FR-2: Headline Truncation

5. **FR-2.1**: The system MUST truncate headlines to a configurable maximum length (default 80 characters).
6. **FR-2.2**: Truncation MUST add an ellipsis ("...") at the end of truncated headlines.
7. **FR-2.3**: Truncation MUST occur only if the headline exceeds the configured length.
8. **FR-2.4**: The truncation length MUST be stored as a user preference (default 80, configurable 20-500).

### FR-3: Excerpt Display

9. **FR-3.1**: If an excerpt is available (extracted by trafilatura or from fallback logic), it MUST be displayed below the headline.
10. **FR-3.2**: Excerpts MUST be displayed in a smaller font size than headlines (visual hierarchy).
11. **FR-3.3**: Excerpts MUST be truncated to a configurable maximum length (default ~200 characters or 3 lines).
12. **FR-3.4**: If no excerpt is available, the system MUST display "[no excerpt available]" (or localized equivalent) as a fallback.
13. **FR-3.5**: Truncated excerpts MUST add an ellipsis ("...") at the end.

### FR-4: URL Display

14. **FR-4.1**: The URL MUST be displayed below the headline and excerpt for each entry.
15. **FR-4.2**: The URL MUST be a clickable link to the original resource.
16. **FR-4.3**: Long URLs MUST be truncated if they exceed the display width, with the full URL visible on hover (title attribute).

### FR-5: Settings Integration

17. **FR-5.1**: The headline truncation length MUST be configurable via a settings interface.
18. **FR-5.2**: Settings MUST persist across sessions (stored in database or local storage).
19. **FR-5.3**: Default settings MUST apply when no user preferences are set.

---

## Success Criteria *(mandatory)*

### SC-1: Fallback Extraction

1. **SC-1.1**: 100% of fetched URLs have a headline (extracted or fallback), with no empty or null headline values in the database.
2. **SC-1.2**: When trafilatura fails to extract a headline, the `<title>` tag is used 100% of the time (verified via test pages with known `<title>` content).
3. **SC-1.3**: Pages without a `<title>` tag use the generic fallback 100% of the time.

### SC-2: Headline Display

4. **SC-2.1**: Headlines longer than the configured length (default 80 chars) are truncated with an ellipsis 100% of the time.
5. **SC-2.2**: Headlines shorter than or equal to the configured length are displayed in full 100% of the time.
6. **SC-2.3**: Changing the truncation setting from 80 to 120 characters results in headlines being truncated at 120 characters (not 80) on next page load.

### SC-3: Excerpt Display

7. **SC-3.1**: Entries with excerpts display them in smaller font than headlines (visual verification).
8. **SC-3.2**: Entries without excerpts display "[no excerpt available]" 100% of the time (no blank space or missing indicator).
9. **SC-3.3**: Excerpts longer than ~200 characters are truncated with an ellipsis 100% of the time.

### SC-4: Settings

10. **SC-4.1**: User changes to headline truncation length persist across page reloads and browser sessions.
11. **SC-4.2**: Default truncation length (80 characters) applies when no user preference is set.

### SC-5: Performance

12. **SC-5.1**: Fallback extraction adds less than 10ms of processing time per URL (verified via fetch time benchmarks).
13. **SC-5.2**: Reading list page load time remains under 200ms with 100 entries and fallback headlines.

---

## Key Entities *(mandatory)*

| Entity | Description |
|--------|-------------|
| **Entry** | Reading list item with headline (extracted or fallback), excerpt, URL, metadata |
| **Headline** | Displayed title for the entry (extracted via trafilatura, `<title>` fallback, or generic fallback) |
| **Excerpt** | Short description of the page content (extracted via trafilatura, or "[no excerpt available]" fallback) |
| **User Preference** | Truncation settings (headline length, excerpt length) stored per user |

---

## Assumptions *(mandatory)*

1. **A-1**: The `<title>` tag is reliably present in most HTML pages (industry standard).
2. **A-2**: Default headline truncation length of 80 characters provides a good balance between detail and compactness.
3. **A-3**: Default excerpt truncation length of ~200 characters (or 3 lines) fits within typical reading list column widths.
4. **A-4**: The "[no excerpt available]" fallback text is acceptable to users when excerpts are missing.
5. **A-5**: Settings are stored per-user (single-user app, so effectively global).

---

## Out of Scope

- Extraction of headlines from JSON-LD or Open Graph meta tags (out of scope for v1).
- Multi-language headline extraction (assumes English/localized content handled by trafilatura).
- Headline quality scoring or ranking.
- User-generated headlines (only system-extracted or fallback).

---

## Open Questions

1. **O-1**: Should the fallback text "[no excerpt available]" be localized? **Status**: Assume English for v1, extensible later.
2. **O-2**: Should the generic headline fallback (when no `<title>` tag) use the URL domain or "Untitled"? **Status**: Use "Untitled" as default, configurable later if needed.
