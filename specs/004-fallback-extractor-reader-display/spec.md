# Feature Specification: Fallback Extractor & Reader Display

**Feature Branch**: `004-fallback-extractor-reader-display`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "Create a fallback extractor that uses a page's `<title>` text as the default headline. Each list item in the reader should display a headline (truncated to fit within a configurable length), an excerpt if available (Also truncated, but the font is smaller, so more text can be displayed) or a '[no excerpt available]' fallback text if not, and the URL."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Fallback headline extraction from `<title>` tag (Priority: P1)

A user adds a URL to the reading list, but the primary extractor (trafilatura) fails to produce a headline — for example, on minimal HTML pages, pages with only a `<title>` tag, or pages where trafilatura returns empty results. The system falls back to the page's `<title>` element text as the headline.

**Why this priority**: Every entry in the reading list must have a readable headline. Empty or missing headlines break the reader experience and make the list unusable.

**Independent Test**: User adds a URL whose HTML contains only a `<title>` tag (no headings, no meta description). The entry is saved with the `<title>` text as the headline.

**Acceptance Scenarios**:

1. **Given** a URL's HTML has a `<title>` tag but trafilatura returns no headline, **When** the URL is fetched and extracted, **Then** the `<title>` text is used as the headline.
2. **Given** a URL's HTML has no `<title>` tag and trafilatura returns no headline, **When** the URL is fetched and extracted, **Then** a generic fallback headline (e.g., "Untitled") is used.
3. **Given** trafilatura successfully extracts a headline, **When** the entry is saved, **Then** the extracted headline is used (fallback is not applied).
4. **Given** the extractor encounters an unexpected error while parsing, **When** extraction runs, **Then** the system falls back to `<title>` or generic fallback instead of raising an error.

---

### User Story 2 — Reader list item displays headline, excerpt, and URL (Priority: P1)

A user opens the reading list and views entries. Each list item shows a headline, an excerpt (if available) in smaller font, and the source URL. The layout is compact and scannable.

**Why this priority**: This is the core reading list experience. Users need to quickly scan entries and decide what to read. Clear visual hierarchy (headline > excerpt > URL) makes the list scannable.

**Independent Test**: User opens the reading list page and verifies each entry displays headline (truncated), excerpt in smaller font (truncated) or "[no excerpt available]", and the URL.

**Acceptance Scenarios**:

1. **Given** an entry has a headline and an excerpt, **When** the user views the reading list, **Then** the headline is displayed first (truncated), followed by the excerpt in smaller font (truncated), then the URL.
2. **Given** an entry has a headline but no excerpt, **When** the user views the reading list, **Then** the headline is displayed (truncated), followed by the text "[no excerpt available]" in place of an excerpt, then the URL.
3. **Given** the headline exceeds the configurable truncation length, **When** the entry is displayed, **Then** the headline is truncated with an ellipsis ("...") at the end.
4. **Given** the excerpt exceeds the display area, **When** the entry is displayed, **Then** the excerpt is truncated with an ellipsis ("...") and rendered in a smaller font size than the headline.
5. **Given** the URL is long, **When** the entry is displayed, **Then** the URL is shown as a clickable link and truncated visually if it overflows, with the full URL accessible on hover.

---

### User Story 3 — Configurable headline truncation length (Priority: P2)

A user wants to control how much of the headline is visible in the reader, adjusting based on screen size or personal preference.

**Why this priority**: Different users have different screen sizes and preferences. Allowing configurable truncation lets users optimize the reading experience without changing the underlying data.

**Independent Test**: User changes the headline truncation length setting from the default (80 characters) to a different value. The reading list updates to reflect the new truncation length on next load.

**Acceptance Scenarios**:

1. **Given** the user sets headline truncation to 60 characters, **When** the reading list loads, **Then** headlines longer than 60 characters are truncated at 60 characters with an ellipsis.
2. **Given** the user sets headline truncation to a very large value (e.g., 500), **When** the reading list loads, **Then** headlines up to 500 characters are displayed in full; only those exceeding 500 are truncated.
3. **Given** the user changes the truncation setting, **When** they navigate away and return, **Then** the new truncation length is applied.
4. **Given** no custom truncation setting exists, **When** the reading list loads, **Then** the default truncation length (80 characters) is used.

---

## Edge Cases

- What happens when the `<title>` tag contains only whitespace or is extremely long (e.g., SEO keyword stuffing)?
- How does the system handle pages that return HTML but no `<title>` tag and no trafilatura extraction?
- What happens if the headline or excerpt contains HTML entities or special characters?
- How are very long URLs handled in the display (truncation vs. wrapping)?
- What if the page fetch succeeds but the HTML is malformed or not valid HTML?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extractor MUST attempt trafilatura extraction as the primary method for headline and excerpt.
- **FR-002**: If trafilatura returns an empty or null headline, the extractor MUST fall back to the HTML `<title>` tag text.
- **FR-003**: If the HTML has no `<title>` tag (or the `<title>` is empty), the extractor MUST use a generic fallback headline (e.g., "Untitled").
- **FR-004**: The fallback headline MUST be stored in the database identically to an extracted headline — no distinction in storage.
- **FR-005**: The reader MUST display each entry with three visual layers: headline (primary), excerpt or fallback text (secondary), and URL (tertiary).
- **FR-006**: Headlines MUST be truncated to a configurable maximum character length (default 80 characters), with an ellipsis ("...") appended when truncated.
- **FR-007**: Excerpts MUST be rendered in a smaller font size than headlines to establish visual hierarchy.
- **FR-008**: Excerpts MUST be truncated when they exceed the available display width or a reasonable character limit.
- **FR-009**: When no excerpt is available, the reader MUST display the literal text "[no excerpt available]" in place of the excerpt section.
- **FR-010**: The URL MUST be displayed as a clickable link for each entry.
- **FR-011**: The headline truncation length MUST be configurable by the user and persist across sessions.
- **FR-012**: The extractor MUST handle malformed HTML, non-HTML responses, and network errors gracefully without crashing the fetch pipeline.

### Key Entities

- **Entry**: Reading list item containing headline (extracted or fallback), excerpt (extracted or empty), URL, source type, and metadata.
- **Headline**: The displayed title for an entry — sourced from trafilatura extraction, `<title>` tag fallback, or generic fallback.
- **Excerpt**: A short description of the page content — sourced from trafilatura extraction, or absent (triggering "[no excerpt available]" display).
- **Display Configuration**: User preference for headline truncation length (integer, default 80, range 20–500).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of fetched URLs produce a non-empty headline (extracted, `<title>`-based, or generic fallback) — no entries in the reading list have blank headlines.
- **SC-002**: When trafilatura fails to extract a headline, the `<title>` tag is used as the headline in 100% of cases where a `<title>` tag is present (verified against test pages with known `<title>` content).
- **SC-003**: Entries with excerpts display them in a visibly smaller font than headlines (confirmed via visual regression or CSS class verification).
- **SC-004**: Entries without excerpts display "[no excerpt available]" text 100% of the time — no blank or missing excerpt sections.
- **SC-005**: Headlines exceeding the configured truncation length are truncated with an ellipsis 100% of the time; headlines within the limit are displayed in full.
- **SC-006**: Changing the headline truncation setting applies to all entries on the next page load, with the new limit respected for all entries.
- **SC-007**: The reading list page renders all entries within 200ms for a list of 100 entries, with fallback headlines included.
- **SC-008**: Fallback extraction ( `<title>` parsing) adds less than 10ms of processing time per URL compared to extraction-only runs.

## Assumptions *(mandatory)*

1. **A-1**: The `<title>` tag is present in the vast majority of web pages (standard HTML practice).
2. **A-2**: Default headline truncation of 80 characters balances readability with compact list layout.
3. **A-3**: Excerpts are truncated visually via CSS (line clamping or character limit) rather than pre-truncated in the backend.
4. **A-4**: The "[no excerpt available]" fallback text is acceptable as-is for v1; localization can be added later.
5. **A-5**: The app is single-user, so truncation settings are stored globally (no per-user complexity).
6. **A-6**: URLs are always valid and fetchable when they reach the display layer (URL validation is handled at fetch time).

## Out of Scope

- Extraction from JSON-LD, Open Graph, or other meta tags (beyond `<title>`).
- User-editable headlines or excerpts.
- Multi-language or localized fallback text.
- Headline quality scoring or relevance ranking.
- Mobile-specific layout adjustments (handled as a separate responsive design effort).

## Open Questions

1. **O-1**: Should the generic fallback headline (when no `<title>` exists) use "Untitled" or the URL's domain name? **Status**: Using "Untitled" as default — domain-based fallback can be added later if users find it more useful.
2. **O-2**: Should excerpt truncation be character-based or line-based (CSS `line-clamp`)? **Status**: Character-based truncation (~200 characters) for consistency and predictability across browsers.
