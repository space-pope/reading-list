import { Command } from 'commander'
import { EntryService } from '../services/entry.service.js'
import { entryToDict } from '../models/entry.js'
import { fetchAndExtract } from '../services/fetch.service.js'
import { createInterface } from 'node:readline'
import { ensureDbDir, getConfig } from '../config.js'

const program = new Command()
const entryService = new EntryService()

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
})

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
  })
}

program
  .name('reading-list')
  .description('A local reading list manager')
  .version('1.0.0')

program
  .command('list')
  .description('List entries')
  .option('-p, --page <number>', 'Page number', '1')
  .option('-P, --per-page <number>', 'Entries per page', '50')
  .option('-t, --tag <name>', 'Filter by tag')
  .option('-s, --search <query>', 'Search query')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const page = parseInt(options.page, 10)
    const perPage = parseInt(options.perPage, 10)

    const result = entryService.getEntries(page, perPage, options.tag, options.search)

    if (options.json) {
      console.log(JSON.stringify(result.entries, null, 2))
      return
    }

    if (!result.entries.length) {
      console.log('No entries found.')
      return
    }

    for (const entry of result.entries) {
      const status = entry.read ? 'read' : 'unread'
      const tags = entry.tags.length ? `    tags: ${entry.tags.join(', ')}` : ''
      const excerpt =
        entry.excerpt.length > 100
          ? entry.excerpt.slice(0, 100) + '...'
          : entry.excerpt
      console.log(`[${entry.id}] ${entry.url}`)
      console.log(`    "${entry.title}" — ${excerpt}`)
      if (tags) console.log(tags)
      console.log(`    status: ${status}`)
      console.log()
    }
  })

program
  .command('add')
  .description('Add an entry')
  .argument('<url>', 'URL to add')
  .option('--title <title>', 'Title')
  .option('--excerpt <excerpt>', 'Excerpt')
  .option('--fetch', 'Fetch headline/excerpt from URL')
  .action(async (url, options) => {
    let { title, excerpt } = options

    if (options.fetch) {
      try {
        const result = await fetchAndExtract(url)
        title = title || result.title || ''
        excerpt = excerpt || result.excerpt || ''
      } catch (err: unknown) {
        console.error(`Error fetching: ${err instanceof Error ? err.message : String(err)}`)
        process.exitCode = 1
        return
      }
    }

    if (options.fetch && title) {
      // With --fetch, only title is required
    } else if (!title || !excerpt) {
      console.error('Error: --title and --excerpt are required (or use --fetch)')
      process.exitCode = 1
      return
    }

    const entry: import('../models/entry.js').Entry = {
      id: null,
      url,
      title: title || '',
      excerpt: excerpt || '',
      read: false,
      source_type: 'generic',
      created_at: '',
      updated_at: '',
      tags: [],
    }

    try {
      const created = entryService.createEntry(entry)
      console.log(`Added entry ${created.id}: ${created.url}`)
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(`Error: ${err.message}`)
      } else {
        console.error('Error adding entry')
      }
      process.exitCode = 1
    }
  })

program
  .command('delete')
  .description('Delete an entry')
  .argument('<id>', 'Entry ID to delete')
  .action(async (id) => {
    const idNum = parseInt(id, 10)
    const answer = await prompt(`Delete entry ${idNum}? [y/N] `)

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('Cancelled.')
      return
    }

    const deleted = entryService.deleteEntry(idNum)
    if (deleted) {
      console.log(`Deleted entry ${idNum}.`)
    } else {
      console.error(`Entry ${idNum} not found.`)
      process.exitCode = 1
    }
  })

program
  .command('tag')
  .description('Add a tag to an entry')
  .argument('<id>', 'Entry ID')
  .argument('<name>', 'Tag name')
  .action(async (id, name) => {
    const entry = entryService.getEntry(parseInt(id, 10))
    if (!entry) {
      console.error(`Entry ${id} not found.`)
      process.exitCode = 1
      return
    }

    entryService.addTag(parseInt(id, 10), name)
    console.log(`Added tag '${name}' to entry ${id}.`)
  })

program
  .command('untag')
  .description('Remove a tag from an entry')
  .argument('<id>', 'Entry ID')
  .argument('<name>', 'Tag name')
  .action(async (id, name) => {
    entryService.removeTag(parseInt(id, 10), name)
    console.log(`Removed tag '${name}' from entry ${id}.`)
  })

program
  .command('read')
  .description('Mark an entry as read')
  .argument('<id>', 'Entry ID')
  .action(async (id) => {
    const entry = entryService.getEntry(parseInt(id, 10))
    if (!entry) {
      console.error(`Entry ${id} not found.`)
      process.exitCode = 1
      return
    }

    entryService.updateEntry(parseInt(id, 10), { read: true })
    console.log(`Marked entry ${id} as read.`)
  })

program
  .command('unread')
  .description('Mark an entry as unread')
  .argument('<id>', 'Entry ID')
  .action(async (id) => {
    const entry = entryService.getEntry(parseInt(id, 10))
    if (!entry) {
      console.error(`Entry ${id} not found.`)
      process.exitCode = 1
      return
    }

    entryService.updateEntry(parseInt(id, 10), { read: false })
    console.log(`Marked entry ${id} as unread.`)
  })

program
  .command('tags')
  .description('List all tags')
  .action(() => {
    const tags = entryService.getAllTags()
    if (!tags.length) {
      console.log('No tags found.')
      return
    }

    for (const tag of tags) {
      console.log(`- ${tag.name}`)
    }
  })

program
  .command('stats')
  .description('Show reading list statistics')
  .action(() => {
    const s = entryService.getStats()
    console.log(`Total entries: ${s.total}`)
    console.log(`Unread: ${s.unread}`)
    console.log(`Tags: ${s.tags}`)
    if (s.oldest) console.log(`Oldest entry: ${s.oldest.slice(0, 10)}`)
    if (s.newest) console.log(`Newest entry: ${s.newest.slice(0, 10)}`)
  })

program.parse()
