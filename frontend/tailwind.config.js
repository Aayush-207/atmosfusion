/** @type {import('tailwindcss').Config} */
// Every colour, face, radius, shadow and curve is a token in src/tokens.css (Hallmark · Cobalt).
const t = (name) => `var(--${name})`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: t("color-paper"),
        paper2: t("color-paper-2"),
        paper3: t("color-paper-3"),
        ink: t("color-ink"),
        ink2: t("color-ink-2"),
        muted: t("color-muted"),
        rule: t("color-rule"),
        rule2: t("color-rule-2"),
        graphite: t("color-graphite"),
        graphite2: t("color-graphite-2"),
        gink: t("color-graphite-ink"),
        gmuted: t("color-graphite-muted"),
        accent: t("color-accent"),
        accent2: t("color-accent-2"),
        wash: t("color-accent-wash"),
        error: t("color-error"),
        "error-wash": t("color-error-wash"),
        success: t("color-success"),
        "success-wash": t("color-success-wash"),
        warning: t("color-warning"),
        key: t("color-key-face"),
        heading: t("color-heading"),
        figure: t("color-figure"),
        label: t("color-label"),
      },
      fontFamily: {
        sans: t("font-body"),
        display: t("font-display"),
        mono: t("font-outlier"),
      },
      borderRadius: {
        card: t("radius-card"),
        input: t("radius-input"),
      },
      boxShadow: {
        card: t("shadow-card"),
        key: t("shadow-key"),
        "key-accent": t("shadow-key-accent"),
        "key-press": t("shadow-key-press"),
        float: t("shadow-float"),
      },
      transitionTimingFunction: {
        out: t("ease-out"),
        "in-out": t("ease-in-out"),
      },
      transitionDuration: {
        micro: t("dur-micro"),
        short: t("dur-short"),
      },
      keyframes: {
        pop: { from: { opacity: 0, transform: "scale(.96) translateY(4px)" }, to: { opacity: 1, transform: "none" } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        rise: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } },
        pulse_ring: { "0%": { transform: "scale(.6)", opacity: .9 }, "100%": { transform: "scale(2.2)", opacity: 0 } },
        draw: { from: { strokeDashoffset: 1 }, to: { strokeDashoffset: 0 } },
        rain: { from: { transform: "translateY(-20px)" }, to: { transform: "translateY(40px)" } },
      },
      animation: {
        rise: "rise .35s var(--ease-out) both",
        pop: "pop .16s var(--ease-out) both",
        fade: "fade .22s ease both",
        pulse_ring: "pulse_ring 1.8s ease-out infinite",
        draw: "draw .6s var(--ease-out) both",
        rain: "rain .9s linear infinite",
      },
    },
  },
  plugins: [],
}
