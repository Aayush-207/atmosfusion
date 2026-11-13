/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F1EA",   // map land
        surface: "#FFFFFF",
        line: "#E3DED4",
        ink: "#26323B",     // map label text
        ink2: "#4F5C66",
        muted: "#6E7882",
        faint: "#A9B0B6",
        blend: "#3B7DC4",   // map water, deepened
        accent: "#E58A2E",  // map motorway
        alert: "#D9453A",
        warn: "#C98A12",
        ok: "#4E9A5E",      // map parks, deepened
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        data: ["Manrope", "system-ui", "sans-serif"],
      },
      boxShadow: {
        hard: "0 1px 2px rgba(38,50,59,.06), 0 4px 14px rgba(38,50,59,.08)",
        "hard-sm": "0 1px 3px rgba(38,50,59,.12)",
      },
      keyframes: {
        rise: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } },
        grow: { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
        pulse_ring: { "0%": { transform: "scale(.6)", opacity: .9 }, "100%": { transform: "scale(2.2)", opacity: 0 } },
        draw: { from: { strokeDashoffset: 1 }, to: { strokeDashoffset: 0 } },
        rain: { from: { transform: "translateY(-20px)" }, to: { transform: "translateY(40px)" } },
      },
      animation: {
        rise: "rise .5s cubic-bezier(.2,.7,.2,1) both",
        grow: "grow .8s cubic-bezier(.2,.7,.2,1) both",
        pulse_ring: "pulse_ring 1.8s ease-out infinite",
        draw: "draw 1.1s cubic-bezier(.2,.7,.2,1) both",
        rain: "rain .9s linear infinite",
      },
    },
  },
  plugins: [],
}
