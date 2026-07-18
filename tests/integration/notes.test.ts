import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from '../../src/server/app.js'
import { getDatabase, closeDatabase } from '../../src/db/index.js'

const dbPath = '/tmp/reading-list-test-notes-integration.sqlite'

describe('Notes API — integration tests', () => {
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

  function insertNote(entryId: number, content: string, pageNumber: string | null): number {
    const db = getDatabase(dbPath)
    const result = db
      .prepare(`INSERT INTO notes (entry_id, content, page_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run(entryId, content, pageNumber, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
    return result.lastInsertRowid as number
  }

  it('full cycle: create note via POST, retrieve via GET entries/:id/notes, edit via PATCH, delete via DELETE', async () => {
    const entryId = insertEntry('http://example.com/cycle', 'Cycle Entry')

    // Create note
    const app = await createApp()
    const createRes = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { entry_id: entryId, content: 'Original note', page_number: '10' },
    })
    expect(createRes.statusCode).toBe(201)
    const note = JSON.parse(createRes.body)

    // List notes
    const listRes = await app.inject({ method: 'GET', url: `/entries/${entryId}/notes` })
    expect(listRes.statusCode).toBe(200)
    expect(JSON.parse(listRes.body).length).toBe(1)
    expect(JSON.parse(listRes.body)[0].content).toBe('Original note')

    // Edit note
    const editRes = await app.inject({
      method: 'PATCH',
      url: `/notes/${note.id}`,
      payload: { content: 'Edited note', page_number: '15' },
    })
    expect(editRes.statusCode).toBe(200)
    expect(JSON.parse(editRes.body).content).toBe('Edited note')
    expect(JSON.parse(editRes.body).page_number).toBe('15')

    // Delete note
    const deleteRes = await app.inject({ method: 'DELETE', url: `/notes/${note.id}` })
    expect(deleteRes.statusCode).toBe(200)
    expect(JSON.parse(deleteRes.body).message).toBe('Note deleted')

    // Verify deleted
    const listRes2 = await app.inject({ method: 'GET', url: `/entries/${entryId}/notes` })
    expect(JSON.parse(listRes2.body).length).toBe(0)

    await app.close()
  })

  it('cascade delete: deleting entry removes all notes', async () => {
    const entryId = insertEntry('http://example.com/cascade', 'Cascade Entry')
    insertNote(entryId, 'Note 1', null)
    insertNote(entryId, 'Note 2', '5')
    insertNote(entryId, 'Note 3', '10-15')

    const app = await createApp()

    // Verify 3 notes exist
    let listRes = await app.inject({ method: 'GET', url: `/entries/${entryId}/notes` })
    expect(JSON.parse(listRes.body).length).toBe(3)

    // Delete entry
    const delEntryRes = await app.inject({ method: 'DELETE', url: `/entries/${entryId}` })
    expect(delEntryRes.statusCode).toBe(200)

    // Notes should be gone
    listRes = await app.inject({ method: 'GET', url: `/entries/${entryId}/notes` })
    expect(listRes.statusCode).toBe(404)

    await app.close()
  })

  it('multiple notes on same entry ordered oldest-first', async () => {
    const entryId = insertEntry('http://example.com/order', 'Order Entry')
    const db = getDatabase(dbPath)
    db.prepare(`INSERT INTO notes (entry_id, content, created_at, updated_at) VALUES (?, ?, ?, ?)`).run(entryId, 'Oldest', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z')
    db.prepare(`INSERT INTO notes (entry_id, content, created_at, updated_at) VALUES (?, ?, ?, ?)`).run(entryId, 'Middle', '2025-06-01T00:00:00.000Z', '2025-06-01T00:00:00.000Z')
    db.prepare(`INSERT INTO notes (entry_id, content, created_at, updated_at) VALUES (?, ?, ?, ?)`).run(entryId, 'Newest', '2025-12-01T00:00:00.000Z', '2025-12-01T00:00:00.000Z')

    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: `/entries/${entryId}/notes` })
    await app.close()

    const notes = JSON.parse(res.body)
    expect(notes.length).toBe(3)
    expect(notes[0].content).toBe('Oldest')
    expect(notes[1].content).toBe('Middle')
    expect(notes[2].content).toBe('Newest')
  })

  it('only create + list works (US1 MVP scope)', async () => {
    const entryId = insertEntry('http://example.com/mvp', 'MVP Entry')

    const app = await createApp()

    // Create note
    const createRes = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { entry_id: entryId, content: 'MVP test note', page_number: '42' },
    })
    expect(createRes.statusCode).toBe(201)
    const note = JSON.parse(createRes.body)
    expect(note.content).toBe('MVP test note')
    expect(note.page_number).toBe('42')

    // Retrieve via list
    const listRes = await app.inject({ method: 'GET', url: `/entries/${entryId}/notes` })
    expect(listRes.statusCode).toBe(200)
    const notes = JSON.parse(listRes.body)
    expect(notes.length).toBe(1)
    expect(notes[0].id).toBe(note.id)

    // Retrieve individual note
    const getRes = await app.inject({ method: 'GET', url: `/notes/${note.id}` })
    expect(getRes.statusCode).toBe(200)
    expect(JSON.parse(getRes.body).content).toBe('MVP test note')

    await app.close()
  })
})
