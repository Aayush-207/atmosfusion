import { useState, type ReactNode } from "react";
import { TriangleAlert, CloudRain, Umbrella, CalendarDays, ListOrdered } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWeatherStore } from "@/store/useWeatherStore";
import ScrollArea from "@/components/layout/ScrollArea";
import { API, LAYERS, type LayerMode, type QuantilePoint, type WeatherStation } from "@/types/weather";

const maxWeight = (s: WeatherStation) => Math.max(...Object.values(s.assigned_weights));

// Per layer: how to rank stations and what number to show for each.
const RANK: Record<LayerMode, { sort: (s: WeatherStation) => number; value: (s: WeatherStation) => string; sub?: (s: WeatherStation) => string }> = {
  consensus: { sort: (s) => s.consensus_blend, value: (s) => `${s.consensus_blend} mm`, sub: (s) => s.terrain_type },
  trust: { sort: maxWeight, value: (s) => `${Math.round(maxWeight(s) * 100)}%`, sub: (s) => `${s.dominant_model} (${s.dominant_family})` },
  disagreement: { sort: (s) => s.disagreement_index, value: (s) => `${s.disagreement_index} mm` },
  risk: { sort: (s) => s.worst_case_90th, value: (s) => `${s.worst_case_90th} mm` },
  coverage: { sort: (s) => s.coverage_area_km2 ?? 0, value: (s) => (s.coverage_radius_km ? `${s.coverage_radius_km} km` : "n/a"), sub: (s) => (s.coverage_area_km2 ? `${s.coverage_area_km2} km², as an equivalent radius` : "") },
};

const PROBS: [keyof WeatherStation, string][] = [
  ["p_heavy_rain", "Heavy, ≥64.5"],
  ["p_very_heavy", "Very heavy, ≥115.6"],
  ["p_extremely_heavy", "Extreme, ≥204.5"],
];

function Stat({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <dt className="text-[12px] font-medium text-label whitespace-nowrap">{label}</dt>
      <dd className={`figure text-[26px] leading-none mt-1.5 ${tone}`}>
        {value}<span className="text-[13px] font-medium text-label"> mm</span>
      </dd>
    </div>
  );
}

const HEAVY = 64.5;

// 10-day blended outlook: median line inside the 10 to 90th percentile band, against the flat average.
function Outlook({ id }: { id: string }) {
  const { data } = useQuery<QuantilePoint[]>({
    queryKey: ["curve", id],
    queryFn: () => fetch(`${API}/quantile-curve?station_id=${id}`).then((r) => r.json()),
  });
  if (!data?.length) return <div className="h-[168px] rounded-input bg-paper3 animate-pulse" role="status" aria-label="Loading the 10-day outlook" />;

  const W = 300, H = 150, L = 28, R = 4, T = 10, B = 20;
  const max = Math.max(...data.map((d) => d.p90), HEAVY) * 1.08;
  const step = max > 150 ? 50 : 25;
  const x = (day: number) => L + ((day - 1) / (data.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = (k: keyof QuantilePoint) => data.map((d, i) => `${i ? "L" : "M"}${x(d.lead_day)},${y(d[k])}`).join("");
  const band = path("p90") + [...data].reverse().map((d) => `L${x(d.lead_day)},${y(d.p10)}`).join("") + "Z";
  const grid = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
  const tick = { fill: "var(--color-muted)", fontSize: 10, fontFamily: "var(--font-body)" };

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label="Blend median, 10 to 90 percent range and simple average over the next 10 days, in millimetres">
        {grid.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} style={{ stroke: "var(--color-rule)" }} strokeWidth={1} />
            <text x={L - 6} y={y(v) + 3} textAnchor="end" style={tick}>{v}</text>
          </g>
        ))}
        {[1, 3, 5, 7, 10].map((d) => (
          <text key={d} x={x(d)} y={H - 4} textAnchor="middle" style={tick}>D{d}</text>
        ))}
        <line x1={L} x2={W - R} y1={y(HEAVY)} y2={y(HEAVY)} style={{ stroke: "var(--color-error)" }} strokeWidth={1} strokeDasharray="3 3" />
        <text x={W - R} y={y(HEAVY) - 4} textAnchor="end" style={{ ...tick, fill: "var(--color-error)" }}>IMD heavy, 64.5</text>
        <path d={band} style={{ fill: "color-mix(in oklab, var(--data-forecast) 13%, var(--color-paper))" }} />
        <path d={path("simple_avg")} fill="none" style={{ stroke: "var(--data-average)" }} strokeWidth={1.25} strokeDasharray="4 3" />
        <path key={id} d={path("p50")} fill="none" className="animate-draw" style={{ stroke: "var(--data-forecast)" }} strokeWidth={2.25} strokeLinejoin="round" pathLength={1} strokeDasharray={1} />
        {data.map((d) => <circle key={d.lead_day} cx={x(d.lead_day)} cy={y(d.p50)} r={2.25} style={{ fill: "var(--color-paper)", stroke: "var(--data-forecast)" }} strokeWidth={1.5} />)}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-muted">
        <Key swatch={<span className="w-3.5 h-[2px]" style={{ background: "var(--data-forecast)" }} />}>Blend median</Key>
        <Key swatch={<span className="w-3.5 h-2" style={{ background: "color-mix(in oklab, var(--data-forecast) 13%, var(--color-paper))" }} />}>10 to 90% range</Key>
        <Key swatch={<span className="w-3.5 border-t border-dashed border-muted" />}>Simple average</Key>
      </figcaption>
    </figure>
  );
}

function Key({ swatch, children }: { swatch: ReactNode; children: string }) {
  return <span className="flex items-center gap-1.5">{swatch}{children}</span>;
}

type Tab = "forecast" | "stations";

export default function AnalyticsDrawer() {
  const { selectedStation: station, forecast, layerMode, selectStation } = useWeatherStore();
  const [tab, setTab] = useState<Tab>("forecast");
  const layer = LAYERS[layerMode];
  const rank = RANK[layerMode];
  const stations = [...(forecast?.stations ?? [])].sort((a, b) => rank.sort(b) - rank.sort(a));
  const top = Math.max(...stations.map(rank.sort), 1);
  const tabs: [Tab, string][] = [["forecast", "Forecast"], ["stations", `Stations (${stations.length})`]];

  return (
    <aside className="w-[350px] flex-shrink-0 border-l border-rule bg-paper2 flex flex-col min-h-0">
      {station?.active_alert && (
        <div key={`alert-${station.id}`} role="alert" className="m-4 mb-0 animate-fade rounded-card px-3.5 py-3 bg-error-wash">
          <div className="flex items-center gap-1.5 text-error text-[13px] font-semibold font-display">
            <TriangleAlert size={14} strokeWidth={2.2} aria-hidden />
            Active alert
          </div>
          <p className="text-[13px] mt-1 leading-relaxed text-ink">{station.active_alert}</p>
        </div>
      )}

      <div role="tablist" aria-label="Panel" className="tray mx-4 mt-4 grid grid-cols-2 !bg-paper3">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <ScrollArea>
      <div role="tabpanel" className="pb-14">
        {tab === "forecast" && station && (
          <div className="p-4 space-y-4 animate-fade">
            <section className="card tone-teal">
              <div className="card-head"><h2><CloudRain size={14} aria-hidden />Day-1 forecast</h2><span className="aside">mm in 24 h</span></div>
              <dl className="tiles grid-cols-2">
                <Stat label="Blend" value={station.consensus_blend} tone="c-forecast" />
                <Stat label="90th percentile" value={station.worst_case_90th} tone="c-upper" />
                <Stat label="Model spread" value={station.disagreement_index} tone="c-spread" />
                <Stat label="Observed" value={station.observed_rain_24h} tone="c-observed" />
              </dl>
            </section>

            <section className="card tone-coral">
              <div className="card-head"><h2><Umbrella size={14} aria-hidden />Chance of heavy rain</h2><span className="aside">IMD, mm</span></div>
              <dl className="card-body space-y-2.5">
                {PROBS.map(([k, label]) => {
                  const p = Math.round((station[k] as number) * 100);
                  const tone = p >= 60 ? "var(--level-high)" : p >= 25 ? "var(--level-mid)" : "var(--level-low)";
                  return (
                    <div key={k} className="grid grid-cols-[124px_1fr_40px] items-center gap-3 text-[13px]">
                      <dt className="text-ink2 font-medium whitespace-nowrap">{label}</dt>
                      <dd className="meter"><span style={{ transform: `scaleX(${p / 100})`, background: tone }} /></dd>
                      <dd className="figure text-right text-[14px]">{p}%</dd>
                    </div>
                  );
                })}
              </dl>
            </section>

            <section className="card tone-sky">
              <div className="card-head"><h2><CalendarDays size={14} aria-hidden />10-day outlook</h2><span className="aside">mm per day</span></div>
              <div className="card-body"><Outlook id={station.id} /></div>
            </section>
          </div>
        )}

        {tab === "stations" && (
          <section className="card tone-emerald m-4 animate-fade">
            <div className="card-head"><h2><ListOrdered size={14} aria-hidden />Ranked by {layer.label.toLowerCase()}</h2></div>
            <ol>
              {stations.map((s, i) => {
                const sel = s.id === station?.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => selectStation(s.id)}
                      aria-current={sel || undefined}
                      className={`w-full text-left px-4 py-2.5 border-b border-rule transition-colors duration-micro ${sel ? "bg-paper2" : "hover:bg-paper2"}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`grid place-items-center w-5 h-5 rounded-full num text-[11px] font-semibold ${sel ? "bg-ink text-paper" : "bg-paper3 text-ink2"}`}>{i + 1}</span>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: layer.color(s) }} aria-hidden />
                        <span className="flex-1 min-w-0">
                          <span className={`block text-[14px] truncate ${sel ? "font-semibold text-heading" : "font-medium text-ink"}`}>{s.name}</span>
                          {rank.sub && <span className="block text-[12px] truncate text-label">{rank.sub(s)}</span>}
                        </span>
                        {s.active_alert && <TriangleAlert size={13} className="text-error flex-shrink-0" aria-label="Active alert" />}
                        <span className="figure text-[15px]">{rank.value(s)}</span>
                      </span>
                      <span className="meter mt-2 ml-8 !h-[2px]">
                        <span style={{ transform: `scaleX(${rank.sort(s) / top})`, background: layer.color(s) }} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
      </ScrollArea>
    </aside>
  );
}
