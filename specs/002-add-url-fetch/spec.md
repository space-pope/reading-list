# Feature Specification: Add URL Fetch

**Feature Branch**: `002-add-url-fetch`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "The service must allow the user to add a new entry. The add button reveals a text field where a URL is pasted and a "fetch" button; when a URL is pasted and the fetch button clicked, the URL is requested so that a headline / excerpt can be scraped from the site. Site-specific scrapers will eventually be required, but they will be specified later; we just need to be aware of that eventual design to specify this feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Add entry via URL fetch (Priority: P1)

A user clicks an "Add" button in the web interface, which reveals a text field and a "Fetch" button. They paste a URL into the field, click "Fetch", and the system retrieves the page, extracts a headline and excerpt, and saves the entry to the reading list.

**Why this priority**: This is the primary ingest mechanism for new reading items. Without it, users cannot add content to their list through the web interface. It directly enables the core value proposition of the reading list service.

**Independent Test**: User clicks "Add", pastes a URL, clicks "Fetch", and verifies that a new entry with a headline and excerpt appears in the reading list.

**Acceptance Scenarios**:

1. **Given** the user is on the reading list page, **When** they click the "Add" button, **Then** a text input field and a "Fetch" button are revealed inline.
2. **Given** the text field contains a valid URL, **When** the user clicks "Fetch", **Then** the system requests the URL, scrapes the headline and excerpt, and saves a new entry to the database.
3. **Given** the fetch succeeds, **When** the entry is saved, **Then** the new entry appears in the reading list with its headline and excerpt displayed.
4. **Given** the text field contains an invalid or unreachable URL, **When** the user clicks "Fetch", **Then** an error message is shown explaining the failure (e.g., "Could not reach the page" or "Invalid URL").
5. **Given** the text field is empty, **When** the user clicks "Fetch", **Then** a validation message is shown prompting them to enter a URL.

---

### User Story 2 — Fetch with loading feedback (Priority: P2)

While the system is fetching and scraping the URL, the user sees visual feedback that work is in progress. They are not left wondering whether the button worked.

**Why this priority**: Network requests can take time. Without feedback, users may click repeatedly or assume the feature is broken, leading to a poor experience.

**Independent Test**: User clicks "Fetch" on a slow-loading URL and observes a loading indicator (spinner, disabled button, or progress text) until the result appears or an error is shown.

**Acceptance Scenarios**:

1. **Given** the user clicks "Fetch", **When** the request is in progress, **Then** the "Fetch" button is disabled and a loading indicator is shown.
2. **Given** the fetch completes (success or failure), **When** the result is ready, **Then** the loading indicator disappears and the button is re-enabled.
3. **Given** the fetch times out, **When** the timeout is reached, **Then** an error message is shown and the button is re-enabled so the user can retry.

---

### User Story 3 — Preview before saving (Priority: P3)

After fetching, the user sees the extracted headline and excerpt in a preview before the entry is finalized. This gives them a chance to verify the scrape was correct or to edit the extracted content.

**Why this priority**: Scraping is imperfect — some sites return unexpected content. A preview step prevents bad data from entering the database and gives the user control.

**Independent Test**: User fetches a URL and sees the extracted headline and excerpt in a preview area; they can edit the text or confirm to save.

**Acceptance Scenarios**:

1. **Given** the fetch succeeds, **When** the result is returned, **Then** the headline and excerpt are displayed in a preview area for the user to review.
2. **Given** the user reviews the preview, **When** they click "Save", **Then** the entry is saved to the database with the (possibly edited) headline and excerpt.
3. **Given** the user reviews the preview, **When** they click "Discard", **Then** the preview is dismissed and no entry is saved.

---

### Edge Cases

- What happens when the URL returns a non-HTML response (e.g., a PDF, image, or API endpoint)?
- How does the system handle pages that require JavaScript rendering to display content?
- What is the behavior when the target site returns a 403/401 (access denied)?
- How does the system handle extremely large pages where scraping could be slow or memory-intensive?
- What happens if the same URL is fetched twice — should duplicates be detected and prevented?
- How does the system handle URLs with international characters or non-standard encodings?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an "Add" button in the web interface that reveals a URL text field and a "Fetch" button when activated.
- **FR-002**: The system MUST validate that the input field contains a well-formed URL before attempting to fetch.
- **FR-003**: The system MUST HTTP GET the provided URL and extract a headline (title) and excerpt (short text summary) from the response.
- **FR-004**: The system MUST display a loading indicator while the fetch request is in progress and disable the "Fetch" button to prevent duplicate submissions.
- **FR-005**: The system MUST show a user-friendly error message when the fetch fails (e.g., unreachable host, invalid URL, non-HTML response, timeout).
- **FR-006**: The system MUST save the fetched entry (URL, headline, excerpt) to the SQLite database upon successful fetch.
- **FR-007**: The system MUST provide a fetch timeout so that unresponsive sites do not hang the interface indefinitely.
- **FR-008**: The design MUST accommodate future site-specific scrapers — the fetch flow should be structured so that scraper logic can be plugged in per-domain without changing the user-facing interaction.

### Key Entities

- **Entry**: URL (unique), headline (scraped title), excerpt (scraped summary text), source (e.g., "url-fetch"), created_at (timestamp)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a new entry by pasting a URL and clicking "Fetch" in under 10 seconds for standard HTML pages on a typical broadband connection.
- **SC-002**: The headline and excerpt are correctly extracted for at least 80% of common news, blog, and documentation sites tested.
- **SC-003**: Invalid or unreachable URLs produce an error message within 3 seconds, not hanging the interface.
- **SC-004**: The fetch flow includes a loading indicator that appears within 200ms of clicking "Fetch" and disappears once the result is ready.
- **SC-005**: The architecture supports adding a new site-specific scraper as a standalone module without modifying the core fetch UI flow.

## Assumptions

- The service runs on a single user's local machine; no authentication or multi-user concerns apply.
- The initial scraping approach uses generic HTML parsing (e.g., extracting `<title>`, meta description, or first paragraphs) — site-specific scrapers are a future enhancement.
- The fetched entry is saved to the same SQLite database used by the existing reading list service.
- The web interface is the primary UI for this feature (CLI fetch is out of scope for this feature but may be added later).
- Duplicate URL detection (preventing the same URL from being added twice) is handled by the database's unique URL constraint.
- The fetch request uses a standard HTTP client with a configurable timeout (default ~10 seconds).
- Non-HTML responses (PDFs, images, etc.) are treated as fetch failures with an appropriate error message.
