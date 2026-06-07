import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

import AppBackground from "../components/AppBackground"

import { GAME_MODES, useGame } from "../context/GameContext"

function toNumber(value, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number) ? number : fallback
}

function roundMoney(value) {
  return Math.round(toNumber(value, 0) * 100) / 100
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

function formatPlainMoney(value) {
  const amount = roundMoney(value)

  return `${formatEuroAmount(amount)}€`
}

function formatToPar(value) {
  const amount = toNumber(value, 0)

  if (amount === 0) {
    return "E"
  }

  if (amount > 0) {
    return `+${amount}`
  }

  return amount
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

function formatSkinsAtStake(value) {
  const amount = toNumber(value, 0)

  return amount === 1 ? "1 Skin" : `${amount} Skinz`
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

function getCurrentCourseName(course) {
  return course?.name || "Erster Golfclub Westpfalz"
}

function getRoundPlayers(round) {
  return Array.isArray(round?.players) ? round.players : []
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
  if (!round) {
    return false
  }

  if (roundIsWolffn(round)) {
    return false
  }

  if (
    round?.gameMode === GAME_MODES.PROFESSIONAL ||
    round?.gameModeLabel === "Skinz Professional" ||
    round?.specialScoringEnabled ||
    round?.bonusSkinsEnabled ||
    round?.eagleBonusEnabled
  ) {
    return true
  }

  const historyHasSpecialScoring =
    Array.isArray(round?.history) &&
    round.history.some(
      (playedHole) =>
        !itemIsWolffn(playedHole) &&
        (playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
          playedHole?.gameModeLabel === "Skinz Professional" ||
          playedHole?.specialScoringEnabled ||
          playedHole?.specialScoringApplied ||
          toNumber(playedHole?.bonusSkins, 0) > 0 ||
          playedHole?.eagleBonusApplied)
    )

  if (historyHasSpecialScoring) {
    return true
  }

  return getRoundPlayers(round).some(
    (player) =>
      Array.isArray(player?.holes) &&
      player.holes.some(
        (playedHole) =>
          !itemIsWolffn(playedHole) &&
          (playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
            playedHole?.gameModeLabel === "Skinz Professional" ||
            playedHole?.specialScoringEnabled ||
            playedHole?.specialScoringApplied ||
            toNumber(playedHole?.bonusSkins, 0) > 0 ||
            playedHole?.eagleBonusApplied)
      )
  )
}

function getModeLabel({ isWolffn, isProfessional }) {
  if (isWolffn) {
    return "🐺 Wolffn"
  }

  if (isProfessional) {
    return "Pro"
  }

  return "Classic"
}

function getRoundModeLabel(round) {
  const isWolffn = roundIsWolffn(round)

  const isProfessional = !isWolffn && roundHasSpecialScoring(round)

  return getModeLabel({
    isWolffn,
    isProfessional,
  })
}

function getPlayerName(player) {
  return player?.name || player?.playerName || player?.displayName || ""
}

function getPreferredPlayerName(round, playerStats) {
  if (round?.playerName) {
    return round.playerName
  }

  if (round?.currentPlayerName) {
    return round.currentPlayerName
  }

  if (round?.profileName) {
    return round.profileName
  }

  if (round?.userName) {
    return round.userName
  }

  if (round?.winner) {
    return round.winner
  }

  const firstStatsPlayer =
    Array.isArray(playerStats) && playerStats.length > 0
      ? playerStats[0]
      : null

  if (firstStatsPlayer?.name) {
    return firstStatsPlayer.name
  }

  const firstRoundPlayer = getRoundPlayers(round)[0]

  return getPlayerName(firstRoundPlayer) || "Spieler"
}

function getRoundPlayer(round, playerStats) {
  const preferredName = getPreferredPlayerName(round, playerStats)

  const players = getRoundPlayers(round)

  const matchedPlayer = players.find(
    (player) => getPlayerName(player) === preferredName
  )

  if (matchedPlayer) {
    return matchedPlayer
  }

  const winnerPlayer = players.find(
    (player) => getPlayerName(player) === round?.winner
  )

  if (winnerPlayer) {
    return winnerPlayer
  }

  return players[0] || null
}

function getRoundPar(round) {
  return toNumber(
    round?.course?.par || round?.currentCourse?.par || round?.coursePar || round?.par,
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

function DarkBadge({ children }) {
  return (
    <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200 backdrop-blur-xl">
      {children}
    </span>
  )
}

export default function HomeScreen() {
  const navigate = useNavigate()

  const {
    hole,
    currentPot,
    currentCourse,
    currentSkinsAtStake,
    players,
    playerStats,
    matchFinished,
    completedRounds,
    activeMatchId,
    hasActiveMatch,
    isWolffnMode,
    specialScoringEnabled,
  } = useGame()

  const liveSortedPlayers = [...players].sort(
    (a, b) => toNumber(b.winnings, 0) - toNumber(a.winnings, 0)
  )

  const liveLeader = liveSortedPlayers[0] || null
  const liveRunnerUp = liveSortedPlayers[1] || null

  const liveLeaderHasTie = Boolean(
    liveLeader &&
      liveRunnerUp &&
      toNumber(liveLeader.winnings, 0) === toNumber(liveRunnerUp.winnings, 0)
  )

  const liveLeaderName =
    liveLeader && !liveLeaderHasTie ? liveLeader.name : "All Square"

  const latestRound =
    [...completedRounds].sort(
      (a, b) => toNumber(b.createdAt, 0) - toNumber(a.createdAt, 0)
    )[0] || null

  const latestRoundId = latestRound?.id || "SKZ-0000"

  const latestRoundPlayer = getRoundPlayer(latestRound, playerStats)
  const latestRoundPlayerName = getPreferredPlayerName(latestRound, playerStats)

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

  const topPlayers = [...playerStats]
    .filter((player) => toNumber(player?.roundsPlayed, 0) > 0)
    .sort(
      (a, b) => toNumber(b.totalWinnings, 0) - toNumber(a.totalWinnings, 0)
    )
    .slice(0, 3)

  const currentModeLabel = getModeLabel({
    isWolffn: isWolffnMode,
    isProfessional: !isWolffnMode && specialScoringEnabled,
  })

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#e8ebe5] pb-[calc(13rem+env(safe-area-inset-bottom))] text-slate-950">
      <AppBackground />

      <div className="relative px-5 pt-10 sm:pt-12">
        <div className="mx-auto w-full max-w-md">
          <motion.div
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.35,
              ease: "easeOut",
            }}
            className="pt-8"
          >
            <h1 className="text-[4.6rem] font-black leading-none tracking-[-0.075em] text-slate-950">
              Skinz
            </h1>
          </motion.div>

          {hasActiveMatch ? (
            <motion.button
              type="button"
              whileTap={{
                scale: 0.985,
              }}
              initial={{
                opacity: 0,
                y: 22,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.05,
                duration: 0.35,
                ease: "easeOut",
              }}
              onClick={() => navigate("/live")}
              className="mt-10 w-full overflow-hidden rounded-[38px] border border-white/20 bg-[#071819] text-left text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]"
            >
              <div className="relative p-7">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-emerald-400/32 via-emerald-500/8 to-transparent"
                />

                <div
                  aria-hidden="true"
                  className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/8 blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[12px] font-black uppercase tracking-[0.22em] text-emerald-200/85">
                        {currentModeLabel}
                      </div>

                      <div className="mt-7 text-[3.45rem] font-black uppercase leading-none tracking-[-0.045em]">
                        Loch {hole}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <DarkBadge>{matchFinished ? "Beendet" : "Live"}</DarkBadge>
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-2 items-end gap-4">
                    <div className="min-w-0 text-[3.45rem] font-black leading-none tracking-[-0.07em] text-amber-300">
                      {formatSkinsAtStake(currentSkinsAtStake)}
                    </div>

                    <div className="min-w-0 text-right text-[3.45rem] font-black leading-none tracking-[-0.07em] text-slate-100">
                      {formatPlainMoney(currentPot)}
                    </div>
                  </div>

                  <div className="mt-8 border-t border-white/10 pt-5">
                    <div className="flex items-end justify-between gap-5">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Leading
                        </div>

                        <div className="mt-2 truncate text-2xl font-black tracking-[-0.035em]">
                          {liveLeaderName}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Match
                        </div>

                        <div className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                          {activeMatchId || "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 truncate text-sm font-bold text-slate-400">
                      {getCurrentCourseName(currentCourse)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.button>
          ) : (
            <motion.div
              initial={{
                opacity: 0,
                y: 22,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.05,
                duration: 0.35,
                ease: "easeOut",
              }}
              className="mt-10 overflow-hidden rounded-[38px] border border-white/20 bg-[#071819] text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]"
            >
              <div className="relative p-7">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-emerald-400/32 via-emerald-500/8 to-transparent"
                />

                <div className="relative">
                  <div className="text-[12px] font-black uppercase tracking-[0.22em] text-emerald-200/85">
                    Next Match
                  </div>

                  <div className="mt-7 text-[3.35rem] font-black uppercase leading-none tracking-[-0.045em]">
                    Neue Runde
                  </div>

                  <div className="mt-5 max-w-xs text-base font-semibold leading-relaxed text-slate-400">
                    Course, Flight und Einsatz wählen. Danach direkt zur
                    Score-Eingabe.
                  </div>

                  <Link
                    to="/round"
                    className="mt-9 flex w-full items-center justify-between rounded-[28px] border border-white/90 bg-white px-6 py-5 text-slate-950 shadow-[0_18px_55px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition active:scale-[0.985]"
                  >
                    <div>
                      <div className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                        Runde starten
                      </div>

                      <div className="mt-1 text-sm font-black text-slate-500">
                        Setup öffnen
                      </div>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xl font-black text-white shadow-sm">
                      →
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {hasActiveMatch && (
            <motion.div
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.08,
                duration: 0.35,
                ease: "easeOut",
              }}
              className="mt-6"
            >
              <Link
                to="/round"
                className="flex items-center justify-between rounded-[32px] border border-white/70 bg-white/[0.46] px-6 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
              >
                <div>
                  <div className="text-2xl font-black tracking-[-0.035em]">
                    Neue Runde
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-500">
                    Aktuelle Runde ersetzen
                  </div>
                </div>

                <div className="text-2xl font-black">→</div>
              </Link>
            </motion.div>
          )}

          {latestRound && (
            <motion.div
              initial={{
                opacity: 0,
                y: 22,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.14,
                duration: 0.35,
                ease: "easeOut",
              }}
              className="mt-7 grid grid-cols-2 gap-4"
            >
              <button
                type="button"
                onClick={() => navigate(`/matches/${latestRoundId}`)}
                className="min-h-[14rem] rounded-[34px] border border-white/70 bg-white/[0.46] p-6 text-left shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Last Round
                </div>

                <div className="mt-6 truncate text-[2.2rem] font-black leading-none tracking-[-0.06em]">
                  {latestRoundPlayerName}
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Schläge
                    </div>

                    <div className="mt-1 text-[2.15rem] font-black leading-none tracking-[-0.06em] text-slate-950">
                      {latestRoundStrokes || "-"}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      To Par
                    </div>

                    <div
                      className={`mt-1 text-[1.9rem] font-black leading-none tracking-[-0.055em] ${getToParColor(
                        latestRoundTotalToPar
                      )}`}
                    >
                      {formatToPar(latestRoundTotalToPar)}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-950">
                      {getRoundModeLabel(latestRound)}
                    </div>

                    <div className="mt-1 truncate text-xs font-semibold text-slate-500">
                      {latestRoundId}
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/matches/${latestRoundId}`)}
                className="min-h-[14rem] rounded-[34px] border border-white/70 bg-white/[0.46] p-6 text-left shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Result
                </div>

                <div
                  className={`mt-8 text-[3.35rem] font-black leading-none tracking-[-0.07em] ${getSkinsColor(
                    latestRoundSkins
                  )}`}
                >
                  {formatSkins(latestRoundSkins)}
                </div>

                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Skinz
                </div>

                <div
                  className={`mt-8 whitespace-nowrap text-[2.45rem] font-black leading-none tracking-[-0.06em] ${getMoneyColor(
                    latestRoundWinnings
                  )}`}
                >
                  {formatMoney(latestRoundWinnings)}
                </div>

                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Earnings
                </div>
              </button>
            </motion.div>
          )}

          <motion.div
            initial={{
              opacity: 0,
              y: 22,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.18,
              duration: 0.35,
              ease: "easeOut",
            }}
            className="mt-7 rounded-[34px] border border-white/70 bg-white/[0.48] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-600">
                  Season Leaderboard
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/leaderboard")}
                className="rounded-full border border-white/70 bg-white/[0.46] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 backdrop-blur-xl"
              >
                Alle
              </button>
            </div>

            {topPlayers.length === 0 && (
              <div className="mt-6 rounded-[24px] border border-white/70 bg-white/[0.40] p-5 text-center text-sm font-bold text-slate-500 backdrop-blur-xl">
                Noch kein Leaderboard vorhanden.
              </div>
            )}

            <div className="mt-6 space-y-3">
              {topPlayers.map((player) => (
                <button
                  type="button"
                  key={player.name}
                  onClick={() => navigate("/leaderboard")}
                  className="flex w-full items-baseline justify-between gap-5 text-left"
                >
                  <div className="min-w-0 truncate text-[1.75rem] font-black leading-none tracking-[-0.045em]">
                    {player.name}
                  </div>

                  <div
                    className={`shrink-0 whitespace-nowrap text-[1.65rem] font-black leading-none tracking-[-0.045em] ${getMoneyColor(
                      player.totalWinnings
                    )}`}
                  >
                    {formatMoney(player.totalWinnings)}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {!hasActiveMatch && !latestRound && topPlayers.length === 0 && (
            <motion.div
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.14,
                duration: 0.35,
                ease: "easeOut",
              }}
              className="mt-7 rounded-[34px] border border-white/70 bg-white/[0.46] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
            >
              <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-500">
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