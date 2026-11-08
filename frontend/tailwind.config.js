/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3f0e8",
        surface: "#fbfaf6",
        line: "#e3ded2",
        ink: "#1d2733",
        muted: "#6f6a60",
        faint: "#a39e92",
        blend: "#0e6b73",
        alert: "#c2410c",
        warn: "#b7791f",
        ok: "#3f7d4e",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
}
