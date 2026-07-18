import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from '../../src/server/app.js'
import { getDatabase, closeDatabase } from '../../src/db/index.js'

const dbPath = '/tmp/reading-list-test-notes-contract.sqlite'

describe('Notes API — contract tests', () => {
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

  function insertEntry(url: string, title: string): number {
    const db = getDatabase(dbPath)
    const result = db
      .prepare(`INSERT INTO entries (url, title, description, source_type) VALUES (?, ?, ?, 'generic')`)
      .run(url, title, '')
    return result.lastInsertRowid as number
  }

  describe('POST /notes', () => {
    it('returns 201 with Note object on valid creation', async () => {
      const entryId = insertEntry('http://example.com/1', 'Entry 1')
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/notes',
        payload: { entry_id: entryId, content: 'Test note', page_number: '42' },
      })
      await app.close()

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.id).toBeDefined()
      expect(body.entry_id).toBe(entryId)
      expect(body.content).toBe('Test note')
      expect(body.page_number).toBe('42')
      expect(body.created_at).toBeDefined()
      expect(body.updated_at).toBeDefined()
    })

    it('returns 201 without page_number when omitted', async () => {
      const entryId = insertEntry('http://example.com/2', 'Entry 2')
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/notes',
        payload: { entry_id: entryId, content: 'Note without page' },
      })
      await app.close()

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.page_number).toBeNull()
    })

    it('returns 400 when content is empty', async () => {
      const entryId = insertEntry('http://example.com/3', 'Entry 3')
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/notes',
        payload: { entry_id: entryId, content: '' },
      })
      await app.close()

      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.body)
      expect(body.error).toBeDefined()
    })

    it('returns 400 when entry_id is missing', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/notes',
        payload: { content: 'Note without entry_id' },
      })
      await app.close()

      expect(res.statusCode).toBe(400)
    })

    it('returns 404 when entry does not exist', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/notes',
        payload: { entry_id: 99999, content: 'Should fail' },
      })
      await app.close()

      expect(res.statusCode).toBe(404)
    })
  })

  describe('GET /entries/:entryId/notes', () => {
    it('returns array of notes sorted oldest-first', async () => {
      const entryId = insertEntry('http://example.com/4', 'Entry 4')
      const db = getDatabase(dbPath)
      db.prepare(`INSERT INTO notes (entry_id, content, page_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
        entryId, 'First note', '1', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
      )
      db.prepare(`INSERT INTO notes (entry_id, content, page_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
        entryId, 'Second note', '2', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z'
      )

      const app = await createApp()
      const res = await app.inject({
        method: 'GET',
        url: `/entries/${entryId}/notes`,
      })
      await app.close()

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(2)
      expect(body[0].content).toBe('First note')
      expect(body[1].content).toBe('Second note')
    })

    it('returns empty array when entry has no notes', async () => {
      const entryId = insertEntry('http://example.com/5', 'Entry 5')
      const app = await createApp()
      const res = await app.inject({
        method: 'GET',
        url: `/entries/${entryId}/notes`,
      })
      await app.close()

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body)).toEqual([])
    })
  })

  describe('GET /notes/:id', () => {
    it('returns note by ID', async () => {
      const entryId = insertEntry('http://example.com/6', 'Entry 6')
      const db = getDatabase(dbPath)
      const noteResult = db
        .prepare(`INSERT INTO notes (entry_id, content, page_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
        .run(entryId, 'Single note', '10', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
      const noteId = noteResult.lastInsertRowid as number

      const app = await createApp()
      const res = await app.inject({
        method: 'GET',
        url: `/notes/${noteId}`,
      })
      await app.close()

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.id).toBe(noteId)
      expect(body.content).toBe('Single note')
    })

    it('returns 404 for non-existent note', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'GET',
        url: '/notes/99999',
      })
      await app.close()

      expect(res.statusCode).toBe(404)
    })
  })

  describe('PATCH /notes/:id', () => {
    it('updates note content and page_number', async () => {
      const entryId = insertEntry('http://example.com/7', 'Entry 7')
      const db = getDatabase(dbPath)
      const noteResult = db
        .prepare(`INSERT INTO notes (entry_id, content, page_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
        .run(entryId, 'Old content', '1', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
      const noteId = noteResult.lastInsertRowid as number

      const app = await createApp()
      const res = await app.inject({
        method: 'PATCH',
        url: `/notes/${noteId}`,
        payload: { content: 'Updated content', page_number: '5' },
      })
      await app.close()

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.content).toBe('Updated content')
      expect(body.page_number).toBe('5')
    })

    it('returns 404 for non-existent note', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'PATCH',
        url: '/notes/99999',
        payload: { content: 'No-op' },
      })
      await app.close()

      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /notes/:id', () => {
    it('deletes note and returns confirmation', async () => {
      const entryId = insertEntry('http://example.com/8', 'Entry 8')
      const db = getDatabase(dbPath)
      const noteResult = db
        .prepare(`INSERT INTO notes (entry_id, content, page_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
        .run(entryId, 'To delete', null, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
      const noteId = noteResult.lastInsertRowid as number

      const app = await createApp()
      const res = await app.inject({
        method: 'DELETE',
        url: `/notes/${noteId}`,
      })
      await app.close()

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.message).toBe('Note deleted')
      expect(body.id).toBe(noteId)
    })

    it('returns 404 for non-existent note', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'DELETE',
        url: '/notes/99999',
      })
      await app.close()

      expect(res.statusCode).toBe(404)
    })
  })
})
