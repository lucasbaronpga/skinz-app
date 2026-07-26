import { checkDatabaseConnection } from "../lib/database.js"

function getPostgresVersion(value) {
  const match = String(value || "").match(/^PostgreSQL\s+([^\s]+)/i)
  return match?.[1] || "unbekannt"
}

try {
  const result = await checkDatabaseConnection()

  console.log("Database health check successful.")
  console.log(`Database: ${result.database_name}`)
  console.log(`Role: ${result.database_user}`)
  console.log(`PostgreSQL: ${getPostgresVersion(result.database_version)}`)
  console.log(`Checked at: ${new Date(result.checked_at).toISOString()}`)
} catch (error) {
  console.error("Database health check failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
