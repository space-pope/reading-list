# Implementation Plan: Fallback Extractor & Reader Display

**Branch**: `004-fallback-extractor-reader-display` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-fallback-extractor-reader-display/spec.md`

## Summary

Add fallback headline extraction using `<title>` tag when trafilatura fails, and update the reader display to show headline (truncated), excerpt (smaller font, truncated), and URL with proper visual hierarchy. The extractor will gracefully handle cases where trafilatura returns empty results, falling back to `<title>` tag or a generic "Untitled" fallback. The display layer will truncate headlines and excerpts with proper styling.

## Technical Context

**Language/Version**: Python 3.11 (backend), HTML/CSS/JavaScript (frontend)

**Primary Dependencies**: trafilatura (HTML extraction), Flask (web framework), SQLite (database)

**Storage**: SQLite database stores extracted headlines/excerpts; CSS handles display truncation

**Testing**: Manual validation via quickstart.md scenarios

**Target Platform**: Local web server at 127.0.0.1:3000

**Project Type**: Web service with CLI interface

**Performance Goals**: Fallback extraction adds <10ms; page renders 100 entries in <200ms

**Constraints**: Single-user, localhost-only

**Implementation Approach**:
- Update `GenericExtractor.extract()` to detect empty headline and fall back to `<title>` tag parsing
- Add `<title>` tag extraction using simple regex or HTML parser
- Update `fetch_service.py` to use fallback instead of raising error on empty results
- Update `index.html` template to display headline, excerpt (with "[no excerpt available]" fallback), and URL
- Add CSS classes for headline/excerpt/URL visual hierarchy
- Add configurable truncation setting (stored in localStorage or as a constant)

## Constitution Check

### I. User-First Design
- **Compliant**: Every reading list entry must have a headline to be useful. Fallback ensures no entries appear broken.

### II. Documentation-Driven
- **Compliant**: This plan documents approach before implementation.

### III. Test-First (NON-NEGOTIABLE)
- **NOTE**: No test framework configured. Manual validation via quickstart.md.

### IV. Accessibility
- **Compliant**: Visual hierarchy (headline > excerpt > URL) helps all users. No ARIA changes needed.

### V. Simplicity / YAGNI
- **Compliant**: Uses existing trafilatura + simple `<title>` parsing. No new dependencies.

**Gates**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-fallback-extractor-reader-display/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Title tag parsing approach
├── data-model.md        # Phase 1: Entry model changes
├── quickstart.md        # Phase 1: Validation scenarios
└── tasks.md             # Phase 2: Implementation tasks
```

### Source Code (modified files)

```text
reading_list/
├── fetcher/
│   └── extractor.py          # MODIFY: Add <title> fallback when trafilatura returns empty
├── services/
│   └── fetch_service.py      # MODIFY: Use fallback instead of raising error
└── web/
    ├── templates/
    │   └── index.html         # MODIFY: Display headline/excerpt/URL with proper styling
    └── static/
        └── style.css          # MODIFY: Add headline/excerpt/URL CSS classes
```

**Structure Decision**: Minimal changes — only modify extractor logic and update templates. No new files, no database changes, no API changes.

## Complexity Tracking

> Not applicable — no constitution violations.

### Complexity: Low

1. **Extractor logic**: Add `<title>` parsing and fallback — straightforward
2. **Fetch service**: Change error handling to use fallback — simple
3. **Templates**: Update display with proper styling — CSS work
4. **No new dependencies**: Uses existing tools (trafilatura, CSS)
