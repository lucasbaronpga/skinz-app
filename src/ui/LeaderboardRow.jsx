import { LEADERBOARD_COLUMNS } from "./LeaderboardHeader.jsx"
import cn from "./cn.js"
import { getMoneyTextClass, getToParTextClass } from "./scoreStyles.js"
import { formatCents, formatToPar } from "../utils/format.js"

/**
 * Leaderboard-Zeile im PGA-Tour-Stil. Mit `anonymous` wird statt des Namens
 * das Kürzel des Spielers angezeigt.
 */
export default function LeaderboardRow({
  position,
  name,
  shortName,
  thru,
  toPar,
  earningsCents,
  anonymous = false,
  highlight = false,
  className,
}) {
  return (
    <div
      className={cn(
        `grid ${LEADERBOARD_COLUMNS} items-center gap-2 rounded-[22px] px-4 py-3.5`,
        highlight ? "glass-strong ring-2 ring-emerald-500/40" : "glass",
        className
      )}
    >
      <span className="text-lg font-black tabular-nums tracking-[-0.03em] text-ink">{position}</span>
      <span className="min-w-0">
        <span className="block truncate text-[1.05rem] font-black leading-tight tracking-[-0.03em] text-ink">
          {anonymous ? shortName : name}
        </span>
        {!anonymous && shortName && (
          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-ink-mute">
            {shortName}
          </span>
        )}
      </span>
      <span className="text-right text-sm font-black tabular-nums text-ink-soft">{thru}</span>
      <span
        className={cn(
          "text-right text-xl font-black tabular-nums tracking-[-0.04em]",
          getToParTextClass(toPar)
        )}
      >
        {formatToPar(toPar)}
      </span>
      <span
        className={cn(
          "text-right text-[0.95rem] font-black tabular-nums tracking-[-0.03em]",
          getMoneyTextClass(earningsCents)
        )}
      >
        {formatCents(earningsCents, { signed: true })}
      </span>
    </div>
  )
}
