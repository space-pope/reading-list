-- Rename excerpt column to description
ALTER TABLE entries RENAME COLUMN excerpt TO description;

-- Rebuild FTS5 search index to reference 'description' instead of 'excerpt'
DROP TRIGGER IF EXISTS entries_au;
DROP TRIGGER IF EXISTS entries_ai;
DROP TRIGGER IF EXISTS entries_ad;
DROP TABLE IF EXISTS entries_fts;

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    title, description,
    content='entries',
    content_rowid='id'
);

CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(rowid, title, description) VALUES (new.id, new.title, new.description);
END;

CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN
    DELETE FROM entries_fts WHERE rowid = old.id;
END;

CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN
    UPDATE entries_fts SET title = new.title, description = new.description WHERE rowid = new.id;
END;
