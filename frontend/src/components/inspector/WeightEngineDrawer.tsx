import type { ReactNode } from "react";
import { Mountain, MapPin, Sparkles } from "lucide-react";
import { useWeatherStore } from "@/store/useWeatherStore";
import { MODEL_LABELS, MODEL_FAMILIES, MODEL_COLORS } from "@/types/weather";

const maeTone = (mae: number) => (mae <= 8 ? "text-ok" : mae <= 15 ? "text-warn" : "text-alert");
const delay = (i: number) => ({ animationDelay: `${i * 60}ms` });

export default function WeightEngineDrawer() {
  const station = useWeatherStore((s) => s.selectedStation);

  return (
    <aside className="font-data w-[330px] flex-shrink-0 border-r border-line bg-surface/90 backdrop-blur-sm overflow-y-auto">
      {!station ? (
        <p className="p-5 text-sm text-muted">Select a station on the map.</p>
      ) : (
        // key re-mounts on selection so the entry animations replay
        <div key={station.id} className="p-5 space-y-7">
          <section className="animate-rise">
            <div className="section-head"><span className="label">Station</span></div>
            <h2 className="text-[22px] leading-tight font-semibold tracking-tight">{station.name}</h2>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Tag icon={<Mountain size={12} />}>{station.elevation_m} m</Tag>
              <Tag icon={<MapPin size={12} />}>{station.terrain_type}</Tag>
            </div>
          </section>

          <section className="animate-rise" style={delay(2)}>
            <div className="section-head"><span className="label">Model weights</span></div>
            <div className="space-y-3.5">
              {Object.entries(station.assigned_weights)
                .sort(([, a], [, b]) => b - a)
                .map(([key, w], i) => (
                  <div key={key} className="group animate-rise" style={delay(i + 3)}>
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-[2px]" style={{ background: MODEL_COLORS[key] ?? "#A9B0B6" }} />
                        {MODEL_LABELS[key] ?? key}
                      </span>
                      <span className="num font-medium">{Math.round(w * 100)}<span className="text-faint">%</span></span>
                    </div>
                    <div className="h-2 bg-paper border border-line rounded-[2px] mt-1.5 overflow-hidden">
                      <div
                        className="h-full origin-left animate-grow group-hover:brightness-110 transition-[filter]"
                        style={{ width: `${w * 100}%`, background: MODEL_COLORS[key] ?? "#A9B0B6", ...delay(i + 4) }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted mt-1">
                      <span>{MODEL_FAMILIES[key] ?? "Unknown"} · <span className="num">{station.model_predictions[key]} mm</span></span>
                      <span>MAE <span className={`num font-medium ${maeTone(station.recent_mae_48h[key])}`}>{station.recent_mae_48h[key]}</span></span>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          <section className="animate-rise" style={delay(9)}>
            <div className="section-head"><span className="label">Blend vs simple average</span></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="card border-line p-3">
                <div className="text-[11px] text-muted">Simple average</div>
                <div className="num text-xl text-muted">{station.simple_average}<span className="text-xs"> mm</span></div>
              </div>
              <div className="card shadow-hard p-3 bg-blend text-night border-blend">
                <div className="text-[11px] text-night/70">AtmosFusion blend</div>
                <div className="num text-xl font-medium">{station.consensus_blend}<span className="text-xs"> mm</span></div>
              </div>
            </div>
            <ErrorBars observed={station.observed_rain_24h} blend={station.consensus_blend} avg={station.simple_average} />
          </section>

          {station.shap_explanation && (
            <section className="animate-rise" style={delay(11)}>
              <div className="section-head"><span className="label">Why these weights</span></div>
              <blockquote className="relative border-l-[3px] border-accent bg-accent/10 pl-4 pr-3 py-3 rounded-r-[4px]">
                <Sparkles size={14} className="absolute right-3 top-3 text-accent" />
                <p className="text-[13.5px] leading-relaxed text-ink2 pr-5">{station.shap_explanation}</p>
              </blockquote>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}

function Tag({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 border border-line bg-paper rounded-full text-ink2">
      {icon}{children}
    </span>
  );
}

// Absolute miss against the gauge's observed 24h rainfall: the headline proof that skill-weighting beats flat averaging.
function ErrorBars({ observed, blend, avg }: { observed: number; blend: number; avg: number }) {
  const eb = Math.abs(blend - observed), ea = Math.abs(avg - observed);
  const top = Math.max(eb, ea, 1);
  const rows: [string, number, string][] = [["Blend", eb, "bg-blend"], ["Average", ea, "bg-faint"]];
  return (
    <div className="mt-3 rounded-md bg-paper border border-line p-3">
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-muted">Error vs observed <span className="num text-ink">{observed} mm</span></span>
        {ea > eb && <span className="font-semibold text-ok">{Math.round((1 - eb / ea) * 100)}% smaller</span>}
      </div>
      <div className="mt-2 space-y-1.5">
        {rows.map(([label, v, cls], i) => (
          <div key={label} className="flex items-center gap-2 text-[11px]">
            <span className="w-14 text-muted">{label}</span>
            <span className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
              <span className={`block h-full ${cls} rounded-full origin-left animate-grow`} style={{ width: `${(v / top) * 100}%`, animationDelay: `${300 + i * 80}ms` }} />
            </span>
            <span className="num w-14 text-right">{v.toFixed(1)} mm</span>
          </div>
        ))}
      </div>
    </div>
  );
}
