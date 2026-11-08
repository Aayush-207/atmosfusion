import { useWeatherStore } from "@/store/useWeatherStore";

export default function Header() {
  const forecast = useWeatherStore((s) => s.forecast);
  const leadDay = useWeatherStore((s) => s.leadDay);

  return (
    <header className="flex-shrink-0 h-14 px-5 flex items-center justify-between border-b bg-surface">
      <div className="flex items-baseline gap-3">
        <span className="text-[15px] font-semibold tracking-tight">AtmosFusion</span>
        <span className="text-xs text-muted hidden md:inline">Multi-model rainfall blending · NCMRWF</span>
      </div>
      {forecast && (
        <div className="flex items-center gap-6 text-xs">
          <Item label="Region" value={forecast.region_name} />
          <Item label="Regime" value={`${forecast.regime} · ${Math.round(forecast.regime_confidence * 100)}%`} className="hidden lg:block" />
          <Item label="Season" value={forecast.season} className="hidden xl:block" />
          <Item label="Lead" value={`Day ${leadDay}`} />
        </div>
      )}
    </header>
  );
}

function Item({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="label !text-[10px]">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
