import { useWeatherStore } from "@/store/useWeatherStore";
import { LAYERS, type LayerMode, type WeatherStation } from "@/types/weather";

const maxWeight = (s: WeatherStation) => Math.max(...Object.values(s.assigned_weights));

// Per layer: how to rank stations and what number to show for each.
const RANK: Record<LayerMode, { sort: (s: WeatherStation) => number; value: (s: WeatherStation) => string; sub?: (s: WeatherStation) => string }> = {
  consensus: { sort: (s) => s.consensus_blend, value: (s) => `${s.consensus_blend} mm`, sub: (s) => s.terrain_type },
  trust: { sort: maxWeight, value: (s) => `${Math.round(maxWeight(s) * 100)}%`, sub: (s) => `${s.dominant_model} · ${s.dominant_family}` },
  disagreement: { sort: (s) => s.disagreement_index, value: (s) => `${s.disagreement_index} mm` },
  risk: { sort: (s) => s.worst_case_90th, value: (s) => `${s.worst_case_90th} mm` },
  coverage: { sort: (s) => s.coverage_radius_km ?? 0, value: (s) => (s.coverage_radius_km ? `~${s.coverage_radius_km} km` : "") },
};

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="num text-xl">{value}<span className="text-xs text-muted"> {unit}</span></div>
    </div>
  );
}

export default function AnalyticsDrawer() {
  const { selectedStation: station, forecast, layerMode, selectStation } = useWeatherStore();
  const layer = LAYERS[layerMode];
  const rank = RANK[layerMode];
  const stations = [...(forecast?.stations ?? [])].sort((a, b) => rank.sort(b) - rank.sort(a));

  return (
    <aside className="w-[340px] flex-shrink-0 border-l bg-surface overflow-y-auto">
      <div className="p-5 space-y-6">
        <section>
          <div className="label">{layer.label}</div>
          <p className="text-sm mt-1 leading-relaxed">{layer.caption}</p>
        </section>

        {station && (
          <section className="grid grid-cols-2 gap-4">
            <Stat label="Blend" value={station.consensus_blend} unit="mm" />
            <Stat label="90th percentile" value={station.worst_case_90th} unit="mm" />
            <Stat label="Model spread" value={station.disagreement_index} unit="mm" />
            <Stat label="P(heavy ≥64.5 mm)" value={Math.round(station.p_heavy_rain * 100)} unit="%" />
          </section>
        )}

        {station?.active_alert && (
          <div className="rounded-md border border-alert/30 bg-alert/5 p-3 text-sm text-alert">{station.active_alert}</div>
        )}

        <section>
          <div className="label mb-2">All stations</div>
          <ul className="-mx-2">
            {stations.map((s) => {
              const sel = s.id === station?.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => selectStation(s.id)}
                    className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${sel ? "bg-paper" : "hover:bg-paper/60"}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: layer.color(s) }} />
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm truncate ${sel ? "font-semibold" : ""}`}>{s.name}</span>
                      {rank.sub && <span className="block text-[11px] text-muted truncate">{rank.sub(s)}</span>}
                    </span>
                    {s.active_alert && <span className="w-1.5 h-1.5 rounded-full bg-alert" title="Active alert" />}
                    <span className="num text-sm">{rank.value(s)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </aside>
  );
}
