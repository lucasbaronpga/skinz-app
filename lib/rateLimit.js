import { createHash } from "node:crypto"
import { getSql } from "./database.js"

export const RATE_LIMITS = Object.freeze({
  login: { kind: "login_failed", windowMinutes: 15, perIp: 10, perIdentifier: 10 },
  registration: { kind: "registration", windowMinutes: 60, perIp: 10, perIdentifier: 3 },
  verification: { kind: "verification_request", windowMinutes: 60, perIp: 10, perIdentifier: 3 },
  passwordReset: { kind: "password_reset_request", windowMinutes: 60, perIp: 10, perIdentifier: 3 },
})

/** E-Mail-Adressen werden für die Begrenzung nur als Hash gespeichert. */
export function hashIdentifier(value) {
  return createHash("sha256")
    .update(String(value).trim().toLowerCase(), "utf8")
    .digest("hex")
}

export async function isRateLimited(rule, { ipAddress, identifierHash }) {
  const sql = getSql()
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE ip_address = ${ipAddress}::inet)::int AS by_ip,
      COUNT(*) FILTER (WHERE identifier_hash = ${identifierHash})::int AS by_identifier
    FROM auth_events
    WHERE kind = ${rule.kind}
      AND created_at > NOW() - make_interval(mins => ${rule.windowMinutes}::int)
      AND (ip_address = ${ipAddress}::inet OR identifier_hash = ${identifierHash})
  `
  const { by_ip: byIp, by_identifier: byIdentifier } = rows[0]

  return byIp >= rule.perIp || byIdentifier >= rule.perIdentifier
}

export async function recordAuthEvent(rule, { ipAddress, identifierHash }) {
  const sql = getSql()

  await sql`
    INSERT INTO auth_events (kind, identifier_hash, ip_address)
    VALUES (${rule.kind}, ${identifierHash}, ${ipAddress}::inet)
  `
}
