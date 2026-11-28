import { useState } from "react"
import { Check, ChevronLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import Avatar from "../components/Avatar"
import { useAuth } from "../context/AuthContext"
import useApi from "../hooks/useApi"
import { Button, Card } from "../ui/index.js"
import cn from "../ui/cn.js"
import { apiRequest, getErrorMessage } from "../utils/api.js"
import { buildPayPalUrl } from "../utils/paypal.js"

const AVATAR_COLORS = ["#0a0a0a", "#006847", "#1e5aa8", "#b3261e", "#c27c0e", "#6b3fa0", "#0f766e", "#64748b"]

const VISIBILITY_OPTIONS = [
  { key: "leaderboardAnonymous", label: "Im Leaderboard anonym", hint: "Andere sehen nur dein Kürzel." },
  { key: "showStats", label: "Statistik sichtbar", hint: "Gewinn, Skinz, Siege und Verlauf." },
  { key: "showHandicap", label: "Offizielles HCP sichtbar", hint: "" },
  { key: "showHomeClub", label: "Heimatclub sichtbar", hint: "" },
]

const INPUT_CLASS =
  "mt-2 h-12 w-full rounded-2xl border border-line/15 bg-card px-4 text-base font-semibold text-ink outline-none focus:border-fairway focus:ring-4 focus:ring-emerald-100"

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {hint && <span className="ml-2 text-xs font-medium text-ink-mute">{hint}</span>}
      {children}
    </label>
  )
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-8 w-14 shrink-0 rounded-full transition-colors", checked ? "bg-fairway" : "bg-fill")}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-6"
        )}
      />
    </button>
  )
}

function toForm(profile) {
  return {
    displayName: profile.displayName ?? "",
    shortName: profile.shortName ?? "",
    handicapIndex: profile.handicapIndex ?? "",
    homeClubId: profile.homeClubId ?? "",
    avatarColor: profile.avatarColor ?? "",
    paypalLink: profile.paypalLink ?? "",
    visibility: { ...profile.visibility },
  }
}

function ProfileForm({ profile, clubs }) {
  const navigate = useNavigate()
  const { checkSession } = useAuth()
  const [form, setForm] = useState(() => toForm(profile))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const payPalValid = !form.paypalLink.trim() || Boolean(buildPayPalUrl(form.paypalLink, 100))

  function update(changes) {
    setForm((current) => ({ ...current, ...changes }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setBusy(true)

    try {
      await apiRequest("/api/stats/profile", {
        method: "POST",
        body: {
          ...form,
          handicapIndex: form.handicapIndex === "" ? null : Number(String(form.handicapIndex).replace(",", ".")),
        },
      })
      await checkSession()
      navigate("/profile", { replace: true })
    } catch (submitError) {
      setError(getErrorMessage(submitError))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mt-6 flex items-center gap-4">
        <Avatar shortName={form.shortName} name={form.displayName} color={form.avatarColor || null} size="lg" />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Farbe">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={form.avatarColor === color}
              aria-label={`Farbe ${color}`}
              onClick={() => update({ avatarColor: color })}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-white",
                form.avatarColor === color && "ring-2 ring-offset-2 ring-emerald-200"
              )}
              style={{ backgroundColor: color }}
            >
              {form.avatarColor === color && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-8 space-y-5 p-4">
        <Field label="Name">
          <input className={INPUT_CLASS} value={form.displayName} onChange={(e) => update({ displayName: e.target.value })} autoComplete="name" />
        </Field>
        <Field label="Kürzel" hint="2–4 Zeichen, eindeutig">
          <input
            className={INPUT_CLASS}
            value={form.shortName}
            maxLength={4}
            autoCapitalize="characters"
            onChange={(e) => update({ shortName: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) })}
          />
        </Field>
        <Field label="Offizielles HCP" hint="optional">
          <input
            className={INPUT_CLASS}
            value={form.handicapIndex}
            inputMode="decimal"
            placeholder="z. B. 12,4"
            onChange={(e) => update({ handicapIndex: e.target.value.replace(/[^0-9,.-]/g, "") })}
          />
        </Field>
        <Field label="Heimatclub" hint="optional">
          <select className={INPUT_CLASS} value={form.homeClubId} onChange={(e) => update({ homeClubId: e.target.value })}>
            <option value="">Kein Heimatclub</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {[club.name, club.location].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="PayPal.me-Link" hint="optional">
          <input
            className={INPUT_CLASS}
            value={form.paypalLink}
            placeholder="paypal.me/deinname"
            autoCapitalize="none"
            autoCorrect="off"
            onChange={(e) => update({ paypalLink: e.target.value })}
          />
          {!payPalValid && <span className="mt-1 block text-xs font-semibold text-red-600">Bitte einen PayPal.me-Link eingeben.</span>}
          <span className="mt-1 block text-xs font-medium text-ink-mute">Sehen nur Mitspieler, die dir aus einem Match Geld schulden.</span>
        </Field>
      </Card>

      <h2 className="mb-3 mt-9 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">Sichtbarkeit</h2>
      <Card className="overflow-hidden">
        {VISIBILITY_OPTIONS.map((option) => (
          <div key={option.key} className="flex items-center justify-between gap-4 border-b border-line/10 px-4 py-3.5 last:border-b-0">
            <div>
              <div className="font-semibold text-ink">{option.label}</div>
              {option.hint && <div className="text-xs font-medium text-ink-mute">{option.hint}</div>}
            </div>
            <Switch
              label={option.label}
              checked={Boolean(form.visibility[option.key])}
              onChange={(value) => update({ visibility: { ...form.visibility, [option.key]: value } })}
            />
          </div>
        ))}
      </Card>
      <p className="mt-2 text-xs font-medium text-ink-mute">Deine E-Mail-Adresse sehen nur du und der Admin.</p>

      {error && (
        <div role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" variant="primary" size="lg" className="mt-8 w-full" disabled={busy || !payPalValid}>
        {busy ? "Wird gespeichert …" : "Speichern"}
      </Button>
    </form>
  )
}

export default function ProfileEditScreen() {
  const navigate = useNavigate()
  const { data, error } = useApi("/api/stats/me")
  const { data: clubData } = useApi("/api/stats/clubs")

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            aria-label="Zurück zum Profil"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-ink shadow-[var(--shadow-chip)]"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <h1 className="text-[1.6rem] font-bold tracking-[-0.04em]">Profil bearbeiten</h1>
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!data && !error && <p className="mt-10 text-center text-sm font-medium text-ink-mute">Wird geladen …</p>}

        {data?.profile && <ProfileForm profile={data.profile} clubs={clubData?.clubs ?? []} />}
      </div>
    </div>
  )
}
