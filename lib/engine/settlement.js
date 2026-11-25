import { fail } from "./errors.js"

const MAXIMUM_EXACT_GROUP_SEARCH = 12

/** Zerlegt Salden in möglichst viele Gruppen, die sich selbst ausgleichen. */
function splitIntoZeroSumGroups(entries) {
  const count = entries.length

  if (count > MAXIMUM_EXACT_GROUP_SEARCH) return [entries]

  const size = 1 << count
  const sums = new Array(size).fill(0)
  const best = new Int16Array(size)
  const lastRemoved = new Int8Array(size)

  for (let mask = 1; mask < size; mask += 1) {
    const lowestBit = 31 - Math.clz32(mask & -mask)
    sums[mask] = sums[mask & (mask - 1)] + entries[lowestBit].amountCents

    let bestValue = -1

    for (let index = 0; index < count; index += 1) {
      if (!(mask & (1 << index))) continue

      const candidate = best[mask ^ (1 << index)]

      if (candidate > bestValue) {
        bestValue = candidate
        lastRemoved[mask] = index
      }
    }

    best[mask] = bestValue + (sums[mask] === 0 ? 1 : 0)
  }

  const order = []
  let mask = size - 1

  while (mask > 0) {
    const index = lastRemoved[mask]
    order.push(index)
    mask ^= 1 << index
  }

  order.reverse()

  const groups = []
  let currentGroup = []
  let runningSum = 0

  order.forEach((index) => {
    currentGroup.push(entries[index])
    runningSum += entries[index].amountCents

    if (runningSum === 0) {
      groups.push(currentGroup)
      currentGroup = []
    }
  })

  return groups
}

function settleGroup(group) {
  const debtors = group
    .filter((entry) => entry.amountCents < 0)
    .map((entry) => ({ ...entry, remainingCents: -entry.amountCents }))
    .sort((first, second) => second.remainingCents - first.remainingCents || first.order - second.order)

  const creditors = group
    .filter((entry) => entry.amountCents > 0)
    .map((entry) => ({ ...entry, remainingCents: entry.amountCents }))
    .sort((first, second) => second.remainingCents - first.remainingCents || first.order - second.order)

  const payments = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const amountCents = Math.min(debtor.remainingCents, creditor.remainingCents)

    payments.push({
      fromPlayerId: debtor.playerId,
      toPlayerId: creditor.playerId,
      amountCents,
      fromOrder: debtor.order,
      toOrder: creditor.order,
    })

    debtor.remainingCents -= amountCents
    creditor.remainingCents -= amountCents

    if (debtor.remainingCents === 0) debtorIndex += 1
    if (creditor.remainingCents === 0) creditorIndex += 1
  }

  return payments
}

/**
 * Erzeugt einen Zahlungsplan mit der kleinstmöglichen Anzahl an Zahlungen.
 * Positive Salden bekommen Geld, negative zahlen.
 */
export function planPayments(balances) {
  const entries = balances
    .map((balance, order) => ({ ...balance, order }))
    .filter((balance) => balance.amountCents !== 0)

  const total = entries.reduce((sum, entry) => sum + entry.amountCents, 0)

  if (total !== 0) {
    fail("UNBALANCED_SETTLEMENT", "Die Endabrechnung geht nicht auf.")
  }

  return splitIntoZeroSumGroups(entries)
    .flatMap(settleGroup)
    .sort(
      (first, second) =>
        second.amountCents - first.amountCents ||
        first.fromOrder - second.fromOrder ||
        first.toOrder - second.toOrder
    )
    .map(({ fromPlayerId, toPlayerId, amountCents }) => ({
      fromPlayerId,
      toPlayerId,
      amountCents,
    }))
}

/**
 * Paarweise Abrechnung: (Skinz A − Skinz B) × Einsatz plus die Oozle-Beträge.
 * Gibt Salden je Spieler, die Paarzeilen für die Detailansicht und den
 * Zahlungsplan zurück. Alle Beträge sind ganze Cent.
 */
export function calculateSettlement({ playerIds, skinz, transfers, stakeCents }) {
  const indexByPlayerId = new Map(playerIds.map((playerId, index) => [playerId, index]))
  const count = playerIds.length
  const oozleCents = Array.from({ length: count }, () => new Array(count).fill(0))

  transfers.forEach((transfer) => {
    const from = indexByPlayerId.get(transfer.fromPlayerId)
    const to = indexByPlayerId.get(transfer.toPlayerId)

    oozleCents[to][from] += transfer.amountCents
    oozleCents[from][to] -= transfer.amountCents
  })

  const pairs = []
  const players = playerIds.map((playerId) => ({
    playerId,
    skinz: skinz.get(playerId),
    skinzCents: 0,
    oozleCents: 0,
    totalCents: 0,
  }))

  playerIds.forEach((playerId, index) => {
    playerIds.forEach((opponentId, opponentIndex) => {
      if (index === opponentIndex) return

      const skinzDifference = skinz.get(playerId) - skinz.get(opponentId)
      const pairSkinzCents = skinzDifference * stakeCents
      const pairOozleCents = oozleCents[index][opponentIndex]
      const pairTotalCents = pairSkinzCents + pairOozleCents

      pairs.push({
        playerId,
        opponentId,
        skinzDifference,
        skinzCents: pairSkinzCents,
        oozleCents: pairOozleCents,
        totalCents: pairTotalCents,
      })

      players[index].skinzCents += pairSkinzCents
      players[index].oozleCents += pairOozleCents
      players[index].totalCents += pairTotalCents
    })
  })

  const payments = planPayments(
    players.map((player) => ({
      playerId: player.playerId,
      amountCents: player.totalCents,
    }))
  )

  return { players, pairs, payments }
}
