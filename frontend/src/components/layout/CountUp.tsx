import { useEffect, useState } from "react";

// A number that counts up from zero to its value: on first render, whenever the value changes, and whenever
// `replay` changes (pass the station id so switching stations always replays, even to an equal value).
// Keeps the value's own decimals, eases out, and lands exactly on the value even if frames are throttled.
type Props = { value: number; decimals?: number; duration?: number; replay?: unknown };

// A new value or a new station remounts the counter, so it starts from exactly zero on its first paint.
export default function CountUp(props: Props) {
  return <Counter key={`${String(props.replay)}|${props.value}`} {...props} />;
}

function Counter({ value, decimals, duration = 900, replay }: Props) {
  const places = decimals ?? (String(value).split(".")[1]?.length ?? 0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let raf = 0;
    // Reduced motion: show the value at once
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setTimeout(() => setShown(value), 0);
      return () => clearTimeout(id);
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // A background tab may not paint frames: make sure the true value always arrives
    const land = setTimeout(() => { cancelAnimationFrame(raf); setShown(value); }, duration + 150);
    return () => { cancelAnimationFrame(raf); clearTimeout(land); };
  }, [value, duration, replay]);

  return <span className="tabular-nums">{shown.toFixed(places)}</span>;
}
