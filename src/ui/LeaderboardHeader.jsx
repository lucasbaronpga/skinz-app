export const LEADERBOARD_COLUMNS = "grid-cols-[2.2rem_minmax(0,1fr)_2.6rem_3.2rem_4.6rem]"

export default function LeaderboardHeader({ valueLabel = "Earn" }) {
  return (
    <div
      className={`grid ${LEADERBOARD_COLUMNS} items-center gap-2 border-b border-line/20 px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute`}
    >
      <span>Pos</span>
      <span>Spieler</span>
      <span className="text-right">Thru</span>
      <span className="text-right">Score</span>
      <span className="text-right">{valueLabel}</span>
    </div>
  )
}
