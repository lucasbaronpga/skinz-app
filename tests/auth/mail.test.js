/* global console, process */
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import { getAppBaseUrl, sendMail, MailNotConfiguredError } from "../../lib/mail.js"
import {
  accountExistsMail,
  passwordResetMail,
  verificationMail,
} from "../../lib/mailTemplates.js"

const ENV_KEYS = [
  "APP_BASE_URL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "NODE_ENV",
  "RESEND_API_KEY",
  "MAIL_FROM",
]
let savedEnvironment

function request(host = "localhost:3000", protocol) {
  return {
    headers: { host, ...(protocol ? { "x-forwarded-proto": protocol } : {}) },
  }
}

beforeEach(() => {
  savedEnvironment = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  ENV_KEYS.forEach((key) => delete process.env[key])
})

afterEach(() => {
  ENV_KEYS.forEach((key) => {
    if (savedEnvironment[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnvironment[key]
  })
})

describe("Basis-URL für E-Mail-Links", () => {
  it("bevorzugt APP_BASE_URL und entfernt den Schrägstrich am Ende", () => {
    process.env.APP_BASE_URL = "https://skinz.example.de/"
    process.env.VERCEL_ENV = "production"

    assert.equal(getAppBaseUrl(request("angreifer.example")), "https://skinz.example.de")
  })

  it("nutzt in Produktion die Produktions-Domain und ignoriert den Host-Header", () => {
    process.env.VERCEL_ENV = "production"
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "skinz-app.vercel.app"

    assert.equal(getAppBaseUrl(request("angreifer.example")), "https://skinz-app.vercel.app")
  })

  it("nutzt in Previews die Deployment-URL", () => {
    process.env.VERCEL_ENV = "preview"
    process.env.VERCEL_URL = "skinz-abc123.vercel.app"

    assert.equal(getAppBaseUrl(request("angreifer.example")), "https://skinz-abc123.vercel.app")
  })

  it("verwendet lokal den Host-Header", () => {
    process.env.VERCEL_ENV = "development"

    assert.equal(getAppBaseUrl(request("localhost:3000")), "http://localhost:3000")
    assert.equal(getAppBaseUrl(request("localhost:3000", "https")), "https://localhost:3000")
  })

  it("verweigert den Host-Header in Produktion ohne Konfiguration", () => {
    process.env.VERCEL_ENV = "production"

    assert.throws(() => getAppBaseUrl(request("angreifer.example")), /APP_BASE_URL/)
  })
})

describe("E-Mail-Versand", () => {
  it("gibt die Nachricht lokal im Terminal aus, statt sie zu senden", async () => {
    process.env.VERCEL_ENV = "development"

    const lines = []
    const originalLog = console.log

    console.log = (message) => lines.push(String(message))

    try {
      await sendMail({ to: "a@b.de", subject: "Betreff", text: "Hallo https://x.de/y", html: "<p></p>" })
    } finally {
      console.log = originalLog
    }

    assert.ok(lines.join("\n").includes("Hallo https://x.de/y"))
  })

  it("verweigert den Versand in Produktion ohne Konfiguration", async () => {
    process.env.VERCEL_ENV = "production"

    await assert.rejects(
      sendMail({ to: "a@b.de", subject: "s", text: "t", html: "h" }),
      MailNotConfiguredError
    )
  })
})

describe("E-Mail-Vorlagen", () => {
  const link = "https://skinz.example.de/verify-email#token=abc"

  it("enthalten Betreff, Link und Anrede in Text und HTML", () => {
    ;[verificationMail, passwordResetMail, accountExistsMail].forEach((build) => {
      const mail = build({ displayName: "Lucas", link })

      assert.ok(mail.subject.length > 0)
      assert.ok(mail.text.includes(link))
      assert.ok(mail.text.includes("Hallo Lucas,"))
      assert.ok(mail.html.includes(`href="${link}"`))
    })
  })

  it("maskiert HTML in Namen", () => {
    const mail = verificationMail({ displayName: '<script>alert("x")</script>', link })

    assert.ok(!mail.html.includes("<script>"))
    assert.ok(mail.html.includes("&lt;script&gt;"))
  })

  it("nennen die Gültigkeitsdauer", () => {
    assert.ok(verificationMail({ displayName: "A", link }).text.includes("24 Stunden"))
    assert.ok(passwordResetMail({ displayName: "A", link }).text.includes("eine Stunde"))
  })
})
