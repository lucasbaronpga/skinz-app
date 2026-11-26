import { LEADERBOARD_COLUMNS } from "./LeaderboardHeader.jsx"
import cn from "./cn.js"
import { getMoneyTextClass, getToParTextClass } from "./scoreStyles.js"
import { formatCents, formatToPar } from "../utils/format.js"

/**
 * Leaderboard-Zeile im PGA-Tour-Stil: flach, mit Haarlinie. Mit `anonymous`
 * wird statt des Namens das Kürzel des Spielers angezeigt.
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
        `grid ${LEADERBOARD_COLUMNS} items-center gap-2 border-b border-line/10 px-1 py-3.5`,
        highlight && "-mx-1 rounded-xl border-transparent bg-fill px-2",
        className
      )}
    >
      <span className="text-base font-bold tabular-nums tracking-[-0.02em] text-ink">{position}</span>
      <span className="min-w-0">
        <span className="block truncate text-[1.05rem] font-bold leading-tight tracking-[-0.025em] text-ink">
          {anonymous ? shortName : name}
        </span>
        {!anonymous && shortName && (
          <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute">
            {shortName}
          </span>
        )}
      </span>
      <span className="text-right text-sm font-semibold tabular-nums text-ink-soft">{thru}</span>
      <span
        className={cn(
          "text-right text-xl font-bold tabular-nums tracking-[-0.03em]",
          getToParTextClass(toPar)
        )}
      >
        {formatToPar(toPar)}
      </span>
      <span
        className={cn(
          "text-right text-[0.95rem] font-bold tabular-nums tracking-[-0.02em]",
          getMoneyTextClass(earningsCents)
        )}
      >
        {formatCents(earningsCents, { signed: true })}
      </span>
    </div>
  )
}
