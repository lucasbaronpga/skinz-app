export const SHORT_NAME_PATTERN = /^[A-Z0-9]{2,4}$/

/** Schlägt ein Kürzel aus den Initialen vor, z. B. "Lucas Baron" → "LB". */
export function suggestShortName(displayName) {
  const words = String(displayName || "")
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean)

  if (words.length === 0) return ""

  const code =
    words.length === 1
      ? words[0].slice(0, 2)
      : words[0].charAt(0) + words[words.length - 1].charAt(0)

  return code.toUpperCase()
}
