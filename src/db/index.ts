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

  const versionRow = dbConn
    .prepare('SELECT MAX(version) as version FROM schema_version')
    .get() as { version: number | null }

  if (versionRow.version != null && versionRow.version >= 1) return

  const migrationPath = join(__dirname, 'migrations', 'V1_init.sql')
  const sql = readFileSync(migrationPath, 'utf-8')
  dbConn.exec(sql)

  dbConn.prepare('INSERT INTO schema_version (version) VALUES (1)').run()
}

export function close(): void {
  closeDatabase()
}
