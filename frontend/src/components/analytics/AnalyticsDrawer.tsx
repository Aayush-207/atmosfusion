import { TriangleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWeatherStore } from "@/store/useWeatherStore";
import { API, LAYERS, type LayerMode, type QuantilePoint, type WeatherStation } from "@/types/weather";

const maxWeight = (s: WeatherStation) => Math.max(...Object.values(s.assigned_weights));

// Per layer: how to rank stations and what number to show for each.
const RANK: Record<LayerMode, { sort: (s: WeatherStation) => number; value: (s: WeatherStation) => string; sub?: (s: WeatherStation) => string }> = {
  consensus: { sort: (s) => s.consensus_blend, value: (s) => `${s.consensus_blend} mm`, sub: (s) => s.terrain_type },
  trust: { sort: maxWeight, value: (s) => `${Math.round(maxWeight(s) * 100)}%`, sub: (s) => `${s.dominant_model} · ${s.dominant_family}` },
  disagreement: { sort: (s) => s.disagreement_index, value: (s) => `${s.disagreement_index} mm` },
  risk: { sort: (s) => s.worst_case_90th, value: (s) => `${s.worst_case_90th} mm` },
  coverage: { sort: (s) => s.coverage_area_km2 ?? 0, value: (s) => (s.coverage_radius_km ? `${s.coverage_radius_km} km` : "–"), sub: (s) => (s.coverage_area_km2 ? `${s.coverage_area_km2} km² · equivalent radius` : "") },
};

const PROBS: [keyof WeatherStation, string][] = [
  ["p_heavy_rain", "Heavy ≥64.5"],
  ["p_very_heavy", "Very heavy ≥115.6"],
  ["p_extremely_heavy", "Extreme ≥204.5"],
];

function Stat({ label, value, unit, i }: { label: string; value: number; unit: string; i: number }) {
  return (
    <div className="p-3 bg-surface animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-[24px] leading-none mt-1.5 font-bold tracking-tight tabular-nums text-ink">
        {value}<span className="text-xs text-muted font-normal"> {unit}</span>
      </div>
    </div>
  );
}

const HEAVY = 64.5;

// 10-day blended outlook: median line inside the 10–90th percentile band, against the flat average.
function Outlook({ id }: { id: string }) {
  const { data } = useQuery<QuantilePoint[]>({
    queryKey: ["curve", id],
    queryFn: () => fetch(`${API}/quantile-curve?station_id=${id}`).then((r) => r.json()),
  });
  if (!data?.length) return <div className="h-[168px]" />;

  const W = 310, H = 150, L = 30, R = 6, T = 8, B = 20;
  const max = Math.max(...data.map((d) => d.p90), HEAVY) * 1.08;
  const step = max > 150 ? 50 : 25;
  const x = (day: number) => L + ((day - 1) / (data.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = (k: keyof QuantilePoint) => data.map((d, i) => `${i ? "L" : "M"}${x(d.lead_day)},${y(d[k])}`).join("");
  const band = path("p90") + [...data].reverse().map((d) => `L${x(d.lead_day)},${y(d.p10)}`).join("") + "Z";
  const grid = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);

  return (
    <div key={id} className="animate-rise">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        {grid.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth={1} />
            <text x={L - 6} y={y(v) + 3} textAnchor="end" className="fill-faint font-data text-[9px]">{v}</text>
          </g>
        ))}
        {[1, 3, 5, 7, 10].map((d) => (
          <text key={d} x={x(d)} y={H - 4} textAnchor="middle" className="fill-faint font-data text-[9px]">D{d}</text>
        ))}
        <line x1={L} x2={W - R} y1={y(HEAVY)} y2={y(HEAVY)} className="stroke-alert" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        <text x={W - R} y={y(HEAVY) - 4} textAnchor="end" className="fill-alert text-[9px]">IMD heavy 64.5</text>
        <path d={band} className="fill-blend/15" />
        <path d={path("simple_avg")} fill="none" className="stroke-muted" strokeWidth={1.25} strokeDasharray="4 3" />
        <path d={path("p50")} fill="none" className="stroke-blend animate-draw" strokeWidth={2.25} strokeLinejoin="round" pathLength={1} strokeDasharray={1} />
        {data.map((d) => <circle key={d.lead_day} cx={x(d.lead_day)} cy={y(d.p50)} r={2.25} className="fill-surface stroke-blend" strokeWidth={1.5} />)}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10.5px] text-muted">
        <Key cls="h-[2px] bg-blend">Blend median</Key>
        <Key cls="h-2 bg-blend/20">10–90% range</Key>
        <Key cls="h-0 border-t border-dashed border-muted">Simple average</Key>
      </div>
    </div>
  );
}

function Key({ cls, children }: { cls: string; children: string }) {
  return <span className="flex items-center gap-1.5"><span className={`w-3.5 ${cls}`} />{children}</span>;
}

export default function AnalyticsDrawer() {
  const { selectedStation: station, forecast, layerMode, selectStation } = useWeatherStore();
  const layer = LAYERS[layerMode];
  const rank = RANK[layerMode];
  const stations = [...(forecast?.stations ?? [])].sort((a, b) => rank.sort(b) - rank.sort(a));
  const top = Math.max(...stations.map(rank.sort), 1);

  return (
    <aside className="font-data w-[350px] flex-shrink-0 border-l border-line bg-surface overflow-y-auto">
      <div className="p-5 space-y-8">
        {station?.active_alert && (
          <div key={`alert-${station.id}`} className="animate-rise rounded-md border border-alert/30 border-l-[3px] border-l-alert p-3.5 bg-alert/[0.06]">
            <div className="flex items-center gap-2 text-alert">
              <TriangleAlert size={15} strokeWidth={2.4} />
              <span className="label !text-alert">Active alert</span>
            </div>
            <p className="text-[13px] mt-2 leading-relaxed text-ink">{station.active_alert}</p>
          </div>
        )}

        {station && (
          <section key={station.id}>
            <div className="section-head sec-blue"><span className="label">Day-1 forecast</span></div>
            <div className="card grid grid-cols-2 gap-px bg-line overflow-hidden">
              <Stat i={0} label="Blend" value={station.consensus_blend} unit="mm" />
              <Stat i={1} label="90th percentile" value={station.worst_case_90th} unit="mm" />
              <Stat i={2} label="Model spread" value={station.disagreement_index} unit="mm" />
              <Stat i={3} label="Observed 24h" value={station.observed_rain_24h} unit="mm" />
            </div>

            <div className="mt-4 space-y-2">
              {PROBS.map(([k, label], i) => {
                const p = Math.round((station[k] as number) * 100);
                const tone = p >= 60 ? "bg-alert" : p >= 25 ? "bg-warn" : "bg-ok";
                return (
                  <div key={k} className="flex items-center gap-3 text-[11px]">
                    <span className="w-[124px] whitespace-nowrap text-muted">P({label})</span>
                    <span className="flex-1 h-1.5 bg-paper rounded-full overflow-hidden">
                      <span className={`block h-full ${tone} origin-left animate-grow rounded-full`} style={{ width: `${p}%`, animationDelay: `${200 + i * 80}ms` }} />
                    </span>
                    <span className="num w-9 text-right font-medium">{p}%</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {station && (
          <section>
            <div className="section-head sec-violet"><span className="label">10-day outlook · mm</span></div>
            <Outlook id={station.id} />
          </section>
        )}

        <section>
          <div className="section-head sec-grey"><span className="label">Stations by {layer.label.toLowerCase()}</span></div>
          <ol className="space-y-1">
            {stations.map((s, i) => {
              const sel = s.id === station?.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => selectStation(s.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-md border transition-all duration-200 ${sel ? "bg-ink text-white border-ink shadow-hard-sm" : "border-transparent hover:border-line hover:bg-paper"}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`num text-[11px] w-4 ${sel ? "text-white/50" : "text-faint"}`}>{String(i + 1).padStart(2, "0")}</span>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: layer.color(s) }} />
                      <span className="flex-1 min-w-0">
                        <span className={`block text-[13px] truncate ${sel ? "font-semibold" : ""}`}>{s.name}</span>
                        {rank.sub && <span className={`block text-[11px] truncate ${sel ? "text-white/60" : "text-muted"}`}>{rank.sub(s)}</span>}
                      </span>
                      {s.active_alert && <span className="w-1.5 h-1.5 rounded-full bg-alert" title="Active alert" />}
                      <span className="num text-[13px]">{rank.value(s)}</span>
                    </span>
                    <span className={`block h-[2px] mt-1.5 ml-7 rounded-full ${sel ? "bg-white/15" : "bg-line/60"}`}>
                      <span
                        className="block h-full rounded-full transition-[width] duration-500 ease-out"
                        style={{ width: `${(rank.sort(s) / top) * 100}%`, background: layer.color(s) }}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </aside>
  );
}
