# Quickstart: Validation Guide

**Feature**: 001-reading-list-viewer + 002-url-fetcher
**Date**: 2026-07-04

---

## Prerequisites

- Python 3.11+
- pip or uv for installing dependencies
- A web browser (for UI testing)

---

## Setup

```bash
# Install dependencies
pip install flask httpx trafilatura typer

# Run the app (starts web server on 127.0.0.1:8080)
python -m reading_list.main
```

The app creates `~/.reading-list/db.sqlite` on first run.

---

## Validation Scenarios

### V1 — Browse empty list

**Goal**: Verify the main view renders correctly with no data.

**Steps**:
1. Start the app: `python -m reading_list.main`
2. Open `http://127.0.0.1:8080/` in a browser
3. Verify you see an empty-state message (e.g., "No items yet")

**Expected**: Page loads, shows empty state with an "Add" button or link.

---

### V2 — Add entry via fetch flow

**Goal**: Verify the URL fetch and extract flow works end-to-end.

**Steps**:
1. Click "Add" on the main page
2. Paste a real URL (e.g., a news article or blog post)
3. Click "Fetch"
4. Verify headline and excerpt are extracted and displayed
5. Edit the headline or excerpt if desired
6. Click "Save"
7. Verify the entry appears in the reading list

**Expected**:
- Fetch completes in under 5 seconds (SC-001)
- Headline is recognizable and correct (SC-002)
- Excerpt is at least 50 characters (SC-003)
- Entry appears in the list view immediately

---

### V3 — Add entry via CLI

**Goal**: Verify the CLI add command works.

**Steps**:
```bash
python -m reading_list.main add "https://example.com" --title "Example" --excerpt "A test entry"
python -m reading_list.main list
```

**Expected**: Entry appears in the list output.

---

### V4 — Tag and filter

**Goal**: Verify tagging and filter functionality.

**Steps**:
1. Via CLI: `python -m reading_list.main tag 1 tech`
2. Reload the web page
3. Verify the entry shows tag "tech"
4. Filter by tag (URL parameter `?tag=tech` or UI filter)
5. Verify only tagged entries show

**Expected**: Tag appears on the entry, filter narrows the list correctly.

---

### V5 — Mark as read/unread

**Goal**: Verify read status toggling.

**Steps**:
1. Via CLI: `python -m reading_list.main read 1`
2. Verify the entry shows as "read" in the web view
3. Via CLI: `python -m reading_list.main unread 1`
4. Verify the entry shows as "unread" again

**Expected**: Status toggles correctly, persisted immediately (SC-003).

---

### V6 — Search

**Goal**: Verify full-text search works.

**Steps**:
1. Add several entries with different titles/excerpts
2. Enter a search query in the web interface search box
3. Verify only matching entries are shown

**Expected**: Search returns results in under 100ms for small databases (SC-004).

---

### V7 — Delete entry

**Goal**: Verify entry deletion.

**Steps**:
1. Via CLI: `python -m reading_list.main delete 1` (confirm when prompted)
2. Verify the entry no longer appears in the list
3. Re-run `list` — entry should be gone

**Expected**: Entry is permanently removed from database and UI.

---

### V8 — Invalid URL handling

**Goal**: Verify error handling for bad URLs.

**Steps**:
1. Open add form
2. Paste a malformed URL (e.g., `not-a-url`)
3. Click Fetch
4. Verify an error message is shown

**Expected**: Error message displayed, no entry created, no crash.

---

### V9 — Performance — page load time

**Goal**: Verify page load is fast (SC-001).

**Steps**:
1. Add 100+ entries via CLI loop
2. Open `http://127.0.0.1:8080/` in browser
3. Measure time from navigation to first paint

**Expected**: Under 200ms time-to-first-byte (SC-001).

---

### V10 — Stats

**Goal**: Verify stats command.

**Steps**:
```bash
python -m reading_list.main stats
```

**Expected**: Output showing total entries, unread count, tag count, date range.

---

## Running All Scenarios

```bash
# Quick validation script (run after setup)
python -m reading_list.main stats
curl -s http://127.0.0.1:8080/ | head -20  # Verify HTML renders
python -m reading_list.main list            # Verify list command
```

## Cleanup

```bash
# Remove the database to start fresh
rm ~/.reading-list/db.sqlite
```
