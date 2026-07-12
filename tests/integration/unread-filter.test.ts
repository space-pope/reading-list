import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from '../../src/server/app.js'
import { getDatabase, closeDatabase } from '../../src/db/index.js'
import { ensureDbDir } from '../../src/config.js'

const dbPath = '/tmp/reading-list-test-integration.sqlite'
const MIGRATION_SQL = `CREATE TABLE entries (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL UNIQUE, title TEXT NOT NULL, excerpt TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, source_type TEXT NOT NULL DEFAULT 'generic', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))); CREATE TABLE tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE); CREATE TABLE entry_tags (entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (entry_id, tag_id)); CREATE INDEX idx_entries_read ON entries(read); CREATE INDEX idx_entries_created_at ON entries(created_at DESC); CREATE VIRTUAL TABLE entries_fts USING fts5(title, excerpt, content='entries', content_rowid='id'); CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN INSERT INTO entries_fts(rowid, title, excerpt) VALUES (new.id, new.title, new.excerpt); END; CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN DELETE FROM entries_fts WHERE rowid = old.id; END; CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN UPDATE entries_fts SET title = new.title, excerpt = new.excerpt WHERE rowid = new.id; END; CREATE TABLE schema_version (version INTEGER NOT NULL);`

describe('GET / — view parameter (integration)', () => {
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

  function insertTaggedEntry(url: string, title: string, excerpt: string, read: number, tag: string): void {
    const db = getDatabase(dbPath)
    db.prepare(`INSERT INTO entries (url, title, excerpt, read, source_type) VALUES (?, ?, ?, ?, 'generic')`).run(url, title, excerpt, read)
    let tagId = db.prepare(`SELECT id FROM tags WHERE name = ?`).get(tag) as { id: number } | undefined
    if (!tagId) {
      tagId = { id: db.prepare(`INSERT INTO tags (name) VALUES (?)`).run(tag).lastInsertRowid as number }
    }
    db.prepare(`INSERT INTO entry_tags (entry_id, tag_id) VALUES ((SELECT id FROM entries WHERE url = ?), ?)`).run(url, tagId.id)
  }

  it('view=unread filters correctly', async () => {
    insertEntry('http://example.com/1', 'Read Item', 'R', 1)
    insertEntry('http://example.com/2', 'Unread Item', 'U', 0)
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/?view=unread' })
    await app.close()
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('Unread Item')
    expect(res.body).not.toContain('Read Item')
  })

  it('view + search composes correctly', async () => {
    insertEntry('http://example.com/1', 'TypeScript Article', 'TS is great', 1)
    insertEntry('http://example.com/2', 'TypeScript Guide', 'Learn TS', 0)
    insertEntry('http://example.com/3', 'Python Article', 'Python rocks', 0)
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/?view=unread&q=typescript' })
    await app.close()
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('TypeScript Guide')
    expect(res.body).not.toContain('TypeScript Article')
    expect(res.body).not.toContain('Python Article')
  })

  it('pagination preserves view parameter', async () => {
    for (let i = 1; i <= 5; i++) {
      insertEntry(`http://example.com/${i}`, `Item ${i}`, `Excerpt ${i}`, i % 2 === 0 ? 1 : 0)
    }
    const app = await createApp()
    const resPage1 = await app.inject({ method: 'GET', url: '/?view=unread&per_page=2&page=1' })
    const resPage2 = await app.inject({ method: 'GET', url: '/?view=unread&per_page=2&page=2' })
    await app.close()
    expect(resPage1.statusCode).toBe(200)
    expect(resPage1.body).toContain('Item 1')
    expect(resPage1.body).toContain('Item 3')
    expect(resPage1.body).not.toContain('Item 5')
    expect(resPage2.statusCode).toBe(200)
    expect(resPage2.body).toContain('Item 5')
    expect(resPage2.body).not.toContain('Item 1')
    expect(resPage2.body).not.toContain('Item 3')
  })

  it('empty unread list shows empty state', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/?view=unread' })
    await app.close()
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('Add')
    expect(res.body).toContain('add')
  })

  it('view=unread with tag filter', async () => {
    insertTaggedEntry('http://example.com/1', 'Tech Read', 'R', 1, 'tech')
    insertTaggedEntry('http://example.com/2', 'Tech Unread', 'U', 0, 'tech')
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/?view=unread&tag=tech' })
    await app.close()
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('Tech Unread')
    expect(res.body).not.toContain('Tech Read')
  })
})
