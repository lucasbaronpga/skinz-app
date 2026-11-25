import { getBirdieBonusSkinz, getToPar } from "./scoring.js"

/**
 * Classic Skinz und Skinz Professional.
 *
 * - Der niedrigste Score allein gewinnt Loch + Carryover.
 * - Bei Gleichstand wächst der Carryover um 1 Skin.
 * - Professional vergibt zusätzlich Bonus-Skinz für Birdie, Eagle, Albatross.
 */
export function calculateSkinsHole({
  playerIds,
  scores,
  par,
  carryoverBefore,
  bonusEnabled,
}) {
  const lowestScore = Math.min(...playerIds.map((playerId) => scores.get(playerId)))
  const winnerIds = playerIds.filter((playerId) => scores.get(playerId) === lowestScore)
  const tie = winnerIds.length > 1
  const potSkinz = carryoverBefore + 1

  const holeSkinzByPlayer = new Map(playerIds.map((playerId) => [playerId, 0]))
  const bonusSkinzByPlayer = new Map(playerIds.map((playerId) => [playerId, 0]))

  if (!tie) {
    holeSkinzByPlayer.set(winnerIds[0], potSkinz)
  }

  if (bonusEnabled) {
    playerIds.forEach((playerId) => {
      const toPar = getToPar(scores.get(playerId), par)
      bonusSkinzByPlayer.set(playerId, getBirdieBonusSkinz(toPar))
    })
  }

  return {
    tie,
    winningScore: lowestScore,
    winnerIds: tie ? [] : winnerIds,
    sharedBestIds: winnerIds,
    potSkinz,
    carryoverAfter: tie ? potSkinz : 0,
    holeSkinzByPlayer,
    bonusSkinzByPlayer,
    details: null,
  }
}
