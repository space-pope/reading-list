CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    source_type TEXT NOT NULL DEFAULT 'generic',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_entries_read ON entries(read);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    title, excerpt,
    content='entries',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(rowid, title, excerpt) VALUES (new.id, new.title, new.excerpt);
END;

CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
    DELETE FROM entries_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
    UPDATE entries_fts SET title = new.title, excerpt = new.excerpt WHERE rowid = new.id;
END;
