import { getGameModeTheme } from "../utils/gameModeTheme"

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

export default function GameModeBadge({
  gameMode,
  gameModeLabel,
  isWolffn = false,
  isProfessional = false,
  short = true,
  isDark = false,
  className = "",
}) {
  const theme = getGameModeTheme({
    gameMode,
    gameModeLabel,
    isWolffn,
    isProfessional,
  })

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl",
        isDark ? theme.badgeDark : theme.badge,
        className
      )}
    >
      {short ? theme.shortLabel : theme.label}
    </span>
  )
}