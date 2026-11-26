/**
 * Farben, die sich im Dunkelmodus ändern, verweisen auf CSS-Variablen
 * (Definition in src/index.css). Im Hellmodus entsprechen die Legacy-Farben
 * exakt den Tailwind-Standardfarben, bestehende Screens bleiben also lesbar.
 */
const channel = (name) => `rgb(var(--${name}) / <alpha-value>)`

const ramp = (prefix, shades) =>
  Object.fromEntries(shades.map((shade) => [shade, channel(`${prefix}-${shade}`)]))

const textColor = {
  slate: ramp("tx-slate", [300, 400, 500, 600, 700, 800, 900, 950]),
  emerald: ramp("tx-emerald", [600, 700, 800, 900, 950]),
  red: ramp("tx-red", [600, 700]),
  amber: ramp("tx-amber", [600, 700]),
  orange: ramp("tx-orange", [600]),
}

const backgroundColor = {
  white: channel("bg-white"),
  slate: ramp("bg-slate", [50, 100, 200]),
  emerald: ramp("bg-emerald", [50, 100, 200]),
  red: ramp("bg-red", [50, 100, 200]),
  amber: ramp("bg-amber", [50, 100, 200]),
  orange: ramp("bg-orange", [50, 100]),
}

const borderColor = {
  white: channel("bd-white"),
  slate: ramp("bd-slate", [100, 200, 300]),
  emerald: ramp("bd-emerald", [200, 300]),
  red: ramp("bd-red", [200]),
  amber: ramp("bd-amber", [200]),
  orange: ramp("bd-orange", [200, 300]),
}

const ringColor = {
  emerald: ramp("rg-emerald", [100, 200]),
}

/** @type {import("tailwindcss").Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
      },
      // font-black war bisher 900 und wirkte laut. 800 passt besser zum ruhigeren Stil.
      fontWeight: {
        black: "800",
      },
      colors: {
        skinz: {
          background: "#fafafa",
          surface: "#ffffff",
          hero: "#071819",
          ink: "#0a0a0a",
          muted: "#767676",
          emerald: "#006847",
          gold: "#d9a406",
        },
        page: channel("page"),
        card: channel("card"),
        fill: channel("fill"),
        line: channel("line"),
        ink: {
          DEFAULT: channel("ink"),
          soft: channel("ink-soft"),
          mute: channel("ink-mute"),
        },
        fairway: {
          DEFAULT: channel("fw"),
          deep: channel("fw-deep"),
        },
        sand: channel("sand"),
        gold: channel("gold"),
      },
      textColor,
      backgroundColor,
      borderColor,
      ringColor,
      boxShadow: {
        soft: "0 20px 60px rgba(15, 23, 42, 0.10)",
        floating: "0 24px 70px rgba(15, 23, 42, 0.14)",
        emerald: "0 18px 45px rgba(16, 185, 129, 0.30)",
        hero: "0 20px 50px rgba(7, 24, 25, 0.28)",
        glass: "var(--shadow-glass)",
      },
    },
  },
  plugins: [],
}
