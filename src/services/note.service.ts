import { getDatabase, closeDatabase } from '../db/index.js'
import { noteFromRow, validateNote } from '../models/note.js'
import { nowISO } from '../shared/utils.js'

export class NoteService {
  private db() {
    return getDatabase()
  }

  getNotesByEntry(entryId: number): import('../models/note.js').Note[] {
    const db = this.db()
    const rows = db
      .prepare(
        `SELECT * FROM notes WHERE entry_id = ? ORDER BY created_at ASC`
      )
      .all(entryId) as import('../models/note.js').NoteRow[]

    return rows.map((row) => noteFromRow(row))
  }

  getNote(id: number): import('../models/note.js').Note | null {
    const db = this.db()
    const row = db
      .prepare(`SELECT * FROM notes WHERE id = ?`)
      .get(id) as import('../models/note.js').NoteRow | undefined

    if (!row) return null

    return noteFromRow(row)
  }

  createNote(
    note: import('../models/note.js').Note
  ): import('../models/note.js').Note {
    const errors = validateNote(note)
    if (errors.length > 0) {
      throw { errors }
    }

    const db = this.db()

    const entryRow = db
      .prepare(`SELECT id FROM entries WHERE id = ?`)
      .get(note.entry_id) as { id: number } | undefined

    if (!entryRow) {
      throw new Error('Entry not found')
    }

    const stmt = db.prepare(
      `INSERT INTO notes (entry_id, content, page_number, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    const result = stmt.run(
      note.entry_id,
      note.content,
      note.page_number ?? null,
      nowISO(),
      nowISO()
    )

    const createdNote: import('../models/note.js').Note = {
      id: result.lastInsertRowid as number,
      entry_id: note.entry_id,
      content: note.content,
      page_number: note.page_number ?? null,
      created_at: nowISO(),
      updated_at: nowISO(),
    }

    return createdNote
  }

  updateNote(
    id: number,
    updates: { content?: string; page_number?: string | null }
  ): import('../models/note.js').Note | null {
    const db = this.db()
    const existing = db
      .prepare(`SELECT * FROM notes WHERE id = ?`)
      .get(id) as import('../models/note.js').NoteRow | undefined

    if (!existing) return null

    const fields: string[] = []
    const values: unknown[] = []

    if ('content' in updates) {
      fields.push('content = ?')
      values.push(updates.content!)
    }
    if ('page_number' in updates) {
      fields.push('page_number = ?')
      values.push(updates.page_number ?? null)
    }

    fields.push('updated_at = ?')
    values.push(nowISO())
    values.push(id)

    db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(
      ...values
    )

    const updatedRow = db
      .prepare(`SELECT * FROM notes WHERE id = ?`)
      .get(id) as import('../models/note.js').NoteRow

    return noteFromRow(updatedRow)
  }

  deleteNote(id: number): boolean {
    const result = this.db()
      .prepare(`DELETE FROM notes WHERE id = ?`)
      .run(id)
    return result.changes > 0
  }

  getNoteCountForEntry(entryId: number): number {
    const row = this.db()
      .prepare(`SELECT COUNT(*) as count FROM notes WHERE entry_id = ?`)
      .get(entryId) as { count: number }
    return row.count
  }
}
