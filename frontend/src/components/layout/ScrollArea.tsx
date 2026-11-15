import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// A scrolling column with no visible scrollbar. When there is more below, the foot fades and a round
// arrow appears; pressing it scrolls about two thirds of a panel. Wheel, touch and keyboard still scroll.
export default function ScrollArea({ children, className = "" }: { children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  const check = useCallback(() => {
    const el = box.current;
    if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(check);
    if (box.current) ro.observe(box.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [check]);

  const down = () => {
    const el = box.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = el.scrollTop, by = el.clientHeight * 0.66;
    el.scrollBy({ top: by, behavior: reduce ? "auto" : "smooth" });
    // If the browser isn't painting frames (a background tab), smooth scrolling never starts: jump instead
    setTimeout(() => { if (el.scrollTop === from) el.scrollTop = from + by; }, 250);
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div ref={box} onScroll={check} className={`no-scrollbar flex-1 min-h-0 overflow-y-auto ${className}`}>
        <div ref={inner}>{children}</div>
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-20 transition-opacity duration-short ease-out ${more ? "opacity-100" : "opacity-0"}`}
        style={{ background: "linear-gradient(to top, var(--color-paper-2) 20%, transparent)" }}
      />
      <button
        type="button"
        onClick={down}
        aria-label="Scroll down"
        tabIndex={more ? 0 : -1}
        className={`absolute bottom-3 left-1/2 grid place-items-center w-9 h-9 rounded-full bg-ink text-paper shadow-float transition-[opacity,transform] duration-short ease-out active:scale-[0.94] ${more ? "opacity-100 -translate-x-1/2" : "opacity-0 -translate-x-1/2 translate-y-2 pointer-events-none"}`}
      >
        <ChevronDown size={18} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}
