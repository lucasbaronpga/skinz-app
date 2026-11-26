import { ArrowRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button, Card, Pill } from "../ui/index.js"
import { formatCents, formatSkinz } from "../utils/format.js"
import { getCourseTitle, getHolesPlayed, getLeaderName, getModeTitle, getStandings } from "../utils/liveMatch.js"

/** Dunkle Live-Karte auf Home für das laufende oder pausierte Match. */
export default function HomeLiveMatchCard({ match, className }) {
  const navigate = useNavigate()
  const me = getStandings(match).find((player) => player.isMe)
  const holesPlayed = getHolesPlayed(match)
  const isPaused = match.status === "paused"
  const currentHole = Math.min(holesPlayed + 1, match.course.holeCount)

  return (
    <Card variant="hero" className={className}>
      <button
        type="button"
        onClick={() => navigate(`/live/${match.id}`)}
        className="block w-full p-5 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold uppercase tracking-[0.04em] text-white/60">
              {getModeTitle(match)} · {match.matchCode}
            </div>
            <div className="mt-3 text-[2.4rem] font-bold leading-none tracking-[-0.045em]">
              Loch {currentHole}
            </div>
            <div className="mt-2 truncate text-sm font-medium text-white/60">{getCourseTitle(match)}</div>
          </div>
          <Pill tone="dark" className={isPaused ? "bg-amber-300 text-black" : "bg-white/15 text-white"}>
            {isPaused ? "Pausiert" : "Live"}
          </Pill>
        </div>

        <div className="mt-6 grid grid-cols-2 items-end gap-3">
          <div>
            <div className="text-[2rem] font-bold leading-none tracking-[-0.05em] tabular-nums text-amber-300">
              {formatSkinz(me?.skinz ?? 0)}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/55">
              Deine Skinz
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-[2rem] font-bold leading-none tracking-[-0.05em] tabular-nums ${
                (me?.totalCents ?? 0) < 0 ? "text-red-300" : "text-amber-300"
              }`}
            >
              {formatCents(me?.totalCents ?? 0, { signed: true })}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/55">
              Earnings
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4 text-sm font-medium text-white/60">
          Leading: <span className="font-bold text-white">{getLeaderName(match)}</span>
        </div>
      </button>

      <div className="px-5 pb-5">
        <Button variant="glass" size="lg" className="w-full justify-between" onClick={() => navigate(`/live/${match.id}`)}>
          {match.canScore ? "Weiterspielen" : isPaused && match.canControl ? "Fortsetzen" : "Live verfolgen"}
          <ArrowRight size={20} aria-hidden="true" />
        </Button>
      </div>
    </Card>
  )
}
