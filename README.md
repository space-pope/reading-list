# Reading List

A local reading list manager for articles and web content you want to keep track of. Add URLs, extract titles and excerpts automatically, tag items, and browse your list through a clean web interface or a terminal CLI.

## Features

- **Add entries by URL** — Paste a link and the app fetches the page title and excerpt automatically, or skip straight to manual entry
- **Browse and search** — Paginated list view with full-text search powered by SQLite FTS5
- **Tag your entries** — Create and manage tags to organize your reading list however you like
- **Mark as read/unread** — Track what you've consumed with a simple toggle; read items disappear from the Unread view when marked (default view)
- **Filter by read status** — Use the All / Unread toolbar to switch between viewing all entries or only unread ones; works with search and tags (unread shown by default)
- **Web UI** — Clean, minimal interface with light and dark themes
- **CLI** — Manage your list from the terminal with `npm list`, `add`, `tag`, `read`, `unread`, `delete`, `stats`, and `tags` commands
- **Docker support** — Run it anywhere with a single `docker run` command

## Data Storage

All data lives in a single SQLite database file. By default it's stored at `~/.reading-list/db.sqlite`, but you can change the location with the `READING_LIST_DB_PATH` environment variable.

The database schema consists of three tables:

- **entries** — Each item you add (URL, title, excerpt, read status, timestamps)
- **tags** — A lookup table for tag names (deduplicated)
- **entry_tags** — A many-to-many join table linking entries to tags

Full-text search is handled by an FTS5 virtual table synced to the `entries` table via triggers, so searches stay fast as your list grows.

## Installation

### Docker

The easiest way to run Reading List is with Docker. A pre-built image is available on GitHub Container Registry:

```bash
docker run -d \
  --name reading-list \
  -p 3000:3000 \
  -v reading-list-data:/data \
  ghcr.io/space-pope/reading-list:latest
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The `-v reading-list-data:/data` flag persists your database across container restarts. You can replace it with an absolute host path instead (e.g., `-v /path/to/db:/data`).

Environment variables control the server configuration:

| Variable | Default | Description |
|---|---|---|
| `READING_LIST_DB_PATH` | `/data/db.sqlite` | Path to the SQLite database inside the container |
| `READING_LIST_HOST` | `0.0.0.0` | Host to bind the server to |
| `READING_LIST_PORT` | `3000` | Port the server listens on |

To build the image locally from the Dockerfile:

```bash
docker build -t reading-list .
docker run -d \
  --name reading-list \
  -p 3000:3000 \
  -v reading-list-data:/data \
  reading-list
```

### From source

Requirements: **Node.js 20+** and **npm**.

```bash
git clone <repo-url>
cd reading-list
npm install
npm run build
```

Start the server:

```bash
npm start
```

Or run the CLI:

```bash
npx reading-list list
npx reading-list add "https://example.com/article" --fetch
```

## Development

Build the TypeScript project:

```bash
npm run build          # Compile to dist/
npm run typecheck      # Type-check without emitting
npm test               # Run tests
```

Run the server in development mode (hot-reloads via ts-node):

```bash
npm run dev
```

Configuration is controlled via environment variables:

| Variable | Default | Description |
|---|---|---|
| `READING_LIST_DB_PATH` | `~/.reading-list/db.sqlite` | Location of the SQLite database |
| `READING_LIST_HOST` | `127.0.0.1` | Server bind address (web UI) |
| `READING_LIST_PORT` | `3000` | Server port |
