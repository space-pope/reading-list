-- Rename excerpt column to description
ALTER TABLE entries RENAME COLUMN excerpt TO description;

-- Rebuild FTS5 search index with auto-sync (no manual triggers)
DROP TABLE IF EXISTS entries_fts;

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    title, description,
    content='entries',
    content_rowid='id'
);
