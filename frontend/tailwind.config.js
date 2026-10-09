/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#09090b", // zinc-950
        "midnight-slate": "#18181b", // zinc-900
        "frosted-slate": "#27272a", // zinc-800
        "slate-border": "#3f3f46", // zinc-700
        "monsoon-cyan": "#60a5fa", // blue-400
        "atlantic-blue": "#3b82f6", // blue-500
        "quantum-violet": "#818cf8", // indigo-400
        "neural-emerald": "#34d399", // emerald-400
        "amber-alert": "#fbbf24", // amber-400
        "crimson-hazard": "#f87171", // red-400
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      animation: {
        "pulse-hazard": "pulseHazard 2s ease-in-out infinite",
        "radar-sweep": "radarSweep 3s linear infinite",
        "glow-cyan": "glowCyan 2s ease-in-out infinite alternate",
      },
      keyframes: {
        pulseHazard: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(230, 57, 70, 0.6)" },
          "50%": { boxShadow: "0 0 20px 10px rgba(230, 57, 70, 0.2)" },
        },
        radarSweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        glowCyan: {
          "0%": { boxShadow: "0 0 5px rgba(0, 242, 254, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 242, 254, 0.6)" },
        },
      },
    },
  },
  plugins: [],
}
