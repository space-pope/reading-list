import { getDatabase, closeDatabase } from '../db/index.js'
import {
  entryFromRow,
  entryToDict,
  validateEntry,
} from '../models/entry.js'
import { nowISO } from '../shared/utils.js'

export class EntryService {
  private db() {
    return getDatabase()
  }

  getEntries(
    page: number = 1,
    perPage: number = 50,
    tag?: string,
    search?: string
  ): { entries: import('../models/entry.js').Entry[]; total: number } {
    const db = this.db()
    const offset = (page - 1) * perPage

    if (tag) {
      const row = db
        .prepare(
          `SELECT COUNT(DISTINCT e.id) as total FROM entries e
           INNER JOIN entry_tags et ON e.id = et.entry_id
           INNER JOIN tags t ON et.tag_id = t.id
           WHERE t.name = ?`
        )
        .get(tag) as { total: number }

      const rows = db
        .prepare(
          `SELECT e.* FROM entries e
           INNER JOIN entry_tags et ON e.id = et.entry_id
           INNER JOIN tags t ON et.tag_id = t.id
           WHERE t.name = ?
           ORDER BY e.created_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(tag, perPage, offset) as import('../models/entry.js').EntryRow[]

      const entries = rows.map((row) => {
        const entry = entryFromRow(row)
        entry.tags = this.getTagsForEntry(entry.id)
        return entry
      })

      return { entries, total: row.total }
    }

    if (search) {
      const row = db
        .prepare(`SELECT COUNT(*) as total FROM entries_fts WHERE entries_fts MATCH ?`)
        .get(search) as { total: number }

      const rows = db
        .prepare(
          `SELECT e.* FROM entries e
           INNER JOIN entries_fts fts ON e.id = fts.rowid
           WHERE entries_fts MATCH ?
           ORDER BY rank
           LIMIT ? OFFSET ?`
        )
        .all(search, perPage, offset) as import('../models/entry.js').EntryRow[]

      const entries = rows.map((row) => {
        const entry = entryFromRow(row)
        entry.tags = this.getTagsForEntry(entry.id)
        return entry
      })

      return { entries, total: row.total }
    }

    const row = db
      .prepare(`SELECT COUNT(*) as total FROM entries`)
      .get() as { total: number }

    const rows = db
      .prepare(
        `SELECT * FROM entries ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(perPage, offset) as import('../models/entry.js').EntryRow[]

    const entries = rows.map((row) => {
      const entry = entryFromRow(row)
      entry.tags = this.getTagsForEntry(entry.id)
      return entry
    })

    return { entries, total: row.total }
  }

  getEntry(id: number): import('../models/entry.js').Entry | null {
    const row = this.db()
      .prepare(`SELECT * FROM entries WHERE id = ?`)
      .get(id) as import('../models/entry.js').EntryRow | undefined

    if (!row) return null

    const entry = entryFromRow(row)
    entry.tags = this.getTagsForEntry(entry.id)
    return entry
  }

  createEntry(
    entry: import('../models/entry.js').Entry
  ): import('../models/entry.js').Entry {
    const errors = validateEntry(entry)
    if (errors.length > 0) {
      const detailErrors: Record<string, string> = {}
      for (const err of errors) {
        const [field, msg] = err.split(' ', 2)
        detailErrors[field] = msg || err
      }
      throw { errors: detailErrors }
    }

    const db = this.db()
    try {
      const stmt = db.prepare(
        `INSERT INTO entries (url, title, excerpt, read, source_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      const result = stmt.run(
        entry.url,
        entry.title,
        entry.excerpt,
        entry.read ? 1 : 0,
        entry.source_type,
        nowISO(),
        nowISO()
      )
      entry.id = result.lastInsertRowid as number
      return entry
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
        throw new Error('Entry with this URL already exists')
      }
      throw err
    }
  }

  updateEntry(
    id: number,
    updates: { title?: string; excerpt?: string; read?: boolean }
  ): import('../models/entry.js').Entry | null {
    const db = this.db()
    const fields: string[] = []
    const values: unknown[] = []

    if ('title' in updates) {
      fields.push('title = ?')
      values.push(updates.title!)
    }
    if ('excerpt' in updates) {
      fields.push('excerpt = ?')
      values.push(updates.excerpt!)
    }
    if ('read' in updates) {
      fields.push('read = ?')
      values.push(updates.read ? 1 : 0)
    }

    fields.push('updated_at = ?')
    values.push(nowISO())
    values.push(id)

    db.prepare(`UPDATE entries SET ${fields.join(', ')} WHERE id = ?`).run(
      ...values
    )

    return this.getEntry(id)
  }

  deleteEntry(id: number): boolean {
    const result = this.db()
      .prepare(`DELETE FROM entries WHERE id = ?`)
      .run(id)
    return result.changes > 0
  }

  addTag(entryId: number, tagName: string): void {
    const db = this.db()
    let tagRow = db
      .prepare(`SELECT id FROM tags WHERE name = ?`)
      .get(tagName) as { id: number } | undefined

    if (!tagRow) {
      const result = db
        .prepare(`INSERT INTO tags (name) VALUES (?)`)
        .run(tagName)
      tagRow = { id: result.lastInsertRowid as number }
    }

    db.prepare(
      `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)`
    ).run(entryId, tagRow.id)
  }

  removeTag(entryId: number, tagName: string): void {
    const db = this.db()
    const tagRow = db
      .prepare(`SELECT id FROM tags WHERE name = ?`)
      .get(tagName) as { id: number } | undefined

    if (tagRow) {
      db.prepare(
        `DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?`
      ).run(entryId, tagRow.id)
    }
  }

  getAllTags(): Array<{ id: number; name: string }> {
    return this.db()
      .prepare(`SELECT id, name FROM tags ORDER BY name`)
      .all() as Array<{ id: number; name: string }>
  }

  getStats(): {
    total: number
    unread: number
    tags: number
    oldest: string | null
    newest: string | null
  } {
    const db = this.db()

    const totalRow = db
      .prepare(`SELECT COUNT(*) as total FROM entries`)
      .get() as { total: number }

    const unreadRow = db
      .prepare(`SELECT COUNT(*) as total FROM entries WHERE read = 0`)
      .get() as { total: number }

    const tagsRow = db
      .prepare(`SELECT COUNT(DISTINCT name) as total FROM tags`)
      .get() as { total: number }

    const oldestRow = db
      .prepare(`SELECT MIN(created_at) as oldest FROM entries`)
      .get() as { oldest: string | null }

    const newestRow = db
      .prepare(`SELECT MAX(created_at) as newest FROM entries`)
      .get() as { newest: string | null }

    return {
      total: totalRow.total,
      unread: unreadRow.total,
      tags: tagsRow.total,
      oldest: oldestRow.oldest || null,
      newest: newestRow.newest || null,
    }
  }

  private getTagsForEntry(entryId: number | null): string[] {
    if (entryId === null) return []
    const rows = this.db()
      .prepare(
        `SELECT t.name FROM tags t
         INNER JOIN entry_tags et ON t.id = et.tag_id
         WHERE et.entry_id = ?
         ORDER BY t.name`
      )
      .all(entryId) as { name: string }[]

    return rows.map((r) => r.name)
  }
}
