-- Fix FTS5: remove manual triggers that conflict with auto-sync
-- This migration runs on existing databases that have the double-sync bug

-- Drop old triggers and FTS5 table
DROP TRIGGER IF EXISTS entries_au;
DROP TRIGGER IF EXISTS entries_ai;
DROP TRIGGER IF EXISTS entries_ad;
DROP TABLE IF EXISTS entries_fts;

-- Recreate FTS5 with auto-sync only (no manual triggers)
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    title, description,
    content='entries',
    content_rowid='id'
);
