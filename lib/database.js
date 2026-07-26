import { neon } from "@neondatabase/serverless"

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL ist nicht gesetzt.")
  }

  return databaseUrl
}

let sqlClient = null

export function getSql() {
  if (!sqlClient) {
    sqlClient = neon(getDatabaseUrl())
  }

  return sqlClient
}

export async function checkDatabaseConnection() {
  const sql = getSql()
  const rows = await sql`
    SELECT
      current_database() AS database_name,
      current_user AS database_user,
      version() AS database_version,
      NOW() AS checked_at
  `

  return rows[0]
}
