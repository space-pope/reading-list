import Database from 'better-sqlite3'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { getConfig, ensureDbDir } from '../config.js'

let db: Database.Database | null = null

export function getDatabase(dbPath?: string): Database.Database {
  if (db) return db

  const config = getConfig()
  const path = dbPath || config.dbPath
  ensureDbDir(path)

  db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function runMigrations(dbPath?: string): void {
  const dbConn = getDatabase(dbPath)

  dbConn.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )
  `)

  const row = dbConn.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number | null }
  const currentVersion = row.version ?? 0

  const migrations = [
    { version: 1, file: 'V1_init.sql' },
    { version: 2, file: 'V2_rename_excerpt_to_description.sql' },
    { version: 3, file: 'V3_add_notes.sql' },
  ]

  for (const migration of migrations) {
    if (currentVersion >= migration.version) continue

    const sql = readFileSync(join(__dirname, 'migrations', migration.file), 'utf-8')
    dbConn.exec(sql)
    dbConn.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version)
  }
}

export function close(): void {
  closeDatabase()
}
