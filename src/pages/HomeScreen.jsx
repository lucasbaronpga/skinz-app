import { useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import AppBackground from "../components/AppBackground"
import HomeInvitations from "../components/HomeInvitations"
import HomeLiveMatchCard from "../components/HomeLiveMatchCard"
import { useAuth } from "../context/AuthContext"
import { GAME_MODES, useGame } from "../context/GameContext"
import useCurrentLiveMatch from "../hooks/useCurrentLiveMatch"

function toNumber(value, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number) ? number : fallback
}

function roundMoney(value) {
  return Math.round(toNumber(value, 0) * 100) / 100
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function formatEuroAmount(value) {
  const amount = roundMoney(Math.abs(value))
  const hasCents = Math.abs(amount % 1) > 0

  if (hasCents) {
    return amount.toFixed(2).replace(".", ",")
  }

  return amount.toFixed(0)
}

function formatMoney(value) {
  const amount = roundMoney(value)

  if (amount > 0) {
    return `+${formatEuroAmount(amount)}€`
  }

  if (amount < 0) {
    return `-${formatEuroAmount(amount)}€`
  }

  return "0€"
}

function formatToPar(value) {
  const amount = toNumber(value, 0)

  if (amount === 0) {
    return "E"
  }

  if (amount > 0) {
    return `+${amount}`
  }

  return String(amount)
}

function formatSkins(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return `+${amount}`
  }

  if (amount < 0) {
    return `${amount}`
  }

  return "0"
}

function getMoneyColor(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-amber-500"
  }

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function getSkinsColor(value) {
  const amount = toNumber(value, 0)

  if (amount > 0) {
    return "text-amber-500"
  }

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function getToParColor(value) {
  const amount = toNumber(value, 0)

  if (amount < 0) {
    return "text-emerald-500"
  }

  if (amount > 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function getRoundPlayers(round) {
  return Array.isArray(round?.players) ? round.players : []
}

function getPlayerName(player) {
  return player?.name || player?.playerName || player?.displayName || ""
}

function getAuthenticatedPlayerName(user) {
  return (
    user?.name ||
    user?.playerName ||
    user?.displayName ||
    user?.profileName ||
    user?.username ||
    ""
  )
}

function isSamePlayerName(left, right) {
  return Boolean(normalizeName(left) && normalizeName(left) === normalizeName(right))
}

function roundMatchesAuthenticatedPlayer(round, authenticatedPlayerName) {
  if (!round || !normalizeName(authenticatedPlayerName)) {
    return false
  }

  const directRoundNames = [
    round?.playerName,
    round?.currentPlayerName,
    round?.profileName,
    round?.userName,
  ]

  const hasDirectMatch = directRoundNames.some((name) =>
    isSamePlayerName(name, authenticatedPlayerName)
  )

  if (hasDirectMatch) {
    return true
  }

  return getRoundPlayers(round).some((player) =>
    isSamePlayerName(getPlayerName(player), authenticatedPlayerName)
  )
}

function getAuthenticatedRoundPlayer(round, authenticatedPlayerName) {
  if (!round || !normalizeName(authenticatedPlayerName)) {
    return null
  }

  const matchedPlayer = getRoundPlayers(round).find((player) =>
    isSamePlayerName(getPlayerName(player), authenticatedPlayerName)
  )

  return matchedPlayer || null
}

function itemIsWolffn(item) {
  return Boolean(
    item?.gameMode === GAME_MODES.WOLFFN ||
      item?.gameModeLabel === "Wolffn" ||
      item?.wolffnSetup ||
      item?.wolffnFormat ||
      item?.wolffnPlayer ||
      Array.isArray(item?.wolffnTeamA) ||
      Array.isArray(item?.wolffnTeamB)
  )
}

function roundIsWolffn(round) {
  if (!round) {
    return false
  }

  if (
    round?.gameMode === GAME_MODES.WOLFFN ||
    round?.gameModeLabel === "Wolffn"
  ) {
    return true
  }

  const historyHasWolffn =
    Array.isArray(round?.history) &&
    round.history.some((playedHole) => itemIsWolffn(playedHole))

  if (historyHasWolffn) {
    return true
  }

  return getRoundPlayers(round).some(
    (player) =>
      Array.isArray(player?.holes) &&
      player.holes.some((playedHole) => itemIsWolffn(playedHole))
  )
}

function roundHasSpecialScoring(round) {
  if (!round || roundIsWolffn(round)) {
    return false
  }

  return Boolean(
    round?.gameMode === GAME_MODES.PROFESSIONAL ||
      round?.gameModeLabel === "Skinz Professional" ||
      round?.specialScoringEnabled
  )
}

function getRoundModeLabel(round) {
  if (roundIsWolffn(round)) {
    return "🐺 Wolffn"
  }

  if (roundHasSpecialScoring(round)) {
    return "Pro"
  }

  return "Classic"
}

function getRoundPar(round) {
  return toNumber(
    round?.course?.par ||
      round?.currentCourse?.par ||
      round?.coursePar ||
      round?.par,
    72
  )
}

function getPlayerTotalToPar(player, round) {
  const directValue = [
    player?.totalToPar,
    player?.toPar,
    round?.totalToPar,
  ].find((value) => Number.isFinite(Number(value)))

  if (directValue !== undefined) {
    return toNumber(directValue, 0)
  }

  if (Array.isArray(player?.holes)) {
    const holesWithValues = player.holes.filter(
      (playedHole) =>
        Number.isFinite(Number(playedHole?.score)) &&
        Number.isFinite(Number(playedHole?.par))
    )

    if (holesWithValues.length > 0) {
      return holesWithValues.reduce(
        (sum, playedHole) =>
          sum + toNumber(playedHole.score, 0) - toNumber(playedHole.par, 0),
        0
      )
    }
  }

  return 0
}

function getPlayerTotalStrokes(player, round) {
  const directValue = [
    player?.totalStrokes,
    player?.strokes,
    player?.totalScore,
    round?.totalStrokes,
    round?.strokes,
    round?.totalScore,
  ].find((value) => Number.isFinite(Number(value)))

  if (directValue !== undefined) {
    return toNumber(directValue, 0)
  }

  if (Array.isArray(player?.holes)) {
    const holesWithScores = player.holes.filter((playedHole) =>
      Number.isFinite(Number(playedHole?.score))
    )

    if (holesWithScores.length >= 9) {
      return holesWithScores.reduce(
        (sum, playedHole) => sum + toNumber(playedHole.score, 0),
        0
      )
    }
  }

  return getRoundPar(round) + getPlayerTotalToPar(player, round)
}

function getPlayerSkins(player, round) {
  const value = [player?.skins, player?.totalSkins, round?.skins].find((item) =>
    Number.isFinite(Number(item))
  )

  return toNumber(value, 0)
}

function getPlayerWinnings(player, round) {
  const value = [
    player?.winnings,
    player?.earnings,
    player?.totalWinnings,
    round?.winnings,
    round?.earnings,
  ].find((item) => Number.isFinite(Number(item)))

  return toNumber(value, 0)
}

function getRoundSortValue(round) {
  const value = [round?.createdAt, round?.finishedAt, round?.date].find(
    (item) => Number.isFinite(Number(item))
  )

  if (value !== undefined) {
    return toNumber(value, 0)
  }

  const parsedDate = Date.parse(round?.date || "")

  return Number.isFinite(parsedDate) ? parsedDate : 0
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playerStats, completedRounds, restoreMatchError, restoreActiveMatch } = useGame()
  const { match: liveMatch } = useCurrentLiveMatch()

  // Lädt abgeschlossene Runden für "Last Round" und das Season Leaderboard.
  useEffect(() => {
    restoreActiveMatch()
  }, [restoreActiveMatch])

  const authenticatedPlayerName = getAuthenticatedPlayerName(user)
  const safePlayerStats = Array.isArray(playerStats) ? playerStats : []
  const safeCompletedRounds = Array.isArray(completedRounds)
    ? completedRounds
    : []
  const latestRound =
    [...safeCompletedRounds]
      .filter((round) =>
        roundMatchesAuthenticatedPlayer(round, authenticatedPlayerName)
      )
      .sort((a, b) => getRoundSortValue(b) - getRoundSortValue(a))[0] || null
  const latestRoundId = latestRound?.id || "SKZ-0000"
  const latestRoundPlayer = getAuthenticatedRoundPlayer(
    latestRound,
    authenticatedPlayerName
  )
  const latestRoundPlayerName =
    getPlayerName(latestRoundPlayer) || authenticatedPlayerName || "Spieler"
  const latestRoundStrokes = getPlayerTotalStrokes(
    latestRoundPlayer,
    latestRound
  )
  const latestRoundTotalToPar = getPlayerTotalToPar(
    latestRoundPlayer,
    latestRound
  )
  const latestRoundSkins = getPlayerSkins(latestRoundPlayer, latestRound)
  const latestRoundWinnings = getPlayerWinnings(
    latestRoundPlayer,
    latestRound
  )
  const topPlayers = [...safePlayerStats]
    .filter((player) => toNumber(player?.roundsPlayed, 0) > 0)
    .sort(
      (a, b) =>
        toNumber(b.totalWinnings, 0) - toNumber(a.totalWinnings, 0) ||
        String(a?.name || "").localeCompare(String(b?.name || ""))
    )
    .slice(0, 3)

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(10.5rem+env(safe-area-inset-bottom))] text-slate-950">
      <AppBackground />
      <div className="relative px-5 pt-8 sm:pt-10">
        <div className="mx-auto w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pt-5"
          >
            <h1 className="text-[clamp(3.6rem,18vw,4.15rem)] font-black leading-none tracking-[-0.075em] text-slate-950">
              Skinz
            </h1>
          </motion.div>

          <HomeInvitations className="mt-6" />

          {restoreMatchError && (
            <button
              type="button"
              onClick={() => restoreActiveMatch({ force: true })}
              className="mt-5 w-full rounded-[24px] border border-red-200 bg-red-50/90 px-4 py-3 text-center text-sm font-bold text-red-600 shadow-sm"
            >
              {restoreMatchError} Erneut versuchen
            </button>
          )}

          {liveMatch ? (
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35, ease: "easeOut" }}
              className="mt-8"
            >
              <HomeLiveMatchCard match={liveMatch} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35, ease: "easeOut" }}
              className="mt-8 overflow-hidden rounded-[34px] border border-white/20 bg-[#071819] text-white shadow-[0_24px_62px_rgba(7,24,25,0.40)]"
            >
              <div className="relative p-6">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-emerald-400/32 via-emerald-500/8 to-transparent"
                />
                <div className="relative">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200/85">
                    Next Match
                  </div>
                  <div className="mt-6 break-words text-[clamp(2.65rem,13vw,3.05rem)] font-black uppercase leading-none tracking-[-0.045em]">
                    Neue Runde
                  </div>
                  <div className="mt-4 max-w-xs text-[0.95rem] font-semibold leading-relaxed text-slate-400">
                    Platz, Spielmodus und Einsatz wählen, dann Mitspieler einladen.
                  </div>
                  <Link
                    to="/round"
                    className="mt-7 flex w-full items-center justify-between gap-4 rounded-[26px] border border-white/90 bg-white px-5 py-4 text-slate-950 shadow-[0_16px_48px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition active:scale-[0.985]"
                  >
                    <div className="min-w-0">
                      <div className="break-words text-[1.35rem] font-black tracking-[-0.04em] text-slate-950">
                        Runde starten
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-500">
                        Flight anlegen
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xl font-black text-white shadow-sm">
                      →
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {latestRound && (
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.35, ease: "easeOut" }}
              className="mt-5 grid grid-cols-2 gap-3"
            >
              <button
                type="button"
                onClick={() => navigate(`/matches/${latestRoundId}`)}
                className="min-h-[11.75rem] rounded-[30px] border border-white/70 bg-white/[0.46] p-5 text-left shadow-[0_16px_44px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Last Round
                </div>
                <div className="mt-5 break-words text-[clamp(1.55rem,7vw,1.9rem)] font-black leading-none tracking-[-0.055em] text-slate-950">
                  {latestRoundPlayerName}
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Schläge
                    </div>
                    <div className="mt-1 text-[1.8rem] font-black leading-none tracking-[-0.055em] text-slate-950 tabular-nums">
                      {latestRoundStrokes || "-"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      To Par
                    </div>
                    <div
                      className={`mt-1 text-[1.65rem] font-black leading-none tracking-[-0.05em] tabular-nums ${getToParColor(
                        latestRoundTotalToPar
                      )}`}
                    >
                      {formatToPar(latestRoundTotalToPar)}
                    </div>
                  </div>
                </div>
                <div className="mt-5 min-w-0">
                  <div className="break-words text-sm font-black text-slate-950">
                    {getRoundModeLabel(latestRound)}
                  </div>
                  <div className="mt-1 break-words text-xs font-semibold leading-tight text-slate-500">
                    {latestRoundId}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/matches/${latestRoundId}`)}
                className="flex min-h-[11.75rem] flex-col rounded-[30px] border border-white/70 bg-white/[0.46] p-5 text-left shadow-[0_16px_44px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Result
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <div
                    className={`break-words text-center text-[clamp(2.25rem,12vw,2.75rem)] font-black leading-none tracking-[-0.065em] tabular-nums ${getSkinsColor(
                      latestRoundSkins
                    )}`}
                  >
                    {formatSkins(latestRoundSkins)}
                  </div>
                  <div className="mt-1 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Skinz
                  </div>
                  <div
                    className={`mt-5 break-words text-center text-[clamp(1.65rem,8.6vw,2.05rem)] font-black leading-none tracking-[-0.055em] tabular-nums ${getMoneyColor(
                      latestRoundWinnings
                    )}`}
                  >
                    {formatMoney(latestRoundWinnings)}
                  </div>
                  <div className="mt-1 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Earnings
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.35, ease: "easeOut" }}
            className="mt-5 rounded-[30px] border border-white/70 bg-white/[0.48] p-5 shadow-[0_16px_48px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-600">
                  Season Leaderboard
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/leaderboard")}
                className="shrink-0 rounded-full border border-white/70 bg-white/[0.46] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 backdrop-blur-xl"
              >
                Alle
              </button>
            </div>

            {topPlayers.length === 0 && (
              <div className="mt-5 rounded-[24px] border border-white/70 bg-white/[0.40] p-4 text-center text-sm font-bold text-slate-500 backdrop-blur-xl">
                Noch kein Leaderboard vorhanden.
              </div>
            )}

            <div className="mt-5 space-y-3">
              {topPlayers.map((player) => (
                <button
                  type="button"
                  key={player.name}
                  onClick={() => navigate("/leaderboard")}
                  className="flex w-full items-start justify-between gap-5 text-left"
                >
                  <div className="min-w-0 flex-1 break-words text-[1.55rem] font-black leading-none tracking-[-0.045em]">
                    {player.name}
                  </div>
                  <div
                    className={`max-w-[9rem] shrink-0 break-words text-right text-[clamp(1.15rem,6vw,1.45rem)] font-black leading-none tracking-[-0.045em] tabular-nums ${getMoneyColor(
                      player.totalWinnings
                    )}`}
                  >
                    {formatMoney(player.totalWinnings)}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {!liveMatch && !latestRound && topPlayers.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.35, ease: "easeOut" }}
              className="mt-5 rounded-[30px] border border-white/70 bg-white/[0.46] p-5 shadow-[0_16px_44px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
            >
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                Ready
              </div>
              <div className="mt-3 text-3xl font-black tracking-[-0.04em]">
                Erste Runde starten
              </div>
              <div className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
                Sobald eine Runde abgeschlossen ist, erscheinen hier Last Round
                und Season Leaderboard.
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
