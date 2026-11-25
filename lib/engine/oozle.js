import { OOZLE_OUTCOMES } from "./constants.js"

/**
 * Oozle: Par-3-Nebenwette in Euro, getrennt von den Skinz.
 *
 * - Grün getroffen, höchstens 2 Putts: Oozle, der Spieler bekommt den Betrag
 *   von jedem Gegner.
 * - Grün getroffen, 3 oder mehr Putts: Foozle, der Spieler zahlt den Betrag
 *   an jeden Gegner.
 * - Niemand auf dem Grün: Der Einsatz verdoppelt sich und wandert zum nächsten
 *   Par 3. Gibt es keins mehr (oder ist Carryover aus), verfällt er.
 */
export function resolveOozle({
  playerIds,
  input,
  config,
  carryoverUnits,
  hasFutureParThree,
}) {
  const unitsAtStake = Math.max(carryoverUnits, 1)
  const amountPerOpponentCents = unitsAtStake * config.valueCents
  const base = {
    unitsAtStake,
    amountPerOpponentCents,
    carryoverUnitsBefore: carryoverUnits,
  }

  if (input.noGreen) {
    const carriesOver = config.carryoverEnabled && hasFutureParThree

    return {
      ...base,
      outcome: OOZLE_OUTCOMES.CARRYOVER,
      playerId: null,
      putts: null,
      expired: !carriesOver,
      carryoverUnitsAfter: carriesOver ? unitsAtStake * 2 : 0,
      transfers: [],
    }
  }

  const isOozle = input.putts <= 2
  const opponentIds = playerIds.filter((playerId) => playerId !== input.playerId)

  const transfers = opponentIds.map((opponentId) =>
    isOozle
      ? {
          fromPlayerId: opponentId,
          toPlayerId: input.playerId,
          amountCents: amountPerOpponentCents,
        }
      : {
          fromPlayerId: input.playerId,
          toPlayerId: opponentId,
          amountCents: amountPerOpponentCents,
        }
  )

  return {
    ...base,
    outcome: isOozle ? OOZLE_OUTCOMES.OOZLE : OOZLE_OUTCOMES.FOOZLE,
    playerId: input.playerId,
    putts: input.putts,
    expired: false,
    carryoverUnitsAfter: 0,
    transfers,
  }
}
