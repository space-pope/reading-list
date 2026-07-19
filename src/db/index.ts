import Database from 'better-sqlite3'
import { join } from 'node:path'
import { readdirSync, readFileSync } from 'node:fs'
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

export function checkIntegrity(dbPath?: string): void {
  const dbConn = getDatabase(dbPath)
  try {
    const result = dbConn.prepare('PRAGMA integrity_check').get() as { integrity_check: string | undefined }
    const integrity = result.integrity_check
    if (integrity === undefined) {
      console.log('New database detected — will create tables on first migration')
      return
    }
    if (integrity !== 'ok') {
      console.error(`Database integrity check failed: ${integrity}`)
      console.error(`This may indicate corruption. Delete ${dbPath || getConfig().dbPath} and restart to recreate.`)
      process.exit(1)
    }
    console.log('Database integrity check passed')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const sqliteCode = (err as { code?: string }).code
    console.error(`Database integrity check failed: ${message}${sqliteCode ? ` (${sqliteCode})` : ''}`)
    console.error(`This usually indicates database corruption. Delete the database file and restart to recreate it.`)
    process.exit(1)
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function runMigrations(dbPath?: string): void {
  const dbConn = getDatabase(dbPath)
  const dbFile = dbPath || getConfig().dbPath

  console.log(`Running migrations for: ${dbFile}`)

  try {
    dbConn.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      )
    `)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const sqliteCode = (err as { code?: string }).code
    console.error(`Failed to create schema_version table: ${message}${sqliteCode ? ` (${sqliteCode})` : ''}`)
    console.error(`This may indicate database corruption. Delete ${dbFile} and restart.`)
    process.exit(1)
  }

  let row: { version: number | null }
  try {
    row = dbConn.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number | null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const sqliteCode = (err as { code?: string }).code
    console.error(`Failed to read schema version: ${message}${sqliteCode ? ` (${sqliteCode})` : ''}`)
    console.error(`Database may be corrupted. Delete ${dbFile} and restart.`)
    process.exit(1)
  }
  const currentVersion = row.version ?? 0
  console.log(`Current schema version: ${currentVersion}`)

  const migrationsDir = join(__dirname, 'migrations')
  const migrationFiles = readdirSync(migrationsDir)
    .filter(f => /^V(\d+)_.*\.sql$/i.test(f))
    .map(f => {
      const match = /^V(\d+)_.*\.sql$/i.exec(f)
      return { version: parseInt(match![1], 10), file: f }
    })
    .sort((a, b) => a.version - b.version)

  for (const migration of migrationFiles) {
    if (currentVersion >= migration.version) {
      console.log(`  Skipping migration ${migration.version}: already applied`)
      continue
    }

    console.log(`  Applying migration ${migration.version}: ${migration.file}`)
    const sql = readFileSync(join(__dirname, 'migrations', migration.file), 'utf-8')
    try {
      dbConn.exec(sql)
      dbConn.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version)
      console.log(`  Migration ${migration.version} applied successfully`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const sqliteCode = (err as { code?: string }).code
      console.error(`  Failed applying migration ${migration.version}: ${message}${sqliteCode ? ` (${sqliteCode})` : ''}`)
      console.error(`  Database may be corrupted. Delete ${dbFile} and restart.`)
      process.exit(1)
    }
  }

  console.log('Migrations complete')
}

export function close(): void {
  closeDatabase()
}
