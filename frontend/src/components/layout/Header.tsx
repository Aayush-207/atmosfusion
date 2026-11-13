import type { ReactNode } from "react";
import { CloudRain, TriangleAlert, MapPin } from "lucide-react";
import { useWeatherStore } from "@/store/useWeatherStore";

export default function Header() {
  const { forecast, selectStation } = useWeatherStore();
  // Worst first, so the pill jumps straight to the most severe gauge.
  const alerts = (forecast?.stations ?? []).filter((s) => s.active_alert).sort((a, b) => b.consensus_blend - a.consensus_blend);

  return (
    <header className="flex-shrink-0 h-14 px-5 flex items-center gap-6 bg-surface border-b border-line relative z-10">
      <div className="flex items-center gap-2.5 animate-rise">
        <span className="grid place-items-center w-8 h-8 rounded-md bg-accent text-white">
          <CloudRain size={18} strokeWidth={2.2} />
        </span>
        <div className="leading-none">
          <div className="text-[17px] font-semibold tracking-tight">Atmos<span className="font-normal text-accent">Fusion</span></div>
          <div className="text-[10.5px] text-muted mt-1 hidden md:block">Hybrid AI–NWP rainfall blending · NCMRWF / MoES</div>
        </div>
      </div>

      {forecast && (
        <>
          <div className="hidden lg:flex items-center gap-5 pl-6 border-l border-line h-8 text-[12px] animate-rise [animation-delay:80ms]">
            <Meta icon={<MapPin size={13} />} value={forecast.region_name} />
            <Meta label="Regime" value={`${forecast.regime} · ${Math.round(forecast.regime_confidence * 100)}%`} />
            <Meta label="Season" value={forecast.season} className="hidden xl:flex" />
          </div>

          <div className="ml-auto flex items-center gap-2 animate-rise [animation-delay:160ms]">
            <span className="hidden sm:inline text-[11px] text-muted">24h forecast · Day 1</span>
            {alerts.length > 0 && (
              <button
                onClick={() => selectStation(alerts[0].id)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-alert/10 text-alert text-[12px] font-medium hover:bg-alert/15 transition-colors"
                title="Jump to the most severe alert"
              >
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-alert animate-pulse_ring" />
                  <span className="relative w-2 h-2 rounded-full bg-alert" />
                </span>
                <TriangleAlert size={13} />
                {alerts.length} active alert{alerts.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
}

function Meta({ label, value, icon, className = "" }: { label?: string; value: string; icon?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {icon && <span className="text-muted">{icon}</span>}
      {label && <span className="text-muted">{label}</span>}
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
