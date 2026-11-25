export const GAME_MODES = Object.freeze({
  CLASSIC: "classic",
  PROFESSIONAL: "professional",
  WOLFFN: "wolffn",
})

export const SCORING_MODES = Object.freeze({
  GROSS: "gross",
})

export const WOLFFN_DECISIONS = Object.freeze({
  ALONE: "alone",
  ACCEPTED: "accepted",
  DECLINED: "declined",
})

export const OOZLE_OUTCOMES = Object.freeze({
  OOZLE: "oozle",
  FOOZLE: "foozle",
  CARRYOVER: "carryover",
})

export const RESULT_LABELS = Object.freeze({
  ALBATROSS: "Albatross",
  EAGLE: "Eagle",
  BIRDIE: "Birdie",
  PAR: "Par",
  BOGEY: "Bogey",
  DOUBLE_BOGEY: "Double Bogey",
  TRIPLE_PLUS: "Triple+",
})

export const MINIMUM_PLAYERS = 2
export const MAXIMUM_PLAYERS = 4
export const WOLFFN_PLAYERS = 4

export const SUPPORTED_HOLE_COUNTS = Object.freeze([9, 18])

export const MINIMUM_PAR = 3
export const MAXIMUM_PAR = 6
export const MINIMUM_SCORE = 1
export const MAXIMUM_SCORE = 20

export const MAXIMUM_STAKE_CENTS = 10000
export const MAXIMUM_OOZLE_PUTTS = 3
