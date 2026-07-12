import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from '../../src/server/app.js'
import { getDatabase, closeDatabase } from '../../src/db/index.js'
import { ensureDbDir } from '../../src/config.js'

const dbPath = '/tmp/reading-list-test-contract.sqlite'
const MIGRATION_SQL = `CREATE TABLE entries (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL UNIQUE, title TEXT NOT NULL, excerpt TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, source_type TEXT NOT NULL DEFAULT 'generic', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))); CREATE TABLE tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE); CREATE TABLE entry_tags (entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (entry_id, tag_id)); CREATE INDEX idx_entries_read ON entries(read); CREATE INDEX idx_entries_created_at ON entries(created_at DESC); CREATE VIRTUAL TABLE entries_fts USING fts5(title, excerpt, content='entries', content_rowid='id'); CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN INSERT INTO entries_fts(rowid, title, excerpt) VALUES (new.id, new.title, new.excerpt); END; CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN DELETE FROM entries_fts WHERE rowid = old.id; END; CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN UPDATE entries_fts SET title = new.title, excerpt = new.excerpt WHERE rowid = new.id; END; CREATE TABLE schema_version (version INTEGER NOT NULL);`

describe('GET / — view parameter (contract)', () => {
  beforeEach(() => {
    closeDatabase()
    process.env.READING_LIST_DB_PATH = dbPath
    const db = getDatabase(dbPath)
    db.exec(MIGRATION_SQL)
  })

  afterEach(async () => {
    closeDatabase()
    delete process.env.READING_LIST_DB_PATH
    const fs = await import('node:fs')
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  function insertEntry(url: string, title: string, excerpt: string, read: number): void {
    const db = getDatabase(dbPath)
    db.prepare(`INSERT INTO entries (url, title, excerpt, read, source_type) VALUES (?, ?, ?, ?, 'generic')`).run(url, title, excerpt, read)
  }

  it('returns all entries when view=all', async () => {
    insertEntry('http://example.com/1', 'All Entry', 'Excerpt 1', 1)
    insertEntry('http://example.com/2', 'Unread Entry', 'Excerpt 2', 0)
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/?view=all' })
    await app.close()
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('All Entry')
    expect(res.body).toContain('Unread Entry')
  })

  it('returns only unread entries when view=unread', async () => {
    insertEntry('http://example.com/1', 'Read Entry', 'Excerpt 1', 1)
    insertEntry('http://example.com/2', 'Unread Entry', 'Excerpt 2', 0)
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/?view=unread' })
    await app.close()
    expect(res.statusCode).toBe(200)
    expect(res.body).not.toContain('Read Entry')
    expect(res.body).toContain('Unread Entry')
  })

  it('defaults to unread (no view param)', async () => {
    insertEntry('http://example.com/1', 'Read Entry', 'Excerpt 1', 1)
    insertEntry('http://example.com/2', 'Unread Entry', 'Excerpt 2', 0)
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/' })
    await app.close()
    expect(res.statusCode).toBe(200)
    expect(res.body).not.toContain('Read Entry')
    expect(res.body).toContain('Unread Entry')
  })

  it('defaults to unread for invalid view value', async () => {
    insertEntry('http://example.com/1', 'Read Entry', 'Excerpt 1', 1)
    insertEntry('http://example.com/2', 'Unread Entry', 'Excerpt 2', 0)
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/?view=invalid' })
    await app.close()
    expect(res.statusCode).toBe(200)
    expect(res.body).not.toContain('Read Entry')
    expect(res.body).toContain('Unread Entry')
  })

  it('passes view variable to template context', async () => {
    insertEntry('http://example.com/1', 'Test Entry', 'Excerpt', 0)
    const app = await createApp()
    const resUnread = await app.inject({ method: 'GET', url: '/?view=unread' })
    const resAll = await app.inject({ method: 'GET', url: '/' })
    await app.close()
    expect(resUnread.statusCode).toBe(200)
    expect(resAll.statusCode).toBe(200)
  })
})
