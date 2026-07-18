import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from '../../src/server/app.js'
import { getDatabase, closeDatabase } from '../../src/db/index.js'

const dbPath = '/tmp/reading-list-test-tags-integration.sqlite'

describe('Tags API — integration tests', () => {
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

  describe('tag add/remove via API — T005', () => {
    it('full cycle: add tag via POST entry, verify in response, remove via PATCH, verify removed', async () => {
      const app = await createApp()

      // Create entry with a tag
      const createRes = await app.inject({
        method: 'POST',
        url: '/entries',
        payload: {
          url: 'http://example.com/tag-cycle',
          title: 'Tag Cycle Entry',
          description: 'Full tag cycle',
          tags: ['cycle-tag'],
        },
      })
      expect(createRes.statusCode).toBe(201)
      const entry = JSON.parse(createRes.body)
      expect(entry.tags).toContain('cycle-tag')

      // Add another tag via PATCH
      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/entries/${entry.id}`,
        payload: { tags: ['cycle-tag', 'added-tag'] },
      })
      expect(patchRes.statusCode).toBe(200)
      const updated = JSON.parse(patchRes.body)
      expect(updated.tags).toContain('cycle-tag')
      expect(updated.tags).toContain('added-tag')

      // Remove a tag via PATCH
      const removeRes = await app.inject({
        method: 'PATCH',
        url: `/entries/${entry.id}`,
        payload: { tags: ['added-tag'] },
      })
      expect(removeRes.statusCode).toBe(200)
      const removed = JSON.parse(removeRes.body)
      expect(removed.tags).not.toContain('cycle-tag')
      expect(removed.tags).toContain('added-tag')

      await app.close()
    })

    it('adding duplicate tag is idempotent', async () => {
      const app = await createApp()
      const createRes = await app.inject({
        method: 'POST',
        url: '/entries',
        payload: {
          url: 'http://example.com/dup-tag',
          title: 'Dup Tag Entry',
          description: 'Duplicate test',
          tags: ['dup'],
        },
      })
      expect(createRes.statusCode).toBe(201)
      const entry = JSON.parse(createRes.body)

      // Add same tag again
      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/entries/${entry.id}`,
        payload: { tags: ['dup'] },
      })
      expect(patchRes.statusCode).toBe(200)
      const updated = JSON.parse(patchRes.body)
      expect(updated.tags).toEqual(['dup'])

      await app.close()
    })
  })

  describe('tag filtering — T016', () => {
    it('tags are stored and queryable after entry creation', async () => {
      const app = await createApp()

      // Create entries with different tags
      await app.inject({
        method: 'POST',
        url: '/entries',
        payload: {
          url: 'http://example.com/js-1',
          title: 'JS Article 1',
          description: 'JavaScript content',
          tags: ['javascript'],
        },
      })
      await app.inject({
        method: 'POST',
        url: '/entries',
        payload: {
          url: 'http://example.com/js-2',
          title: 'JS Article 2',
          description: 'More JavaScript',
          tags: ['javascript'],
        },
      })
      await app.inject({
        method: 'POST',
        url: '/entries',
        payload: {
          url: 'http://example.com/py-1',
          title: 'Python Article',
          description: 'Python content',
          tags: ['python'],
        },
      })

      // Verify tags are in the database
      const tagsRes = await app.inject({ method: 'GET', url: '/tags' })
      expect(tagsRes.statusCode).toBe(200)
      const tags = JSON.parse(tagsRes.body)
      const tagNames = tags.map((t: { name: string }) => t.name)
      expect(tagNames).toContain('javascript')
      expect(tagNames).toContain('python')

      await app.close()
    })
  })

  describe('entry creation with tags — T019', () => {
    it('POST /entries with multiple tags creates entry with all tags', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/entries',
        payload: {
          url: 'http://example.com/multi-tag',
          title: 'Multi Tag Entry',
          description: 'Has multiple tags',
          tags: ['a', 'b', 'c'],
        },
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.tags).toEqual(['a', 'b', 'c'])

      await app.close()
    })
  })
})
