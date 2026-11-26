const STORAGE_KEY = "skinz-theme"
const THEME_COLORS = { light: "#fafafa", dark: "#090b0a" }
const DARK_QUERY = "(prefers-color-scheme: dark)"

export const THEME_PREFERENCES = ["auto", "light", "dark"]

export function getThemePreference() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)

    return stored === "light" || stored === "dark" ? stored : "auto"
  } catch {
    return "auto"
  }
}

export function resolveTheme(preference = getThemePreference()) {
  if (preference === "light" || preference === "dark") return preference

  return window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light"
}

function updateThemeColorMeta(theme) {
  let meta = document.querySelector('meta[name="theme-color"]')

  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("name", "theme-color")
    document.head.appendChild(meta)
  }

  meta.setAttribute("content", THEME_COLORS[theme])
}

export function applyTheme(preference = getThemePreference()) {
  const theme = resolveTheme(preference)

  document.documentElement.dataset.theme = theme
  updateThemeColorMeta(theme)

  return theme
}

/** "auto" folgt der Systemeinstellung, "light" und "dark" erzwingen einen Modus. */
export function setThemePreference(preference) {
  try {
    if (preference === "light" || preference === "dark") {
      window.localStorage.setItem(STORAGE_KEY, preference)
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Speichern ist optional, der Modus wird trotzdem angewendet.
  }

  return applyTheme(preference)
}

/** Wendet den Modus an und reagiert auf Änderungen der Systemeinstellung. */
export function initTheme() {
  applyTheme()

  const media = window.matchMedia?.(DARK_QUERY)

  if (!media) return

  media.addEventListener("change", () => {
    if (getThemePreference() === "auto") applyTheme("auto")
  })
}
