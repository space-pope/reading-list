import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getDatabase, closeDatabase } from '../../src/db/index.js'
import { ExportService } from '../../src/services/export.service.js'

const dbPath = '/tmp/reading-list-test-export-service.sqlite'

describe('ExportService', () => {
  beforeEach(() => {
    closeDatabase()
    process.env.READING_LIST_DB_PATH = dbPath
    const db = getDatabase(dbPath)
    db.exec(`
      CREATE TABLE entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        source_type TEXT NOT NULL DEFAULT 'generic',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
      CREATE TABLE entry_tags (
        entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (entry_id, tag_id)
      );
      CREATE INDEX idx_entries_read ON entries(read);
      CREATE INDEX idx_entries_created_at ON entries(created_at DESC);
      CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        page_number TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_notes_entry_id ON notes(entry_id);
      CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
      INSERT INTO schema_version (version) VALUES (3);
    `)
  })

  afterEach(async () => {
    closeDatabase()
    delete process.env.READING_LIST_DB_PATH
    const fs = await import('node:fs')
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  function insertEntry(url: string, title: string, createdAt: string): number {
    const db = getDatabase(dbPath)
    const result = db
      .prepare(`INSERT INTO entries (url, title, description, source_type, created_at) VALUES (?, ?, ?, 'generic', ?)`)
      .run(url, title, '', createdAt)
    return result.lastInsertRowid as number
  }

  function addTag(entryId: number, tagName: string): void {
    const db = getDatabase(dbPath)
    let tagRow = db
      .prepare(`SELECT id FROM tags WHERE name = ?`)
      .get(tagName) as { id: number } | undefined
    if (!tagRow) {
      const result = db.prepare(`INSERT INTO tags (name) VALUES (?)`).run(tagName)
      tagRow = { id: result.lastInsertRowid as number }
    }
    db.prepare(`INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)`).run(entryId, tagRow.id)
  }

  function addNote(entryId: number, content: string, pageNumber: string | null, createdAt: string): void {
    const db = getDatabase(dbPath)
    db.prepare(`INSERT INTO notes (entry_id, content, page_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
      entryId, content, pageNumber, createdAt, createdAt
    )
  }

  it('generates markdown with entries sorted newest-first', () => {
    const oldestId = insertEntry('http://example.com/oldest', 'Oldest Entry', '2026-01-01T00:00:00.000Z')
    const newestId = insertEntry('http://example.com/newest', 'Newest Entry', '2026-06-01T00:00:00.000Z')
    addNote(oldestId, 'oldest note', null, '2026-01-01T00:00:00.000Z')
    addNote(newestId, 'newest note', null, '2026-06-01T00:00:00.000Z')

    const service = new ExportService()
    const markdown = service.generateExportMarkdown()

    const newestIndex = markdown.indexOf('# Newest Entry')
    const oldestIndex = markdown.indexOf('# Oldest Entry')
    expect(newestIndex).toBeGreaterThan(-1)
    expect(oldestIndex).toBeGreaterThan(-1)
    expect(newestIndex).toBeLessThan(oldestIndex)
  })

  it('includes tags sorted alphabetically', () => {
    const entryId = insertEntry('http://example.com/tagged', 'Tagged Entry', '2026-01-01T00:00:00.000Z')
    addTag(entryId, 'zebra')
    addTag(entryId, 'alpha')
    addTag(entryId, 'mid')
    addNote(entryId, 'a note', null, '2026-01-01T00:00:00.000Z')

    const service = new ExportService()
    const markdown = service.generateExportMarkdown()

    expect(markdown).toContain('tags: alpha, mid, zebra')
  })

  it('shows "none" when entry has no tags', () => {
    const entryId = insertEntry('http://example.com/notagged', 'No Tags Entry', '2026-01-01T00:00:00.000Z')
    addNote(entryId, 'a note', null, '2026-01-01T00:00:00.000Z')

    const service = new ExportService()
    const markdown = service.generateExportMarkdown()

    expect(markdown).toContain('tags: none')
  })

  it('includes page number in parentheses when present', () => {
    const entryId = insertEntry('http://example.com/withpage', 'Paged Entry', '2026-01-01T00:00:00.000Z')
    addNote(entryId, 'Important note', '42', '2026-01-01T00:00:00.000Z')

    const service = new ExportService()
    const markdown = service.generateExportMarkdown()

    expect(markdown).toContain('- Important note (42)')
  })

  it('omits parentheses when page number is null', () => {
    const entryId = insertEntry('http://example.com/nopage', 'No Page Entry', '2026-01-01T00:00:00.000Z')
    addNote(entryId, 'Simple note', null, '2026-01-01T00:00:00.000Z')

    const service = new ExportService()
    const markdown = service.generateExportMarkdown()

    expect(markdown).toContain('- Simple note\n')
    expect(markdown).not.toContain('(null)')
  })

  it('excludes entries with zero notes', () => {
    insertEntry('http://example.com/nonotes', 'No Notes Entry', '2026-01-01T00:00:00.000Z')

    const service = new ExportService()
    const markdown = service.generateExportMarkdown()

    expect(markdown).not.toContain('# No Notes Entry')
    expect(markdown).not.toContain('http://example.com/nonotes')
  })

  it('includes only entries with one or more notes', () => {
    const noNotesId = insertEntry('http://example.com/nonotes', 'No Notes Entry', '2026-01-01T00:00:00.000Z')
    const withNotesId = insertEntry('http://example.com/withnotes', 'With Notes Entry', '2026-01-01T00:00:00.000Z')
    addNote(withNotesId, 'A note', null, '2026-01-01T00:00:00.000Z')

    const service = new ExportService()
    const markdown = service.generateExportMarkdown()

    expect(markdown).not.toContain('# No Notes Entry')
    expect(markdown).toContain('# With Notes Entry')
    expect(markdown).toContain('url: http://example.com/withnotes')
    expect(markdown).toContain('- A note')
  })

  it('notes ordered oldest-first within each entry', () => {
    const entryId = insertEntry('http://example.com/notes-order', 'Ordered Notes', '2026-01-01T00:00:00.000Z')
    addNote(entryId, 'First note', null, '2026-01-01T00:00:00.000Z')
    addNote(entryId, 'Second note', null, '2026-01-02T00:00:00.000Z')
    addNote(entryId, 'Third note', null, '2026-01-03T00:00:00.000Z')

    const service = new ExportService()
    const markdown = service.generateExportMarkdown()

    const firstIdx = markdown.indexOf('First note')
    const secondIdx = markdown.indexOf('Second note')
    const thirdIdx = markdown.indexOf('Third note')
    expect(firstIdx).toBeLessThan(secondIdx)
    expect(secondIdx).toBeLessThan(thirdIdx)
  })

  it('empty database returns empty string', () => {
    const service = new ExportService()
    const markdown = service.generateExportMarkdown()
    expect(markdown).toBe('')
  })

  it('includes URL in output', () => {
    const entryId = insertEntry('http://example.com/specific-url', 'URL Entry', '2026-01-01T00:00:00.000Z')
    addNote(entryId, 'a note', null, '2026-01-01T00:00:00.000Z')

    const service = new ExportService()
    const markdown = service.generateExportMarkdown()

    expect(markdown).toContain('url: http://example.com/specific-url')
  })
})
