import { createApp } from './app.js'
import { getConfig, ensureDbDir } from '../config.js'
import { runMigrations } from '../db/index.js'

async function main() {
  const config = getConfig()
  ensureDbDir(config.dbPath)
  runMigrations(config.dbPath)

  const app = await createApp()

  await app.listen({ port: config.port, host: config.host })
  console.log(`Reading list server listening at http://${config.host}:${config.port}`)
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
