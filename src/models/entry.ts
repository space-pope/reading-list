export interface Entry {
  id: number | null
  url: string
  title: string
  excerpt: string
  read: boolean
  source_type: string
  created_at: string
  updated_at: string
  tags: string[]
}

export interface EntryRow {
  id: number
  url: string
  title: string
  excerpt: string
  read: number
  source_type: string
  created_at: string
  updated_at: string
}

export function entryFromRow(row: EntryRow): Entry {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    excerpt: row.excerpt,
    read: Boolean(row.read),
    source_type: row.source_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags: [],
  }
}

export function entryToDict(entry: Entry): Record<string, unknown> {
  return {
    id: entry.id,
    url: entry.url,
    title: entry.title,
    excerpt: entry.excerpt,
    read: entry.read,
    source_type: entry.source_type,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    tags: entry.tags,
  }
}

export function validateEntry(entry: Entry): string[] {
  const errors: string[] = []

  if (!entry.url) {
    errors.push('url is required')
  } else if (!entry.url.startsWith('http://') && !entry.url.startsWith('https://')) {
    errors.push('url must be a valid URL with scheme (http:// or https://)')
  }

  if (!entry.title) {
    errors.push('title is required')
  } else if (entry.title.length > 500) {
    errors.push('title must be 500 characters or less')
  }

  if (entry.excerpt.length > 2000) {
    errors.push('excerpt must be 2000 characters or less')
  }

  if (entry.source_type !== 'generic') {
    errors.push(
      `source_type must be 'generic' or a registered scraper name, got '${entry.source_type}'`
    )
  }

  return errors
}
