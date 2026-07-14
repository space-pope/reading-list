import type { FastifyInstance } from 'fastify'
import { EntryService } from '../services/entry.service.js'
import { fetchAndExtract } from '../services/fetch.service.js'
import { entryToDict } from '../models/entry.js'
import { validateEntry } from '../models/entry.js'

const entryService = new EntryService()

function generateTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^www\./, '')
    const pathname = parsed.pathname.replace(/^\//, '').replace(/\/$/, '')
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length > 0) {
      const last = segments[segments.length - 1]
        .replace(/[-_]/g, ' ')
        .replace(/[.]\w+$/, '')
        .replace(/\b\w/g, (c) => c.toUpperCase())
      if (last.length > 2) return last
    }
    return hostname.charAt(0).toUpperCase() + hostname.slice(1)
  } catch {
    return 'Untitled'
  }
}

export function registerRoutes(app: FastifyInstance): void {
  // GET / - Main reading list view
  app.get('/', async (request, reply) => {
    const page = Math.max(1, parseInt((request.query as Record<string, string>).page || '1', 10))
    const perPage = Math.max(1, Math.min(200, parseInt((request.query as Record<string, string>).per_page || '50', 10)))
    const tag = (request.query as Record<string, string>).tag || undefined
    const search =
      (request.query as Record<string, string>).q ||
      (request.query as Record<string, string>).search ||
      undefined
    const view = (request.query as Record<string, string>).view === 'all' ? 'all' : 'unread'
    const truncation = Math.max(20, Math.min(500, parseInt((request.query as Record<string, string>).truncation || '80', 10)))

    const { entries, total } = entryService.getEntries(page, perPage, tag, search, view)
    const totalPages = Math.ceil(total / perPage)
    const tags = entryService.getAllTags()

    return reply.view('index.njk', {
      entries,
      tags,
      currentPage: page,
      totalPages,
      currentTag: tag,
      searchQuery: search,
      truncationLength: truncation,
      view,
    })
  })

  // GET /add - Add form
  app.get('/add', async (_request, reply) => {
    return reply.view('add.njk', {})
  })

  // POST /fetch - Fetch URL metadata
  app.post('/fetch', async (request, reply) => {
    const body = request.body as Record<string, unknown>
    const url =
      (request.body as Record<string, string>).url ||
      (body.url as string)

    if (!url) {
      return reply.status(400).send({ error: 'url is required' })
    }

    try {
      const result = await fetchAndExtract(url)
      return reply.send(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('Invalid URL')) {
        return reply.status(400).send({ error: message })
      }
      return reply.status(502).send({ error: message })
    }
  })

  // POST /entries - Create entry
  app.post('/entries', async (request, reply) => {
    const body = request.body as Record<string, string>
    const url = body.url
    let title = body.title
    let description = body.description || ''

    if (!url) {
      return reply.status(400).send({ error: 'url is required' })
    }

    if (!title) {
      let autoTitle = ''
      try {
        const extracted = await fetchAndExtract(url)
        autoTitle = extracted.title || ''
      } catch {
        autoTitle = generateTitleFromUrl(url)
      }
      if (!autoTitle) {
        return reply.status(400).send({ error: 'Could not extract title from URL' })
      }
      title = autoTitle
    }

    const entry: import('../models/entry.js').Entry = {
      id: null,
      url,
      title,
      description,
      read: false,
      source_type: 'generic',
      created_at: '',
      updated_at: '',
      tags: [],
    }

    const errors = validateEntry(entry)
    if (errors.length > 0) {
      const detailErrors: Record<string, string> = {}
      for (const err of errors) {
        const [field, ...rest] = err.split(' ', 2)
        detailErrors[field] = rest.join(' ') || err
      }
      return reply.status(400).send({ error: 'Validation failed', details: detailErrors })
    }

    try {
      const created = entryService.createEntry(entry)
      return reply.status(201).send(entryToDict(created))
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Entry with this URL already exists')) {
        return reply.status(409).send({ error: err.message })
      }
      throw err
    }
  })

  // PATCH /entries/:id - Update entry
  app.patch('/entries/:id', async (request, reply) => {
    const id = (request.params as { id: string }).id
    const entryId = parseInt(id, 10)

    const existing = entryService.getEntry(entryId)
    if (!existing) {
      return reply.status(404).send({ error: 'Entry not found' })
    }

    const body = request.body as Record<string, unknown>
    const updates: Record<string, unknown> = {}

    if ('title' in body) updates.title = body.title as string
    if ('description' in body) updates.description = body.description as string
    if ('read' in body) {
      const val = body.read as string | boolean
      updates.read = typeof val === 'string' ? ['true', '1', 'yes'].includes(val.toLowerCase()) : Boolean(val)
    }

    const updated = entryService.updateEntry(entryId, updates as { title?: string; description?: string; read?: boolean })
    return reply.send(updated ? entryToDict(updated) : null)
  })

  // DELETE /entries/:id - Delete entry
  app.delete('/entries/:id', async (request, reply) => {
    const id = (request.params as { id: string }).id
    const entryId = parseInt(id, 10)

    const deleted = entryService.deleteEntry(entryId)
    if (deleted) {
      return reply.send({ message: 'Entry deleted', id: entryId })
    }
    return reply.status(404).send({ error: 'Entry not found' })
  })

  // GET /tags - List all tags
  app.get('/tags', async (_request, reply) => {
    const tags = entryService.getAllTags()
    return reply.send(tags)
  })

  // POST /tags - Create tag (placeholder)
  app.post('/tags', async (request, reply) => {
    const body = request.body as Record<string, string>
    const name = body.name
    if (!name) {
      return reply.status(400).send({ error: 'name is required' })
    }
    return reply.status(201).send({ id: null, name })
  })

  // GET /stats - Statistics
  app.get('/stats', async (_request, reply) => {
    const stats = entryService.getStats()
    return reply.send(stats)
  })
}
