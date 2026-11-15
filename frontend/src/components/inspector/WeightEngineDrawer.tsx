import { Mountain, MapPin, Scale, Lightbulb, CloudRain } from "lucide-react";
import { useWeatherStore } from "@/store/useWeatherStore";
import ScrollArea from "@/components/layout/ScrollArea";
import { MODEL_LABELS, MODEL_FAMILIES, MODEL_COLORS } from "@/types/weather";

const maeTone = (mae: number) => (mae <= 8 ? "text-success" : mae <= 15 ? "text-warning" : "text-error");

export default function WeightEngineDrawer() {
  const station = useWeatherStore((s) => s.selectedStation);

  if (!station) {
    return (
      <aside className="w-[340px] flex-shrink-0 border-r border-rule bg-paper2">
        <p className="p-5 text-sm text-muted">Select a gauge on the map to see how its forecast is blended.</p>
      </aside>
    );
  }

  // Rows keyed by model, not station, so a new station eases each meter to its new length
  const weights = Object.entries(station.assigned_weights).sort(([, a], [, b]) => b - a);

  return (
    <aside className="w-[340px] flex-shrink-0 border-r border-rule bg-paper2 flex flex-col min-h-0">
      <ScrollArea>
      <div className="p-4 pb-16 space-y-4">
        <header className="px-1 pt-1 pb-1">
          <h1 key={station.id} className="font-display text-[22px] font-semibold leading-[1.2] tracking-[-0.015em] text-heading animate-fade">{station.name}</h1>
          <dl className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            <div className="flex items-center gap-1.5"><dt><Mountain size={14} className="text-label" aria-label="Elevation" /></dt><dd className="num font-medium text-ink2">{station.elevation_m} m</dd></div>
            <div className="flex items-center gap-1.5 min-w-0"><dt><MapPin size={14} className="text-label" aria-label="Terrain" /></dt><dd className="font-medium text-ink2 truncate">{station.terrain_type}</dd></div>
          </dl>
        </header>

        <section className="card tone-blue">
          <div className="card-head">
            <h2><Scale size={14} aria-hidden />Model weights</h2>
            <span className="aside">MAE over 48 h, mm</span>
          </div>

          <WeightDonut weights={weights} />

          <table className="rtable inset">
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col" style={{ textAlign: "right" }}>MAE</th>
                <th scope="col" style={{ textAlign: "right" }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {weights.map(([key, w]) => (
                <tr key={key} className="hover:bg-paper2 transition-colors duration-micro">
                  <td>
                    <span className="flex items-center gap-2 font-semibold text-heading text-[13px] whitespace-nowrap">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: MODEL_COLORS[key] }} aria-hidden />
                      {MODEL_LABELS[key] ?? key}
                    </span>
                    <span className="block pl-[18px] text-[12px] text-label">{MODEL_FAMILIES[key] ?? "Unknown"}</span>
                  </td>
                  <td className={`num text-right text-[13px] ${maeTone(station.recent_mae_48h[key])}`}>{station.recent_mae_48h[key]}</td>
                  <td className="w-[72px]">
                    <span className="block text-right font-display text-[15px] font-semibold num text-heading">{Math.round(w * 100)}%</span>
                    <span className="meter mt-1"><span style={{ transform: `scaleX(${w})`, background: MODEL_COLORS[key] }} /></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {station.shap_explanation && (
          <section className="card tone-amber">
            <div className="card-head"><h2><Lightbulb size={14} aria-hidden />Why these weights</h2></div>
            <p className="card-body text-[13.5px] leading-[1.6] text-ink2">{station.shap_explanation}</p>
          </section>
        )}

        <BlendLedger observed={station.observed_rain_24h} blend={station.consensus_blend} avg={station.simple_average} />
      </div>
      </ScrollArea>
    </aside>
  );
}

// Each model's share of the blend as a donut, in the same colour the table uses for that model.
// Segments are drawn on one circle with pathLength 100, so a share is its own dash length.
function WeightDonut({ weights }: { weights: [string, number][] }) {
  const total = weights.reduce((n, [, w]) => n + w, 0) || 1;
  const GAP = 0.8; // hairline of white between segments
  // Where each segment starts, as a running sum of the shares before it
  const shares = weights.map(([, w]) => (w / total) * 100);
  const starts = shares.map((_, i) => shares.slice(0, i).reduce((n, x) => n + x, 0));
  const [leadKey, leadW] = weights[0];
  return (
    <div className="flex items-center gap-4 px-4 pt-3.5 pb-2">
      <svg viewBox="0 0 42 42" className="w-[112px] h-[112px] flex-shrink-0 -rotate-90" role="img"
        aria-label={weights.map(([k, w]) => `${MODEL_LABELS[k] ?? k} ${Math.round(w * 100)}%`).join(", ")}>
        <circle cx="21" cy="21" r="15.9" fill="none" style={{ stroke: "var(--color-paper-3)" }} strokeWidth="6" />
        {weights.map(([k], i) => {
          const len = Math.max(shares[i] - GAP, 0);
          return (
            <circle key={k} cx="21" cy="21" r="15.9" fill="none" pathLength={100} strokeWidth="6"
              style={{ stroke: MODEL_COLORS[k], strokeDasharray: `${len} ${100 - len}`, strokeDashoffset: -starts[i], transition: "stroke-dasharray 300ms var(--ease-out), stroke-dashoffset 300ms var(--ease-out)" }} />
          );
        })}
      </svg>
      <div className="min-w-0">
        <div className="text-[12px] text-label">Largest share</div>
        <div className="font-display text-[28px] font-semibold leading-none mt-1 num text-heading">{Math.round(leadW * 100)}%</div>
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink mt-1.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: MODEL_COLORS[leadKey] }} aria-hidden />
          <span className="truncate">{MODEL_LABELS[leadKey] ?? leadKey}</span>
        </div>
        <div className="text-[12px] text-label mt-0.5">of {weights.length} models in the blend</div>
      </div>
    </div>
  );
}

// The result of the ensemble, at the foot of the panel: the blended figure, the simple average and the gauge,
// and how much smaller the blend's miss is than the average's.
function BlendLedger({ observed, blend, avg }: { observed: number; blend: number; avg: number }) {
  const eb = Math.abs(blend - observed), ea = Math.abs(avg - observed);
  const top = Math.max(eb, ea, 1);
  const rows: [string, number, string][] = [["Blend", eb, "var(--data-forecast)"], ["Average", ea, "var(--data-average)"]];
  return (
    <section className="card tone-emerald" aria-label="Blended forecast">
      <div className="card-head">
        <h2><CloudRain size={14} aria-hidden />AtmosFusion blend</h2>
        <span className="aside">next 24 h</span>
      </div>
      <div className="card-body">
        <div className="figure c-forecast text-[38px] leading-none">
          {blend}<span className="text-[16px] font-semibold text-label"> mm</span>
        </div>
        <dl className="tiles grid-cols-2 mt-3 -mx-4">
          <div><dt className="text-[12px] text-label">Simple average</dt><dd className="num text-[15px] font-semibold text-ink2">{avg} mm</dd></div>
          <div><dt className="text-[12px] text-label">Gauge observed</dt><dd className="num text-[15px] font-semibold c-observed">{observed} mm</dd></div>
        </dl>
        <div className="mt-3 space-y-2">
          <div className="flex items-baseline justify-between gap-2 text-[12px]">
            <span className="text-label">Miss against the gauge</span>
            {ea > eb && <span className="font-semibold text-success">{Math.round((1 - eb / ea) * 100)}% smaller</span>}
          </div>
          {rows.map(([label, v, color]) => (
            <div key={label} className="grid grid-cols-[56px_1fr_56px] items-center gap-2 text-[12px]">
              <span className="text-label">{label}</span>
              <span className="meter"><span style={{ transform: `scaleX(${v / top})`, background: color }} /></span>
              <span className="num text-right text-ink">{v.toFixed(1)} mm</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
