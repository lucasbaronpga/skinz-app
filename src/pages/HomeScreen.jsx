import {
  Link,
  useNavigate,
} from "react-router-dom"

import {
  motion,
} from "framer-motion"

import {
  GAME_MODES,
  useGame,
} from "../context/GameContext"

function toNumber(value, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : fallback
}

function roundMoney(value) {
  return Math.round(toNumber(value, 0) * 100) / 100
}

function formatEuroAmount(value) {
  const amount =
    roundMoney(Math.abs(value))

  const hasCents =
    Math.abs(amount % 1) > 0

  if (hasCents) {
    return amount
      .toFixed(2)
      .replace(".", ",")
  }

  return amount.toFixed(0)
}

function formatMoney(value) {
  const amount =
    roundMoney(value)

  if (amount > 0) {
    return `+${formatEuroAmount(amount)}€`
  }

  if (amount < 0) {
    return `-${formatEuroAmount(amount)}€`
  }

  return "0€"
}

function formatToPar(value) {
  const amount =
    toNumber(value, 0)

  if (amount === 0) {
    return "E"
  }

  if (amount > 0) {
    return `+${amount}`
  }

  return amount
}

function getMoneyColor(value) {
  const amount =
    toNumber(value, 0)

  if (amount > 0) {
    return "text-amber-500"
  }

  if (amount < 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function getMoneyColorDark(value) {
  const amount =
    toNumber(value, 0)

  if (amount > 0) {
    return "text-amber-300"
  }

  if (amount < 0) {
    return "text-red-300"
  }

  return "text-white"
}

function getToParColor(value) {
  const amount =
    toNumber(value, 0)

  if (amount < 0) {
    return "text-emerald-500"
  }

  if (amount > 0) {
    return "text-red-500"
  }

  return "text-slate-950"
}

function getCurrentCourseName(course) {
  return (
    course?.name ||
    "Erster Golfclub Westpfalz"
  )
}

function getRoundPlayers(round) {
  return Array.isArray(round?.players)
    ? round.players
    : []
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
    round.history.some((playedHole) =>
      itemIsWolffn(playedHole)
    )

  if (historyHasWolffn) {
    return true
  }

  const playerHoleHasWolffn =
    getRoundPlayers(round).some((player) =>
      Array.isArray(player?.holes) &&
      player.holes.some((playedHole) =>
        itemIsWolffn(playedHole)
      )
    )

  return playerHoleHasWolffn
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
        (
          playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
          playedHole?.gameModeLabel === "Skinz Professional" ||
          playedHole?.specialScoringEnabled ||
          playedHole?.specialScoringApplied ||
          toNumber(playedHole?.bonusSkins, 0) > 0 ||
          playedHole?.eagleBonusApplied
        )
    )

  if (historyHasSpecialScoring) {
    return true
  }

  const playerHoleHasSpecialScoring =
    getRoundPlayers(round).some((player) =>
      Array.isArray(player?.holes) &&
      player.holes.some(
        (playedHole) =>
          !itemIsWolffn(playedHole) &&
          (
            playedHole?.gameMode === GAME_MODES.PROFESSIONAL ||
            playedHole?.gameModeLabel === "Skinz Professional" ||
            playedHole?.specialScoringEnabled ||
            playedHole?.specialScoringApplied ||
            toNumber(playedHole?.bonusSkins, 0) > 0 ||
            playedHole?.eagleBonusApplied
          )
      )
    )

  return playerHoleHasSpecialScoring
}

function getModeLabel({
  isWolffn,
  isProfessional,
}) {
  if (isWolffn) {
    return "🐺 Wolffn"
  }

  if (isProfessional) {
    return "Pro"
  }

  return "Classic"
}

function DarkBadge({
  children,
}) {
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
    currentBaseSkins,
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

  const liveLeader =
    [...players].sort(
      (a, b) =>
        toNumber(b.winnings, 0) -
        toNumber(a.winnings, 0)
    )[0] || null

  const latestRound =
    [...completedRounds].sort(
      (a, b) =>
        toNumber(b.createdAt, 0) -
        toNumber(a.createdAt, 0)
    )[0] || null

  const latestRoundIsWolffn =
    roundIsWolffn(latestRound)

  const latestRoundHasSpecialScoring =
    roundHasSpecialScoring(latestRound)

  const topPlayers =
    [...playerStats]
      .sort(
        (a, b) =>
          toNumber(b.totalWinnings, 0) -
          toNumber(a.totalWinnings, 0)
      )
      .slice(0, 3)

  const currentModeLabel =
    getModeLabel({
      isWolffn: isWolffnMode,
      isProfessional:
        !isWolffnMode &&
        specialScoringEnabled,
    })

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#e8ebe5] pb-[calc(13rem+env(safe-area-inset-bottom))] text-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.95),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_50%_78%,rgba(234,179,8,0.16),transparent_36%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 top-6 bottom-8 rounded-[56px] border border-white/70 bg-white/18 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_35px_90px_rgba(15,23,42,0.18)] backdrop-blur-3xl"
      />

      <div className="relative px-6 pt-12">
        <div className="mx-auto max-w-md">
          {/* Header */}
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

            <div className="mt-3 text-[1.65rem] font-semibold tracking-[-0.04em] text-slate-600">
              Private Golf Matches
            </div>
          </motion.div>

          {/* Live / Start Hero */}
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
              <div className="relative p-8">
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

                      <div className="mt-7 text-[3.7rem] font-black uppercase leading-none tracking-[-0.045em]">
                        Loch {hole}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <DarkBadge>
                        {matchFinished
                          ? "Beendet"
                          : "Live"}
                      </DarkBadge>
                    </div>
                  </div>

                  <div
                    className={`mt-5 text-[4.45rem] font-black leading-none tracking-[-0.07em] ${getMoneyColorDark(currentPot)}`}
                  >
                    {formatMoney(currentPot)}
                  </div>

                  <div className="mt-8 flex items-end justify-between gap-5">
                    <div className="min-w-0">
                      <div className="truncate text-2xl font-black tracking-[-0.035em]">
                        {liveLeader?.name || "-"}
                      </div>

                      <div className="mt-2 truncate text-sm font-bold text-slate-400">
                        {getCurrentCourseName(currentCourse)}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xl font-semibold tracking-[-0.03em] text-slate-300">
                        Leading
                      </div>

                      <div className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                        {activeMatchId || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        Base
                      </div>

                      <div className="mt-1 text-2xl font-black">
                        {toNumber(currentBaseSkins, 1)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        At Stake
                      </div>

                      <div className="mt-1 text-2xl font-black">
                        {toNumber(currentSkinsAtStake, 1)}
                      </div>
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
              <div className="relative p-8">
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
                    Course, Flight und Einsatz wählen. Danach direkt zur Score-Eingabe.
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

          {/* New Round Shortcut */}
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
                className="flex items-center justify-between rounded-[32px] border border-white/70 bg-white/46 px-6 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
              >
                <div>
                  <div className="text-2xl font-black tracking-[-0.035em]">
                    Neue Runde
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-500">
                    Aktuelle Runde ersetzen
                  </div>
                </div>

                <div className="text-2xl font-black">
                  →
                </div>
              </Link>
            </motion.div>
          )}

          {/* Last Round Compact Cards */}
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
                onClick={() => navigate(`/matches/${latestRound.id}`)}
                className="min-h-[14rem] rounded-[34px] border border-white/70 bg-white/46 p-6 text-left shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Last Round
                </div>

                <div className="mt-9 truncate text-[2.35rem] font-black leading-none tracking-[-0.06em]">
                  {latestRound.winner || "Unbekannt"}
                </div>

                <div
                  className={`mt-4 text-[2.4rem] font-black leading-none tracking-[-0.06em] ${getMoneyColor(latestRound.winnings)}`}
                >
                  {formatMoney(latestRound.winnings)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/matches/${latestRound.id}`)}
                className="min-h-[14rem] rounded-[34px] border border-white/70 bg-white/46 p-6 text-left shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Result
                </div>

                <div
                  className={`mt-9 whitespace-nowrap text-[2.65rem] font-black leading-none tracking-[-0.06em] ${getMoneyColor(latestRound.winnings)}`}
                >
                  {formatMoney(latestRound.winnings)}
                </div>

                <div className="mt-8 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-950">
                      {latestRoundIsWolffn
                        ? "🐺 Wolffn"
                        : latestRoundHasSpecialScoring
                        ? "Pro"
                        : "Classic"}
                    </div>

                    <div className="mt-1 truncate text-xs font-semibold text-slate-500">
                      {latestRound.id || "SKZ-0000"}
                    </div>
                  </div>

                  <div
                    className={`shrink-0 text-2xl font-black ${getToParColor(latestRound.totalToPar)}`}
                  >
                    {formatToPar(latestRound.totalToPar)}
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {/* Season Leaderboard */}
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
            className="mt-7 rounded-[34px] border border-white/70 bg-white/48 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
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
                className="rounded-full border border-white/70 bg-white/46 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 backdrop-blur-xl"
              >
                Alle
              </button>
            </div>

            {topPlayers.length === 0 && (
              <div className="mt-6 rounded-[24px] border border-white/70 bg-white/40 p-5 text-center text-sm font-bold text-slate-500 backdrop-blur-xl">
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
                    className={`shrink-0 whitespace-nowrap text-[1.65rem] font-black leading-none tracking-[-0.045em] ${getMoneyColor(player.totalWinnings)}`}
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
              className="mt-7 rounded-[34px] border border-white/70 bg-white/46 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
            >
              <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-500">
                Ready
              </div>

              <div className="mt-3 text-3xl font-black tracking-[-0.04em]">
                Erste Runde starten
              </div>

              <div className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
                Sobald eine Runde abgeschlossen ist, erscheinen hier Last Round und Season Leaderboard.
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}