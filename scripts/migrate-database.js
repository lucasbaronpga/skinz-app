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

function splitSqlStatements(content) {
  const statements = []
  let statement = ""
  let singleQuoted = false
  let doubleQuoted = false
  let lineComment = false
  let blockComment = false
  let dollarQuoteTag = null

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    const nextCharacter = content[index + 1]

    if (lineComment) {
      statement += character
      if (character === "\n") lineComment = false
      continue
    }

    if (blockComment) {
      statement += character
      if (character === "*" && nextCharacter === "/") {
        statement += nextCharacter
        index += 1
        blockComment = false
      }
      continue
    }

    if (!singleQuoted && !doubleQuoted && !dollarQuoteTag) {
      if (character === "-" && nextCharacter === "-") {
        statement += character + nextCharacter
        index += 1
        lineComment = true
        continue
      }

      if (character === "/" && nextCharacter === "*") {
        statement += character + nextCharacter
        index += 1
        blockComment = true
        continue
      }

      if (character === "$") {
        const remainingContent = content.slice(index)
        const dollarQuoteMatch = remainingContent.match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/)

        if (dollarQuoteMatch) {
          dollarQuoteTag = dollarQuoteMatch[0]
          statement += dollarQuoteTag
          index += dollarQuoteTag.length - 1
          continue
        }
      }
    } else if (dollarQuoteTag && content.startsWith(dollarQuoteTag, index)) {
      statement += dollarQuoteTag
      index += dollarQuoteTag.length - 1
      dollarQuoteTag = null
      continue
    }

    if (!doubleQuoted && !dollarQuoteTag && character === "'") {
      statement += character

      if (singleQuoted && nextCharacter === "'") {
        statement += nextCharacter
        index += 1
      } else {
        singleQuoted = !singleQuoted
      }
      continue
    }

    if (!singleQuoted && !dollarQuoteTag && character === '"') {
      statement += character

      if (doubleQuoted && nextCharacter === '"') {
        statement += nextCharacter
        index += 1
      } else {
        doubleQuoted = !doubleQuoted
      }
      continue
    }

    if (
      character === ";" &&
      !singleQuoted &&
      !doubleQuoted &&
      !dollarQuoteTag
    ) {
      const normalizedStatement = statement.trim()
      if (normalizedStatement) statements.push(normalizedStatement)
      statement = ""
      continue
    }

    statement += character
  }

  const finalStatement = statement.trim()
  if (finalStatement) statements.push(finalStatement)

  if (singleQuoted || doubleQuoted || blockComment || dollarQuoteTag) {
    throw new Error("Die SQL-Migration enthaelt einen nicht abgeschlossenen Ausdruck.")
  }

  return statements
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
  const statements = splitSqlStatements(migrationSql)

  if (statements.length === 0) {
    throw new Error(`Migration ${migrationName} enthaelt keine SQL-Anweisungen.`)
  }

  const transactionQueries = statements.map((statement) => sql.query(statement))
  transactionQueries.push(
    sql`
      INSERT INTO schema_migrations (migration_name, checksum)
      VALUES (${migrationName}, ${checksum})
    `
  )

  await sql.transaction(transactionQueries)
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
