export const LEADERBOARD_COLUMNS = "grid-cols-[2.4rem_minmax(0,1fr)_3rem_3.4rem_4.6rem]"

export default function LeaderboardHeader({ valueLabel = "Earn" }) {
  return (
    <div
      className={`grid ${LEADERBOARD_COLUMNS} items-center gap-2 px-4 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink-mute`}
    >
      <span>Pos</span>
      <span>Spieler</span>
      <span className="text-right">Thru</span>
      <span className="text-right">Score</span>
      <span className="text-right">{valueLabel}</span>
    </div>
  )
}
