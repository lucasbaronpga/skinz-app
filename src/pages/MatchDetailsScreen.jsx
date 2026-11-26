import { useState } from "react"
import { ChevronLeft, ExternalLink } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import Scorecard from "../components/Scorecard"
import { useAuth } from "../context/AuthContext"
import useMatchHistory from "../hooks/useMatchHistory"
import { Button, Card, EmptyState, LeaderboardHeader, LeaderboardRow, Pill, ScreenHeader } from "../ui/index.js"
import cn from "../ui/cn.js"
import { getMoneyTextClass } from "../ui/scoreStyles.js"
import { formatCents, formatDate, formatSkinz } from "../utils/format.js"
import {
  describeHoleOutcome,
  eurosToCents,
  findMatch,
  getCoursePars,
  getHoleBadges,
  getMatchTitle,
  getModeLabel,
  getPairBreakdown,
  getScorecardRows,
  getStandings,
} from "../utils/matchHistory.js"
import { buildPayPalUrl } from "../utils/paypal.js"

function Section({ title, hint, children }) {
  return (
    <section className="mt-9">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">{title}</h2>
        {hint && <span className="text-xs font-medium text-ink-mute">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

function Page({ children }) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">{children}</div>
    </div>
  )
}

function Payments({ match, userId }) {
  const settlements = Array.isArray(match.settlements) ? match.settlements : []

  if (settlements.length === 0) {
    return (
      <Card className="px-4 py-5 text-center text-sm font-semibold text-ink-mute">
        Keine Zahlungen nötig, alle sind ausgeglichen.
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {settlements.map((payment) => {
        const amountCents = eurosToCents(payment.amount)
        const iPay = String(payment.payerUserId) === String(userId)
        const payPalUrl = iPay ? buildPayPalUrl(payment.recipientPayPalLink, amountCents) : null

        return (
          <div key={payment.id} className="border-b border-line/10 px-4 py-3.5 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-[15px] font-semibold text-ink">
                {payment.payerName}
                <span className="font-medium text-ink-mute"> zahlt </span>
                {payment.recipientName}
              </span>
              <span className="shrink-0 text-lg font-bold tabular-nums text-ink">{formatCents(amountCents)}</span>
            </div>
            {payPalUrl && (
              <a
                href={payPalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent mt-3 w-full"
              >
                Mit PayPal zahlen
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            )}
          </div>
        )
      })}
    </Card>
  )
}

function PairBreakdown({ match, player }) {
  const pairs = getPairBreakdown(match, player.userId)
  const hasOozle = Boolean(match.oozleConfig?.enabled) && pairs.some((pair) => pair.oozleCents !== 0)

  return (
    <div className="bg-fill/60 px-4 py-3">
      {pairs.map((pair) => (
        <div key={pair.opponentId} className="flex items-center justify-between gap-3 py-1.5">
          <span className="min-w-0 text-sm font-medium text-ink-soft">
            gegen <span className="font-semibold text-ink">{pair.opponentName}</span>
            <span className="block text-xs text-ink-mute">
              {pair.skinzDifference > 0 ? "+" : ""}
              {pair.skinzDifference} Skinz Differenz
              {hasOozle && ` · Oozle ${formatCents(pair.oozleCents, { signed: true })}`}
            </span>
          </span>
          <span className={cn("shrink-0 font-bold tabular-nums", getMoneyTextClass(pair.totalCents))}>
            {formatCents(pair.totalCents, { signed: true })}
          </span>
        </div>
      ))}
      {!pairs.some((pair) => pair.exact) && match.oozleConfig?.enabled && (
        <p className="pt-1 text-xs font-medium text-ink-mute">Ältere Runde: Aufschlüsselung ohne Oozle.</p>
      )}
    </div>
  )
}

export default function MatchDetailsScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { loading, matches, error } = useMatchHistory()
  const [openPlayerId, setOpenPlayerId] = useState(null)
  const match = findMatch(matches, id)

  if (loading) {
    return (
      <Page>
        <p className="pt-16 text-center text-sm font-medium text-ink-mute">Runde wird geladen …</p>
      </Page>
    )
  }

  if (!match) {
    return (
      <Page>
        <EmptyState
          className="mt-10"
          title={error ? "Laden fehlgeschlagen" : "Runde nicht gefunden"}
          description={error || "Diese Runde gibt es nicht mehr oder du warst nicht dabei."}
          action={
            <Button variant="primary" onClick={() => navigate("/matches")}>
              Zum Archiv
            </Button>
          }
        />
      </Page>
    )
  }

  const standings = getStandings(match, user?.id)
  const pars = getCoursePars(match)
  const holes = [...(match.holes ?? [])].sort((first, second) => first.holeNumber - second.holeNumber)
  const isCompleted = match.status === "completed"
  const stakeCents = eurosToCents(match.stake)

  return (
    <Page>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/matches")}
          aria-label="Zurück zum Archiv"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-ink shadow-[var(--shadow-chip)]"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <Pill tone={isCompleted ? "dark" : "positive"}>{isCompleted ? "Beendet" : "Live"}</Pill>
          <Pill>{match.matchCode}</Pill>
        </div>
      </div>

      <ScreenHeader
        className="mt-5"
        eyebrow={[getModeLabel(match), formatDate(match.completedAt || match.startedAt)].filter(Boolean).join(" · ")}
        title={getMatchTitle(match)}
        subtitle={[
          match.course?.clubName ? match.course?.name : null,
          `${match.holeCount} Löcher`,
          `${formatCents(stakeCents)} pro Skin`,
          match.oozleConfig?.enabled ? `Oozle ${formatCents(eurosToCents(match.oozleConfig.value))}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      {isCompleted && (
        <Section title="Endabrechnung">
          <Payments match={match} userId={user?.id} />
        </Section>
      )}

      <Section title="Ergebnis" hint="Spieler antippen für Details">
        <LeaderboardHeader />
        {standings.map((player) => (
          <div key={player.userId}>
            <button
              type="button"
              className="block w-full text-left"
              aria-expanded={openPlayerId === player.userId}
              onClick={() => setOpenPlayerId((current) => (current === player.userId ? null : player.userId))}
            >
              <LeaderboardRow
                position={player.position}
                name={player.name}
                shortName={`${player.shortName ? `${player.shortName} · ` : ""}${formatSkinz(player.skinz)}`}
                thru={isCompleted ? "F" : holes.length}
                toPar={player.totalToPar}
                earningsCents={player.totalCents}
                highlight={player.isMe}
              />
            </button>
            {openPlayerId === player.userId && <PairBreakdown match={match} player={player} />}
          </div>
        ))}
      </Section>

      {pars.length > 0 && (
        <Section title="Scorecard">
          <Scorecard pars={pars} rows={getScorecardRows(match)} />
        </Section>
      )}

      {holes.length > 0 && (
        <Section title="Loch für Loch">
          <Card className="overflow-hidden">
            {holes.map((hole, index) => {
              const outcome = describeHoleOutcome(holes, index, match.holeCount)
              const badges = getHoleBadges(match, hole)

              return (
                <div key={hole.id} className="border-b border-line/10 px-4 py-3.5 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="shrink-0">
                      <div className="font-bold text-ink">Loch {hole.holeNumber}</div>
                      <div className="text-xs font-medium text-ink-mute">Par {hole.par}</div>
                    </div>
                    <div className="min-w-0 text-right">
                      <div className={cn("font-bold", hole.hasTie ? "text-ink-mute" : "text-ink")}>{outcome.title}</div>
                      {outcome.detail && <div className="text-xs font-medium text-ink-mute">{outcome.detail}</div>}
                    </div>
                  </div>
                  {badges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {badges.map((badge) => (
                        <Pill key={badge.label} tone={badge.tone} className="normal-case">
                          {badge.label}
                        </Pill>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
        </Section>
      )}
    </Page>
  )
}
