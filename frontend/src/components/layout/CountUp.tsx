import { useLayoutEffect, useRef } from "react";

type Props = { value: number; decimals?: number; duration?: number; replay?: unknown };

// A number that counts up from zero to its value: on first render, whenever the value changes, and whenever
// `replay` changes (pass the station id so switching stations always replays, even to an equal value).
// It writes the digits straight into its own text node each frame, so the count never re-renders React;
// it keeps the value's own decimals, eases out, and lands exactly on the value even if frames are throttled.
export default function CountUp({ value, decimals, duration = 900, replay }: Props) {
  const el = useRef<HTMLSpanElement>(null);
  const places = decimals ?? (String(value).split(".")[1]?.length ?? 0);

  // A layout effect so the zero is written before the browser paints: no flash of an old or empty value
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const show = (n: number) => { node.textContent = n.toFixed(places); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { show(value); return; }
    show(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      show(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // A background tab may not paint frames: make sure the true value always arrives
    const land = setTimeout(() => { cancelAnimationFrame(raf); show(value); }, duration + 150);
    return () => { cancelAnimationFrame(raf); clearTimeout(land); };
  }, [value, places, duration, replay]);

  // No React-managed text inside: the effect owns this node's digits
  return <span ref={el} className="tabular-nums" />;
}
