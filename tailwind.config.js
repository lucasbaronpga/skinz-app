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
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "sans-serif",
        ],
      },

      colors: {
        skinz: {
          background: "#f5f5f7",
          ink: "#020617",
          muted: "#64748b",
          emerald: "#10b981",
        },
      },

      boxShadow: {
        soft: "0 20px 60px rgba(15, 23, 42, 0.10)",
        floating: "0 24px 70px rgba(15, 23, 42, 0.14)",
        emerald: "0 18px 45px rgba(16, 185, 129, 0.30)",
      },

      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },

  plugins: [],
}