import type { ReactNode } from "react";
import { CloudRain, TriangleAlert, MapPin, Wind, CalendarRange, Clock } from "lucide-react";
import { useWeatherStore } from "@/store/useWeatherStore";

// Three zones on one grid so the centre group is truly centred whatever the sides hold:
// the brand, the region's context, and the run plus its alerts.
export default function Header() {
  const { forecast, selectStation } = useWeatherStore();
  // Worst first, so the alert button jumps straight to the most severe gauge.
  const alerts = (forecast?.stations ?? []).filter((s) => s.active_alert).sort((a, b) => b.consensus_blend - a.consensus_blend);

  return (
    <header className="flex-shrink-0 h-14 px-4 grid grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center gap-4 bg-paper border-b border-rule relative z-10">
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
          <Fact icon={<MapPin size={13} />} label="Region" value={forecast.region_name} />
          <Fact icon={<Wind size={13} />} label="Regime" value={forecast.regime} extra={`${Math.round(forecast.regime_confidence * 100)}%`} />
          <Fact icon={<CalendarRange size={13} />} label="Season" value={forecast.season} className="hidden 2xl:flex" />
        </dl>
      ) : <span />}

      <div className="flex items-center justify-end gap-2.5 min-w-0">
        <span className="hidden xl:inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-rule text-[12px] font-medium text-ink2 whitespace-nowrap">
          <Clock size={13} className="text-label" aria-hidden />
          Day 1, 24-hour totals
        </span>
        {alerts.length > 0 && (
          <button
            type="button"
            onClick={() => selectStation(alerts[0].id)}
            className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full bg-error-wash text-error text-[12px] font-bold whitespace-nowrap transition-transform duration-micro ease-out active:scale-[0.97] hover:brightness-[0.97]"
            title="Jump to the most severe alert"
          >
            <TriangleAlert size={14} strokeWidth={2.4} aria-hidden />
            {alerts.length} active alert{alerts.length > 1 ? "s" : ""}
          </button>
        )}
      </div>
    </header>
  );
}

function Fact({ icon, label, value, extra, className = "" }: { icon: ReactNode; label: string; value: string; extra?: string; className?: string }) {
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
