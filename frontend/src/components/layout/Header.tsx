import { CloudRain, TriangleAlert } from "lucide-react";
import { useWeatherStore } from "@/store/useWeatherStore";

export default function Header() {
  const { forecast, selectStation } = useWeatherStore();
  // Worst first, so the alert link jumps straight to the most severe gauge.
  const alerts = (forecast?.stations ?? []).filter((s) => s.active_alert).sort((a, b) => b.consensus_blend - a.consensus_blend);

  return (
    <header className="flex-shrink-0 h-14 px-5 flex items-center gap-6 bg-paper border-b border-rule relative z-10">
      <div className="flex items-center gap-2" title="Hybrid AI–NWP rainfall blending for NCMRWF and MoES">
        <CloudRain size={20} strokeWidth={2} className="text-accent" aria-hidden />
        <span className="font-display text-[19px] font-semibold tracking-[-0.028em] text-heading">AtmosFusion</span>
      </div>

      {forecast && (
        <>
          <dl className="hidden lg:flex items-baseline gap-5 text-[13px] min-w-0">
            <div className="flex gap-1.5 min-w-0">
              <dt className="text-muted">Region</dt>
              <dd className="font-medium text-heading truncate">{forecast.region_name}</dd>
            </div>
            <div className="flex gap-1.5 min-w-0">
              <dt className="text-muted">Regime</dt>
              <dd className="font-medium text-heading truncate">
                {forecast.regime} <span className="num text-muted font-normal">({Math.round(forecast.regime_confidence * 100)}%)</span>
              </dd>
            </div>
            <div className="hidden 2xl:flex gap-1.5">
              <dt className="text-muted">Season</dt>
              <dd className="font-medium text-ink">{forecast.season}</dd>
            </div>
          </dl>

          <div className="ml-auto flex items-center gap-5 text-[13px]">
            <span className="hidden sm:inline text-muted">Day 1, 24-hour totals</span>
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={() => selectStation(alerts[0].id)}
                className="flex items-center gap-1.5 font-medium text-error underline decoration-transparent underline-offset-4 hover:decoration-current transition-[text-decoration-color] duration-micro"
                title="Jump to the most severe alert"
              >
                <TriangleAlert size={15} strokeWidth={2.2} aria-hidden />
                {alerts.length} active alert{alerts.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
}
