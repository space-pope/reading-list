import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export interface Config {
  dbPath: string
  port: number
  host: string
}

export function getConfig(): Config {
  const dbPath =
    process.env.READING_LIST_DB_PATH || join(homedir(), '.reading-list', 'db.sqlite')
  const port = parseInt(process.env.READING_LIST_PORT || '3000', 10)
  const host = process.env.READING_LIST_HOST || '127.0.0.1'
  return { dbPath, port, host }
}

export function ensureDbDir(dbPath: string): void {
  const dir = join(dbPath, '..')
  mkdirSync(dir, { recursive: true })
}
