import { GAME_MODES } from "../context/GameContext"

export function getGameModeTheme({
  gameMode,
  gameModeLabel,
  isWolffn = false,
  isProfessional = false,
}) {
  const normalizedLabel = String(gameModeLabel || "")
    .trim()
    .toLowerCase()

  if (
    isWolffn ||
    gameMode === GAME_MODES.WOLFFN ||
    normalizedLabel.includes("wolffn")
  ) {
    return {
      key: "wolffn",
      label: "🐺 Wolffn",
      shortLabel: "Wolffn",

      badge: "border-slate-950 bg-slate-950 text-white",
      badgeDark: "border-white/15 bg-white/10 text-white",

      text: "text-slate-950",
      textDark: "text-white",

      softText: "text-slate-600",
      softTextDark: "text-slate-300",

      activeBorder: "border-slate-950",
      activeBg: "bg-slate-950 text-white",
      activeSoftBg: "bg-slate-100",

      button: "bg-slate-950",
      buttonHover: "hover:bg-slate-900",

      ring: "focus:border-slate-500 focus:ring-slate-100",
      glow: "from-slate-500/28 via-slate-500/8 to-transparent",

      dot: "border-slate-950 bg-slate-950",
      avatar: "bg-slate-950 text-white",
    }
  }

  if (
    isProfessional ||
    gameMode === GAME_MODES.PROFESSIONAL ||
    normalizedLabel.includes("professional") ||
    normalizedLabel.includes("pro")
  ) {
    return {
      key: "professional",
      label: "Skinz Professional",
      shortLabel: "Pro",

      badge: "border-orange-300/70 bg-orange-50/90 text-orange-600",
      badgeDark: "border-orange-300/30 bg-orange-400/15 text-orange-200",

      text: "text-orange-600",
      textDark: "text-orange-300",

      softText: "text-orange-600",
      softTextDark: "text-orange-200",

      activeBorder: "border-orange-300/70",
      activeBg: "bg-orange-50/85",
      activeSoftBg: "bg-orange-50",

      button: "bg-orange-500",
      buttonHover: "hover:bg-orange-600",

      ring: "focus:border-orange-400 focus:ring-orange-100",
      glow: "from-orange-400/32 via-orange-500/8 to-transparent",

      dot: "border-orange-500 bg-orange-500",
      avatar: "bg-orange-500 text-white",
    }
  }

  return {
    key: "classic",
    label: "Classic Skinz",
    shortLabel: "Classic",

    badge: "border-emerald-300/70 bg-emerald-50/90 text-emerald-700",
    badgeDark: "border-emerald-300/30 bg-emerald-400/15 text-emerald-200",

    text: "text-emerald-700",
    textDark: "text-emerald-200",

    softText: "text-emerald-700",
    softTextDark: "text-emerald-200",

    activeBorder: "border-emerald-300/70",
    activeBg: "bg-emerald-50/80",
    activeSoftBg: "bg-emerald-50",

    button: "bg-emerald-500",
    buttonHover: "hover:bg-emerald-600",

    ring: "focus:border-emerald-400 focus:ring-emerald-100",
    glow: "from-emerald-400/32 via-emerald-500/8 to-transparent",

    dot: "border-emerald-500 bg-emerald-500",
    avatar: "bg-emerald-500 text-white",
  }
}