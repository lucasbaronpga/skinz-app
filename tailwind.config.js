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
          "Inter",
          "SF Pro Display",
          "SF Pro Text",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },

      colors: {
        skinz: {
          background: "#e8ebe5",
          surface: "#f5f5f7",
          hero: "#071819",
          ink: "#020617",
          muted: "#64748b",
          emerald: "#10b981",
          gold: "#fbbf24",
        },
      },

      boxShadow: {
        soft: "0 20px 60px rgba(15, 23, 42, 0.10)",
        floating: "0 24px 70px rgba(15, 23, 42, 0.14)",
        emerald: "0 18px 45px rgba(16, 185, 129, 0.30)",
        hero: "0 28px 70px rgba(7, 24, 25, 0.42)",
      },

      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },

  plugins: [],
}