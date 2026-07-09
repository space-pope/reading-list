# Feature Specification: URL Fetcher

**Feature Branch**: `002-url-fetcher`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "The service must allow the user to add a new entry. The add button reveals a text field where a URL is pasted and a 'fetch' button; when a URL is pasted and the fetch button clicked, the URL is requested so that a headline / excerpt can be scraped from the site. Site-specific scrapers will eventually be required, but they will be specified later; we just need to be aware of that eventual design to specify this feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Add a URL and get headline/excerpt (Priority: P1)

A user has a URL they want to read later. They click "Add", paste the URL into a text field, click "Fetch", and the system retrieves the page and returns a headline and a short excerpt summarizing the content. The user confirms, and the entry is added to their reading list.

**Why this priority**: This is the primary way new content enters the reading list. Without it, the list stays empty and the service has no purpose.

**Independent Test**: User pastes a valid URL, clicks Fetch, sees extracted headline and excerpt, confirms, and the entry appears in the reading list.

**Acceptance Scenarios**:

1. **Given** the user opens the add dialog, **When** they paste a valid URL into the text field and click Fetch, **Then** the system requests the URL and displays the extracted headline and excerpt for review.
2. **Given** the headline and excerpt are displayed, **When** the user clicks Save, **Then** the entry (with the provided URL, headline, and excerpt) is added to the reading list and appears in the list view.
3. **Given** the headline and excerpt are displayed, **When** the user clicks Cancel, **Then** the dialog closes without saving any entry.
4. **Given** the headline and excerpt are displayed, **When** the user edits the headline or excerpt text, **Then** the edited versions are saved when the user clicks Save.

---

### User Story 2 — Handle invalid or unreachable URLs (Priority: P2)

A user pastes a malformed URL or a URL that returns an error. They need to know what went wrong and have a chance to try again.

**Why this priority**: Users will inevitably paste broken links. The system must provide clear feedback rather than failing silently.

**Independent Test**: User pastes an invalid URL, clicks Fetch, and sees an appropriate error message with an option to retry.

**Acceptance Scenarios**:

1. **Given** the user pastes a malformed URL (e.g., missing scheme), **When** they click Fetch, **Then** an error message is shown explaining the problem and no entry is created.
2. **Given** the user pastes a URL that returns a 404 or connection error, **When** they click Fetch, **Then** an error message is shown and no entry is created.
3. **Given** the user sees an error message, **When** they correct the URL and click Fetch again, **Then** the system retries the request.
4. **Given** the fetched page contains no headline or excerpt content, **When** the user clicks Fetch, **Then** the system displays a message indicating no extractable content was found.

---

### User Story 3 — Support generic HTML extraction for v1 (Priority: P1)

For v1, the system uses a generic HTML extraction strategy that works reasonably well for most sites. The architecture must be designed so that site-specific scrapers can be added later without changing the user flow.

**Why this priority**: The user flow (paste URL → see headline/excerpt) must work on v1. But the system must not be locked into one extraction approach, since site-specific scrapers are an explicit future requirement.

**Independent Test**: User adds entries from multiple different sites (e.g., a blog, a news article, a documentation page) and gets sensible headlines and excerpts from each, using the same flow.

**Acceptance Scenarios**:

1. **Given** a news article page with a clear headline, **When** the user fetches it, **Then** a sensible headline is extracted.
2. **Given** a blog post with body text, **When** the user fetches it, **Then** a representative excerpt (a few sentences from the beginning) is extracted.
3. **Given** a future site-specific scraper is added, **When** the user fetches a URL for that site, **Then** the scraper's extraction overrides the generic one, but the user flow remains unchanged.

---

### Edge Cases

- What happens when the URL points to a non-HTML resource (PDF, image, video)?
- What happens when the fetched page is very large (multi-megabyte HTML)?
- What happens when the site requires login or dynamic client-side rendering that the generic fetcher cannot provide?
- What happens when the URL is a redirect loop?
- What happens when the page's headline is missing entirely (e.g., a minimal or malformed page)?
- What happens when the user pastes the same URL twice? Should duplicate detection run?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an "Add" button in the web interface that reveals a text field and a "Fetch" button.
- **FR-002**: The system MUST accept a URL pasted into the text field and request that URL when the user clicks Fetch.
- **FR-003**: The system MUST extract a headline (title) from the fetched page and display it to the user for review.
- **FR-004**: The system MUST extract a short excerpt (summary) from the fetched page body and display it to the user for review.
- **FR-005**: The system MUST allow the user to edit the extracted headline and excerpt before saving.
- **FR-006**: The system MUST save the entry (URL, headline, excerpt) to the reading list database when the user confirms.
- **FR-007**: The system MUST validate the URL format before attempting to fetch and show an error if the URL is malformed.
- **FR-008**: The system MUST show an error message when the URL cannot be reached or returns an HTTP error, without creating an entry.
- **FR-009**: The system MUST allow the user to cancel the fetch flow without saving any entry.
- **FR-010**: The system MUST use a pluggable extraction strategy so that future site-specific scrapers can be registered and applied per URL without changing the user interface or the generic extraction path.

### Key Entities

- **Entry**: URL (unique identifier), headline (extracted string), excerpt (extracted string, truncated for brevity), source_type (generic or site-specific scraper name), tags (list), read status (boolean), created_at (timestamp), updated_at (timestamp)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A valid URL fetch (from click to displayed headline/excerpt) completes in under 5 seconds for typical web pages.
- **SC-002**: The generic HTML extractor produces a recognizable headline for at least 80% of common content sites (news, blogs, documentation) tested with a representative sample.
- **SC-003**: The generic HTML extractor produces an excerpt of at least 50 characters for at least 80% of tested content sites.
- **SC-004**: The system rejects malformed URLs (missing scheme, invalid format) immediately without making any network request.
- **SC-005**: Adding an entry via fetch-and-save takes fewer than 3 user actions (paste URL, click Fetch, click Save).

## Assumptions

- The service runs on the user's local machine and has internet access to fetch external URLs.
- The generic HTML extraction for v1 uses standard DOM parsing (looking for common headline tags like `<h1>`, `<title>`, Open Graph tags, and the first few paragraphs of body text for the excerpt).
- Site-specific scrapers are a future design concern and will be specified in a later feature; the v1 extraction architecture must be designed to accommodate them via a registry/plugin pattern but no scraper implementations are included.
- The user is a single local user; no authentication or account system is needed for the fetch flow.
- The fetched URL is treated as read-only; the system does not modify the source site.
- Duplicate detection (same URL added twice) is not in scope for this feature — handled in a future feature if needed.
