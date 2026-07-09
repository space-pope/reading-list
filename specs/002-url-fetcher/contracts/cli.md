# CLI Contract

**Feature**: 001-reading-list-viewer + 002-url-fetcher
**Date**: 2026-07-04

---

## Command Structure

```
reading-list <command> [options]
```

Commands use a subcommand pattern. CLI is built with Typer.

---

## Commands

### `reading-list list` — List entries

```
reading-list list [--page N] [--per-page N] [--tag NAME] [--search QUERY]
```

Outputs entries as formatted text to stdout. Default format is a compact one-line-per-entry:

```
[1] https://example.com/article
    "Article Title" — A short excerpt...
    tags: tech, science
    status: unread | read
```

Options:
- `--page N`: Page number (default 1)
- `--per-page N`: Entries per page (default 50)
- `--tag NAME`: Filter by tag
- `--search QUERY`: Search by title/excerpt
- `--json`: Output as JSON instead of formatted text

---

### `reading-list add` — Add an entry

```
reading-list add <url> --title "TITLE" --excerpt "EXCERPT"
```

Add an entry directly with provided metadata. No fetch step.

```
reading-list add <url> --fetch
```

Fetch headline/excerpt from the URL and prompt the user to confirm or edit.

---

### `reading-list delete <id>` — Delete an entry

```
reading-list delete 42
```

Prompts for confirmation: "Delete entry 42? [y/N]"

---

### `reading-list tag <id> <name>` — Add a tag to an entry

```
reading-list tag 42 tech
```

Creates the tag if it doesn't exist.

### `reading-list untag <id> <name>` — Remove a tag from an entry

```
reading-list untag 42 tech
```

---

### `reading-list read <id>` — Mark entry as read

```
reading-list read 42
```

### `reading-list unread <id>` — Mark entry as unread

```
reading-list unread 42
```

---

### `reading-list tags` — List all tags

```
reading-list tags
```

### `reading-list stats` — Show stats

```
reading-list stats
```

Output:
```
Total entries: 150
Unread: 87
Tags: 5 (tech, science, fiction, ... )
Oldest entry: 2026-01-15
Newest entry: 2026-07-04
```

---

## Error Handling

- Invalid commands: show usage help, exit code 1
- Not found: "Entry 42 not found", exit code 1
- Network errors on fetch: "Failed to fetch URL: ...", exit code 1
- Database errors: "Database error: ...", exit code 2

---

## Configuration

Configuration via environment variables or `~/.reading-list/config.toml`:

- `READING_LIST_DB_PATH`: Path to SQLite database (default: `~/.reading-list/db.sqlite`)
- `READING_LIST_PORT`: Web server port (default: 8080)
