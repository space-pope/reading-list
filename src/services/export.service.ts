import { EntryService } from './entry.service.js'
import { NoteService } from './note.service.js'

export class ExportService {
  private entryService: EntryService
  private noteService: NoteService

  constructor() {
    this.entryService = new EntryService()
    this.noteService = new NoteService()
  }

  generateExportMarkdown(): string {
    const { entries } = this.entryService.getEntries(1, 10000)
    const parts: string[] = []

    for (const entry of entries) {
      const tags = entry.tags.length > 0
        ? entry.tags.sort().join(', ')
        : 'none'

      const notes = entry.id !== null ? this.noteService.getNotesByEntry(entry.id) : []

      if (notes.length === 0) {
        continue
      }

      let noteSection = ''
      for (const note of notes) {
        const pageRef = note.page_number ? ` (${note.page_number})` : ''
        noteSection += `- ${note.content}${pageRef}\n`
      }

      parts.push(`# ${entry.title}

---
url: ${entry.url}
tags: ${tags}
---
${noteSection}`)
    }

    return parts.join('\n\n')
  }
}
