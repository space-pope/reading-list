export interface Note {
  id: number | null
  entry_id: number
  content: string
  page_number: string | null
  created_at: string
  updated_at: string
}

export interface NoteRow {
  id: number
  entry_id: number
  content: string
  page_number: string | null
  created_at: string
  updated_at: string
}

export function noteFromRow(row: NoteRow): Note {
  return {
    id: row.id,
    entry_id: row.entry_id,
    content: row.content,
    page_number: row.page_number,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function noteToDict(note: Note): Record<string, unknown> {
  return {
    id: note.id,
    entry_id: note.entry_id,
    content: note.content,
    page_number: note.page_number,
    created_at: note.created_at,
    updated_at: note.updated_at,
  }
}

export function validateNote(note: Note): string[] {
  const errors: string[] = []

  if (!note.entry_id) {
    errors.push('entry_id is required')
  }

  if (!note.content) {
    errors.push('content is required')
  }

  return errors
}
