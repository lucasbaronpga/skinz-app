import bcrypt from "bcryptjs"
import { getSql } from "../lib/database.js"

const BCRYPT_ROUNDS = 12
const MINIMUM_PASSWORD_LENGTH = 12

function getRequiredEnvironmentVariable(name) {
  const value = String(process.env[name] || "").trim()

  if (!value) {
    throw new Error(`${name} ist nicht gesetzt.`)
  }

  return value
}

function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function validateEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(email)) {
    throw new Error("SKINZ_ADMIN_EMAIL ist keine gueltige E-Mail-Adresse.")
  }
}

function validatePassword(password) {
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new Error(
      `SKINZ_ADMIN_PASSWORD muss mindestens ${MINIMUM_PASSWORD_LENGTH} Zeichen enthalten.`
    )
  }

  if (bcrypt.truncates(password)) {
    throw new Error("SKINZ_ADMIN_PASSWORD darf in UTF-8 maximal 72 Bytes lang sein.")
  }
}

async function createAdmin() {
  const email = normalizeEmail(getRequiredEnvironmentVariable("SKINZ_ADMIN_EMAIL"))
  const password = getRequiredEnvironmentVariable("SKINZ_ADMIN_PASSWORD")
  const displayName = getRequiredEnvironmentVariable("SKINZ_ADMIN_NAME")

  validateEmail(email)
  validatePassword(password)

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const sql = getSql()
  const existingUsers = await sql`
    SELECT id, role, status
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `
  const existingUser = existingUsers[0]

  if (existingUser?.role === "admin" && existingUser?.status === "active") {
    console.log("Admin account already exists and is active.")
    return
  }

  if (existingUser) {
    await sql.transaction([
      sql`
        UPDATE users
        SET
          password_hash = ${passwordHash},
          display_name = ${displayName},
          role = 'admin',
          status = 'active',
          approved_at = COALESCE(approved_at, NOW()),
          approved_by = COALESCE(approved_by, id),
          blocked_at = NULL,
          updated_at = NOW()
        WHERE id = ${existingUser.id}
      `,
      sql`
        INSERT INTO admin_audit_logs (
          admin_user_id,
          action,
          target_type,
          target_id,
          new_data,
          reason
        )
        VALUES (
          ${existingUser.id},
          'user.promoted_to_admin',
          'user',
          ${existingUser.id},
          ${JSON.stringify({ role: "admin", status: "active" })}::jsonb,
          'Initial Skinz administrator setup'
        )
      `,
    ])

    console.log("Existing account promoted to active administrator.")
    return
  }

  const insertedUsers = await sql`
    INSERT INTO users (
      email,
      password_hash,
      display_name,
      role,
      status
    )
    VALUES (
      ${email},
      ${passwordHash},
      ${displayName},
      'admin',
      'active'
    )
    RETURNING id
  `
  const adminId = insertedUsers[0].id

  await sql.transaction([
    sql`
      UPDATE users
      SET
        approved_at = NOW(),
        approved_by = id,
        updated_at = NOW()
      WHERE id = ${adminId}
    `,
    sql`
      INSERT INTO admin_audit_logs (
        admin_user_id,
        action,
        target_type,
        target_id,
        new_data,
        reason
      )
      VALUES (
        ${adminId},
        'user.admin_created',
        'user',
        ${adminId},
        ${JSON.stringify({ role: "admin", status: "active" })}::jsonb,
        'Initial Skinz administrator setup'
      )
    `,
  ])

  console.log("Active administrator account created successfully.")
}

try {
  await createAdmin()
} catch (error) {
  console.error("Administrator setup failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
