import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from '../../src/server/app.js'
import { getDatabase, closeDatabase } from '../../src/db/index.js'

const dbPath = '/tmp/reading-list-test-tags-contract.sqlite'

describe('Tags API — contract tests', () => {
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

  function insertEntry(url: string, title: string): number {
    const db = getDatabase(dbPath)
    const result = db
      .prepare(`INSERT INTO entries (url, title, description, source_type) VALUES (?, ?, ?, 'generic')`)
      .run(url, title, '')
    return result.lastInsertRowid as number
  }

  describe('POST /entries with tags', () => {
    it('T003: creates entry with tags and returns tags in response', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/entries',
        payload: {
          url: 'http://example.com/tagged-article',
          title: 'Tagged Article',
          description: 'An article with tags',
          tags: ['javascript', 'web-dev'],
        },
      })
      await app.close()

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.id).toBeDefined()
      expect(body.tags).toEqual(['javascript', 'web-dev'])
    })

    it('T003: creates entry with tags case-normalized to lowercase', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/entries',
        payload: {
          url: 'http://example.com/case-article',
          title: 'Case Article',
          description: 'Case normalization test',
          tags: ['JavaScript', 'JAVASCRIPT'],
        },
      })
      await app.close()

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.tags).toEqual(['javascript'])
    })

    it('T003: creates entry without tags when tags field omitted', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/entries',
        payload: {
          url: 'http://example.com/no-tags',
          title: 'No Tags Article',
          description: 'No tags specified',
        },
      })
      await app.close()

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.tags).toEqual([])
    })

    it('T003: creates entry with empty tags array', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/entries',
        payload: {
          url: 'http://example.com/empty-tags',
          title: 'Empty Tags',
          description: 'Explicit empty tags',
          tags: [],
        },
      })
      await app.close()

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.tags).toEqual([])
    })
  })

  describe('PATCH /entries/:id with tags sync', () => {
    it('T004: adds a new tag to entry', async () => {
      const entryId = insertEntry('http://example.com/sync-add', 'Sync Add Entry')
      const db = getDatabase(dbPath)
      db.prepare(`INSERT INTO tags (name) VALUES ('existing')`).run()
      db.prepare(`INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)`).run(entryId, 1)

      const app = await createApp()
      const res = await app.inject({
        method: 'PATCH',
        url: `/entries/${entryId}`,
        payload: { tags: ['existing', 'new-tag'] },
      })
      await app.close()

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.tags).toContain('existing')
      expect(body.tags).toContain('new-tag')
    })

    it('T004: removes a tag from entry', async () => {
      const entryId = insertEntry('http://example.com/sync-remove', 'Sync Remove Entry')
      const db = getDatabase(dbPath)
      db.prepare(`INSERT INTO tags (name) VALUES ('keep')`).run()
      db.prepare(`INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)`).run(entryId, 1)

      const app = await createApp()
      const res = await app.inject({
        method: 'PATCH',
        url: `/entries/${entryId}`,
        payload: { title: 'Updated', tags: ['keep'] },
      })
      await app.close()

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.tags).toEqual(['keep'])
    })

    it('T004: full tag sync — adds missing, removes extra', async () => {
      const entryId = insertEntry('http://example.com/sync-full', 'Sync Full Entry')
      const db = getDatabase(dbPath)
      db.prepare(`INSERT INTO tags (name) VALUES ('a')`).run()
      db.prepare(`INSERT INTO tags (name) VALUES ('b')`).run()
      db.prepare(`INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, 1)`).run(entryId)
      db.prepare(`INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, 2)`).run(entryId)

      const app = await createApp()
      const res = await app.inject({
        method: 'PATCH',
        url: `/entries/${entryId}`,
        payload: { tags: ['b', 'c'] },
      })
      await app.close()

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.tags).toContain('b')
      expect(body.tags).toContain('c')
      expect(body.tags).not.toContain('a')
    })

    it('T004: tag sync case-normalized', async () => {
      const entryId = insertEntry('http://example.com/sync-case', 'Sync Case Entry')
      const db = getDatabase(dbPath)
      db.prepare(`INSERT INTO tags (name) VALUES ('javascript')`).run()
      db.prepare(`INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)`).run(entryId, 1)

      const app = await createApp()
      const res = await app.inject({
        method: 'PATCH',
        url: `/entries/${entryId}`,
        payload: { tags: ['JavaScript'] },
      })
      await app.close()

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.tags).toEqual(['javascript'])
    })
  })

  describe('GET /tags', () => {
    it('T003: returns all tags sorted alphabetically', async () => {
      const db = getDatabase(dbPath)
      db.prepare(`INSERT INTO tags (name) VALUES ('zebra')`).run()
      db.prepare(`INSERT INTO tags (name) VALUES ('alpha')`).run()
      db.prepare(`INSERT INTO tags (name) VALUES ('mid')`).run()

      const app = await createApp()
      const res = await app.inject({ method: 'GET', url: '/tags' })
      await app.close()

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(3)
      expect(body[0].name).toBe('alpha')
      expect(body[1].name).toBe('mid')
      expect(body[2].name).toBe('zebra')
    })
  })
})
