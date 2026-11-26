import {
  clearSessionCookie,
  createSession,
  getSession,
  hashPassword,
  revokeSession,
  setSessionCookie,
  toPublicUser,
  verifyLogin,
} from "./auth.js"
import {
  TOKEN_PURPOSES,
  confirmEmailWithToken,
  createAuthToken,
  isWellFormedToken,
  resetPasswordWithToken,
} from "./authTokens.js"
import { getSql } from "./database.js"
import { getClientIp, readBody, sendError, sendJson } from "./http.js"
import { getAppBaseUrl, sendMail } from "./mail.js"
import { accountExistsMail, passwordResetMail, verificationMail } from "./mailTemplates.js"
import { RATE_LIMITS, hashIdentifier, isRateLimited, recordAuthEvent } from "./rateLimit.js"
import {
  isValidEmail,
  normalizeDisplayName,
  normalizeEmail,
  normalizeHandicapIndex,
  normalizeShortName,
  validatePassword,
  validateRegistration,
} from "./validation.js"

const MAXIMUM_LOGIN_PASSWORD_LENGTH = 200

const MESSAGES = Object.freeze({
  tooManyLoginAttempts:
    "Zu viele fehlgeschlagene Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.",
  tooManyRequests: "Zu viele Anfragen. Bitte später erneut versuchen.",
  invalidCredentials: "E-Mail oder Passwort ist ungültig.",
  emailNotVerified: "Bitte bestätige zuerst deine E-Mail-Adresse.",
  accountBlocked: "Das Benutzerkonto ist gesperrt.",
  accountInactive: "Das Benutzerkonto ist nicht aktiv.",
  registered:
    "Fast geschafft: Wir senden dir eine E-Mail mit einem Bestätigungslink. Bitte bestätige deine Adresse, bevor du dich anmeldest.",
  verificationResent:
    "Wenn für diese Adresse noch eine Bestätigung aussteht, haben wir dir eine neue E-Mail gesendet.",
  passwordResetRequested:
    "Wenn ein Konto mit dieser Adresse existiert, haben wir dir eine E-Mail zum Zurücksetzen des Passworts gesendet.",
  invalidVerificationLink:
    "Der Bestätigungslink ist ungültig oder abgelaufen. Du kannst auf der Anmeldeseite einen neuen anfordern.",
  invalidResetLink:
    "Der Link zum Zurücksetzen ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
  shortNameTaken: "Dieses Kürzel ist bereits vergeben.",
  homeClubUnavailable: "Der ausgewählte Heimatclub ist nicht verfügbar.",
})

function getRateLimitContext(request, email) {
  return {
    ipAddress: getClientIp(request),
    identifierHash: hashIdentifier(email),
  }
}

/** Mail-Fehler werden nur protokolliert, damit die Antwort nichts über Konten verrät. */
async function deliverSafely(task) {
  try {
    await task()
  } catch (error) {
    console.error("Mail delivery failed.", error)
  }
}

async function sendVerificationMail(request, user) {
  const token = await createAuthToken(user.id, TOKEN_PURPOSES.EMAIL_VERIFICATION)
  const link = `${getAppBaseUrl(request)}/verify-email#token=${token}`

  await sendMail({
    to: user.email,
    ...verificationMail({ displayName: user.display_name, link }),
  })
}

async function sendPasswordResetMail(request, user) {
  const token = await createAuthToken(user.id, TOKEN_PURPOSES.PASSWORD_RESET)
  const link = `${getAppBaseUrl(request)}/reset-password#token=${token}`

  await sendMail({
    to: user.email,
    ...passwordResetMail({ displayName: user.display_name, link }),
  })
}

async function sendAccountExistsMail(request, user) {
  const link = `${getAppBaseUrl(request)}/forgot-password`

  await sendMail({
    to: user.email,
    ...accountExistsMail({ displayName: user.display_name, link }),
  })
}

async function findUserByEmail(email) {
  const sql = getSql()
  const users = await sql`
    SELECT id, email, display_name, status
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `

  return users[0] || null
}

async function findActiveHomeClub(homeClubId) {
  if (!homeClubId) return null

  const sql = getSql()
  const clubs = await sql`
    SELECT id
    FROM golf_clubs
    WHERE id = ${homeClubId}
      AND is_active = TRUE
    LIMIT 1
  `

  return clubs[0] || null
}

async function login(request, response) {
  const body = readBody(request)
  const email = normalizeEmail(body.email)
  const password = String(body.password ?? "")

  if (!email || !password) {
    return sendError(response, 400, "Bitte E-Mail-Adresse und Passwort eingeben.")
  }

  const context = getRateLimitContext(request, email)

  if (await isRateLimited(RATE_LIMITS.login, context)) {
    return sendError(response, 429, MESSAGES.tooManyLoginAttempts)
  }

  const user =
    password.length > MAXIMUM_LOGIN_PASSWORD_LENGTH ? null : await verifyLogin(email, password)

  if (!user) {
    await recordAuthEvent(RATE_LIMITS.login, context)
    return sendError(response, 401, MESSAGES.invalidCredentials)
  }

  if (user.status === "pending") {
    return sendError(response, 403, MESSAGES.emailNotVerified, "EMAIL_NOT_VERIFIED")
  }

  if (user.status === "blocked") {
    return sendError(response, 403, MESSAGES.accountBlocked)
  }

  if (user.status !== "active") {
    return sendError(response, 403, MESSAGES.accountInactive)
  }

  const rememberMe = body.rememberMe === true
  const sessionToken = await createSession(user.id, request, { rememberMe })

  setSessionCookie(response, sessionToken, request, { rememberMe })

  return sendJson(response, 200, {
    authenticated: true,
    user: toPublicUser(user),
  })
}

async function logout(request, response) {
  try {
    await revokeSession(request)
  } catch (error) {
    console.error("Logout failed.", error)
    clearSessionCookie(response, request)
    return sendError(response, 500, "Abmeldung derzeit nicht möglich.")
  }

  clearSessionCookie(response, request)

  return sendJson(response, 200, { authenticated: false })
}

async function session(request, response) {
  const currentSession = await getSession(request)

  if (!currentSession) {
    return sendJson(response, 401, { authenticated: false })
  }

  return sendJson(response, 200, {
    authenticated: true,
    user: toPublicUser(currentSession),
  })
}

async function register(request, response) {
  const body = readBody(request)
  const registration = {
    email: normalizeEmail(body.email),
    password: String(body.password ?? ""),
    displayName: normalizeDisplayName(body.displayName),
    shortName: normalizeShortName(body.shortName),
    handicapIndex: normalizeHandicapIndex(body.handicapIndex),
  }
  const homeClubId = String(body.homeClubId ?? "").trim() || null
  const validationError = validateRegistration(registration)

  if (validationError) {
    return sendError(response, 400, validationError)
  }

  const context = getRateLimitContext(request, registration.email)

  if (await isRateLimited(RATE_LIMITS.registration, context)) {
    return sendError(response, 429, MESSAGES.tooManyRequests)
  }

  await recordAuthEvent(RATE_LIMITS.registration, context)

  const sql = getSql()
  const shortNameOwners = await sql`
    SELECT id FROM users WHERE short_name = ${registration.shortName} LIMIT 1
  `

  if (shortNameOwners.length > 0) {
    return sendError(response, 409, MESSAGES.shortNameTaken)
  }

  if (homeClubId && !(await findActiveHomeClub(homeClubId))) {
    return sendError(response, 400, MESSAGES.homeClubUnavailable)
  }

  // Das Passwort wird immer gehasht, damit die Antwortzeit nicht verrät, ob die Adresse bekannt ist.
  const passwordHash = await hashPassword(registration.password)
  const existingUser = await findUserByEmail(registration.email)

  if (existingUser) {
    if (existingUser.status === "pending") {
      await deliverSafely(() => sendVerificationMail(request, existingUser))
    } else if (existingUser.status === "active") {
      await deliverSafely(() => sendAccountExistsMail(request, existingUser))
    }

    return sendJson(response, 202, { registered: true, message: MESSAGES.registered })
  }

  try {
    const insertedUsers = await sql`
      INSERT INTO users (
        email,
        password_hash,
        display_name,
        short_name,
        role,
        status,
        handicap_index,
        home_club_id
      )
      VALUES (
        ${registration.email},
        ${passwordHash},
        ${registration.displayName},
        ${registration.shortName},
        'user',
        'pending',
        ${registration.handicapIndex},
        ${homeClubId}
      )
      RETURNING id, email, display_name
    `

    await deliverSafely(() => sendVerificationMail(request, insertedUsers[0]))
  } catch (error) {
    if (error?.code !== "23505") throw error

    if (String(error.constraint || "").includes("short_name")) {
      return sendError(response, 409, MESSAGES.shortNameTaken)
    }
    // Gleichzeitige Registrierung derselben Adresse: neutral antworten.
  }

  return sendJson(response, 202, { registered: true, message: MESSAGES.registered })
}

async function verifyEmail(request, response) {
  const { token } = readBody(request)

  if (!isWellFormedToken(token) || !(await confirmEmailWithToken(token))) {
    return sendError(response, 400, MESSAGES.invalidVerificationLink)
  }

  return sendJson(response, 200, { verified: true })
}

async function resendVerification(request, response) {
  const email = normalizeEmail(readBody(request).email)

  if (!isValidEmail(email)) {
    return sendError(response, 400, "Bitte eine gültige E-Mail-Adresse eingeben.")
  }

  const context = getRateLimitContext(request, email)

  if (await isRateLimited(RATE_LIMITS.verification, context)) {
    return sendError(response, 429, MESSAGES.tooManyRequests)
  }

  await recordAuthEvent(RATE_LIMITS.verification, context)

  const user = await findUserByEmail(email)

  if (user?.status === "pending") {
    await deliverSafely(() => sendVerificationMail(request, user))
  }

  return sendJson(response, 200, { message: MESSAGES.verificationResent })
}

async function forgotPassword(request, response) {
  const email = normalizeEmail(readBody(request).email)

  if (!isValidEmail(email)) {
    return sendError(response, 400, "Bitte eine gültige E-Mail-Adresse eingeben.")
  }

  const context = getRateLimitContext(request, email)

  if (await isRateLimited(RATE_LIMITS.passwordReset, context)) {
    return sendError(response, 429, MESSAGES.tooManyRequests)
  }

  await recordAuthEvent(RATE_LIMITS.passwordReset, context)

  const user = await findUserByEmail(email)

  if (user?.status === "active") {
    await deliverSafely(() => sendPasswordResetMail(request, user))
  } else if (user?.status === "pending") {
    await deliverSafely(() => sendVerificationMail(request, user))
  }

  return sendJson(response, 200, { message: MESSAGES.passwordResetRequested })
}

async function resetPassword(request, response) {
  const { token, password } = readBody(request)

  if (!isWellFormedToken(token)) {
    return sendError(response, 400, MESSAGES.invalidResetLink)
  }

  const passwordError = validatePassword(String(password ?? ""))

  if (passwordError) {
    return sendError(response, 400, passwordError)
  }

  const passwordHash = await hashPassword(password)

  if (!(await resetPasswordWithToken(token, passwordHash))) {
    return sendError(response, 400, MESSAGES.invalidResetLink)
  }

  return sendJson(response, 200, { reset: true })
}

export const authActions = Object.freeze({
  login: { method: "POST", handle: login, errorMessage: "Anmeldung derzeit nicht möglich." },
  logout: { method: "POST", handle: logout, errorMessage: "Abmeldung derzeit nicht möglich." },
  register: {
    method: "POST",
    handle: register,
    errorMessage: "Registrierung derzeit nicht möglich.",
  },
  session: {
    method: "GET",
    handle: session,
    errorMessage: "Sitzung konnte nicht geprüft werden.",
  },
  "verify-email": {
    method: "POST",
    handle: verifyEmail,
    errorMessage: "Die E-Mail-Adresse konnte nicht bestätigt werden.",
  },
  "resend-verification": {
    method: "POST",
    handle: resendVerification,
    errorMessage: "Die E-Mail konnte nicht gesendet werden.",
  },
  "forgot-password": {
    method: "POST",
    handle: forgotPassword,
    errorMessage: "Die Anfrage konnte nicht verarbeitet werden.",
  },
  "reset-password": {
    method: "POST",
    handle: resetPassword,
    errorMessage: "Das Passwort konnte nicht zurückgesetzt werden.",
  },
})
