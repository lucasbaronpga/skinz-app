import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getSql } from "../lib/database.js"

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const migrationsDirectory = path.resolve(currentDirectory, "../database/migrations")
const migrationFilePattern = /^\d{3}_[a-z0-9_]+\.sql$/

function createChecksum(content) {
  return createHash("sha256").update(content, "utf8").digest("hex")
}

async function getMigrationFiles() {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && migrationFilePattern.test(entry.name))
    .map((entry) => entry.name)
    .sort((first, second) => first.localeCompare(second))
}

async function ensureMigrationTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      migration_name TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

async function getAppliedMigrations(sql) {
  const rows = await sql`
    SELECT migration_name, checksum
    FROM schema_migrations
    ORDER BY migration_name
  `

  return new Map(rows.map((row) => [row.migration_name, row.checksum]))
}

async function applyMigration(sql, migrationName, migrationSql, checksum) {
  await sql.transaction([
    sql.query(migrationSql),
    sql`
      INSERT INTO schema_migrations (migration_name, checksum)
      VALUES (${migrationName}, ${checksum})
    `,
  ])
}

async function migrateDatabase() {
  const sql = getSql()
  const migrationFiles = await getMigrationFiles()

  if (migrationFiles.length === 0) {
    console.log("No migration files found.")
    return
  }

  await ensureMigrationTable(sql)
  const appliedMigrations = await getAppliedMigrations(sql)
  let appliedCount = 0

  for (const migrationName of migrationFiles) {
    const migrationPath = path.join(migrationsDirectory, migrationName)
    const migrationSql = await readFile(migrationPath, "utf8")
    const checksum = createChecksum(migrationSql)
    const storedChecksum = appliedMigrations.get(migrationName)

    if (storedChecksum) {
      if (storedChecksum !== checksum) {
        throw new Error(
          `Migration ${migrationName} wurde nach ihrer Ausfuehrung veraendert.`
        )
      }

      console.log(`Skipped: ${migrationName}`)
      continue
    }

    await applyMigration(sql, migrationName, migrationSql, checksum)
    appliedCount += 1
    console.log(`Applied: ${migrationName}`)
  }

  console.log(
    appliedCount > 0
      ? `Database migration complete. Applied: ${appliedCount}`
      : "Database schema is already up to date."
  )
}

try {
  await migrateDatabase()
} catch (error) {
  console.error("Database migration failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
