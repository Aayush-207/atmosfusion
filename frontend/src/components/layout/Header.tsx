import { useEffect, useRef, useState, type ReactNode } from "react";
import CountUp from "@/components/layout/CountUp";
import { CloudRain, TriangleAlert, MapPin, Wind, CalendarRange, Clock } from "lucide-react";
import { useWeatherStore } from "@/store/useWeatherStore";

// Three zones on one grid so the centre group is truly centred whatever the sides hold:
// the brand, the region's context, and the run plus its alerts.
export default function Header() {
  const { forecast, selectStation } = useWeatherStore();
  // Worst first, so the alert button jumps straight to the most severe gauge.
  const alerts = (forecast?.stations ?? []).filter((s) => s.active_alert).sort((a, b) => b.consensus_blend - a.consensus_blend);

  return (
    <header className="flex-shrink-0 h-14 px-4 grid grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center gap-4 bg-paper border-b border-rule relative z-[50]">
      <div className="flex items-center gap-2.5 min-w-0" title="Hybrid AI–NWP rainfall blending for NCMRWF and MoES">
        <span className="grid place-items-center w-8 h-8 rounded-[9px] bg-ink text-paper flex-shrink-0">
          <CloudRain size={17} strokeWidth={2.2} aria-hidden />
        </span>
        <div className="leading-none min-w-0">
          <div className="font-display text-[17px] font-bold tracking-[-0.02em] text-heading">Atmos<span className="text-accent">Fusion</span></div>
          <div className="text-[11px] font-medium text-label mt-1 truncate hidden xl:block">Rainfall blending, NCMRWF and MoES</div>
        </div>
      </div>

      {forecast ? (
        <dl className="hidden lg:flex items-center h-9 min-w-0 max-w-full rounded-full bg-paper2 border border-rule px-1 text-[12.5px]">
          <Fact icon={<MapPin size={13} className="c-forecast" />} label="Region" value={forecast.region_name} />
          <Fact icon={<Wind size={13} className="c-observed" />} label="Regime" value={forecast.regime} extra={<><CountUp value={Math.round(forecast.regime_confidence * 100)} />%</>} />
          <Fact icon={<CalendarRange size={13} className="c-upper" />} label="Season" value={forecast.season} className="hidden 2xl:flex" />
        </dl>
      ) : <span />}

      <div className="flex items-center justify-end gap-2.5 min-w-0">
        <span className="hidden xl:inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-rule text-[12px] font-medium text-ink2 whitespace-nowrap">
          <Clock size={13} className="c-forecast" aria-hidden />
          Day 1, 24-hour totals
        </span>
        {alerts.length > 0 && <AlertsMenu alerts={alerts} onPick={selectStation} />}
      </div>
    </header>
  );
}

function Fact({ icon, label, value, extra, className = "" }: { icon: ReactNode; label: string; value: string; extra?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 min-w-0 [&+&]:border-l [&+&]:border-rule2 ${className}`}>
      <dt className="flex items-center gap-1.5 text-label">
        <span aria-hidden>{icon}</span>
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="font-semibold text-heading truncate max-w-[240px]">
        {value}{extra && <span className="num font-medium text-label"> ({extra})</span>}
      </dd>
    </div>
  );
}

type AlertStation = { id: string; name: string; active_alert: string | null; consensus_blend: number };

// Active alerts live in the top bar: the count as a button, the list in a popover that opens from it.
function AlertsMenu({ alerts, onPick }: { alerts: AlertStation[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full bg-error-wash text-error text-[12px] font-semibold whitespace-nowrap active:scale-[0.97] hover:brightness-[0.97]"
      >
        <span className="relative flex w-2 h-2" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-error animate-pulse_ring" />
          <span className="relative w-2 h-2 rounded-full bg-error" />
        </span>
        {alerts.length} active alert{alerts.length > 1 ? "s" : ""}
      </button>

      {/* Kept mounted so it can fade and settle out, not vanish; it scales from the button's corner */}
      <div
        role="menu"
        aria-hidden={!open}
        className={`absolute right-0 top-[calc(100%+8px)] z-[60] w-[360px] rounded-[14px] bg-paper shadow-float ring-1 ring-rule origin-top-right transition-[opacity,transform] duration-short ease-out ${open ? "opacity-100 scale-100" : "opacity-0 scale-[0.97] -translate-y-1 pointer-events-none"}`}
      >
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="font-display text-[14px] font-semibold text-heading">Active alerts</span>
          <span className="text-[12px] text-label">Worst first</span>
        </div>
        <ul className="pb-1.5">
          {alerts.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                role="menuitem"
                tabIndex={open ? 0 : -1}
                onClick={() => { onPick(a.id); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 flex gap-3 hover:bg-paper2 border-t border-rule"
              >
                <TriangleAlert size={15} className="text-error flex-shrink-0 mt-0.5" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-semibold text-heading truncate">{a.name}</span>
                    <span className="num text-[12px] font-semibold c-forecast flex-shrink-0">{a.consensus_blend} mm</span>
                  </span>
                  <span className="block text-[12px] leading-snug text-ink2 mt-0.5 line-clamp-2">{a.active_alert}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
