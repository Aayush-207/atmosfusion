import { Mountain, MapPin, Scale, Lightbulb } from "lucide-react";
import { useWeatherStore } from "@/store/useWeatherStore";
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
    <aside className="w-[340px] flex-shrink-0 border-r border-rule bg-paper2 overflow-y-auto">
      <div className="p-4 space-y-4">
        <section className="card card-body">
          <h1 key={station.id} className="text-[23px] leading-tight animate-fade">{station.name}</h1>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="chip"><Mountain size={12} aria-hidden /><span className="sr-only">Elevation </span><span className="num">{station.elevation_m} m</span></span>
            <span className="chip"><MapPin size={12} aria-hidden /><span className="sr-only">Terrain </span>{station.terrain_type}</span>
          </div>
        </section>

        <BlendLedger observed={station.observed_rain_24h} blend={station.consensus_blend} avg={station.simple_average} />

        <section className="card">
          <div className="card-head">
            <h2><Scale size={14} aria-hidden />Model weights</h2>
            <span className="aside">MAE over 48 h, mm</span>
          </div>
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
                    <span className="flex items-center gap-2 font-medium text-ink text-[13px] whitespace-nowrap">
                      <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ background: MODEL_COLORS[key] }} aria-hidden />
                      {MODEL_LABELS[key] ?? key}
                    </span>
                    <span className="block pl-4 text-[12px] text-label">{MODEL_FAMILIES[key] ?? "Unknown"}</span>
                  </td>
                  <td className={`num text-right text-[13px] ${maeTone(station.recent_mae_48h[key])}`}>{station.recent_mae_48h[key]}</td>
                  <td className="w-[72px]">
                    <span className="figure block text-right text-[15px]">{Math.round(w * 100)}%</span>
                    <span className="meter mt-1"><span style={{ transform: `scaleX(${w})`, background: MODEL_COLORS[key] }} /></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {station.shap_explanation && (
          <section className="card">
            <div className="card-head"><h2><Lightbulb size={14} aria-hidden />Why these weights</h2></div>
            <p className="card-body text-[13.5px] leading-relaxed text-ink2">{station.shap_explanation}</p>
          </section>
        )}
      </div>
    </aside>
  );
}

// The signature: the blended figure set large on the darkest shade, and the proof under it, the miss against
// the gauge compared with a flat average of every model.
function BlendLedger({ observed, blend, avg }: { observed: number; blend: number; avg: number }) {
  const eb = Math.abs(blend - observed), ea = Math.abs(avg - observed);
  const top = Math.max(eb, ea, 1);
  const rows: [string, number, string][] = [["Blend", eb, "var(--color-accent-2)"], ["Average", ea, "var(--color-graphite-muted)"]];
  return (
    <section className="graphite p-4 shadow-card" aria-label="Blended forecast">
      <div className="text-[13px] text-gmuted">AtmosFusion blend, next 24 h</div>
      <div className="font-display font-semibold tracking-[-0.028em] num text-[44px] leading-none mt-1.5 text-gink">
        {blend}<span className="text-[18px] font-medium text-gmuted"> mm</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
        <div className="rounded-input bg-graphite2 px-2.5 py-2"><dt className="text-gmuted">Simple average</dt><dd className="num text-gink font-medium">{avg} mm</dd></div>
        <div className="rounded-input bg-graphite2 px-2.5 py-2"><dt className="text-gmuted">Gauge observed</dt><dd className="num text-gink font-medium">{observed} mm</dd></div>
      </dl>
      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between gap-2 text-[12px]">
          <span className="text-gmuted">Miss against the gauge</span>
          {ea > eb && <span className="font-medium text-accent2">{Math.round((1 - eb / ea) * 100)}% smaller</span>}
        </div>
        {rows.map(([label, v, color]) => (
          <div key={label} className="grid grid-cols-[56px_1fr_56px] items-center gap-2 text-[12px]">
            <span className="text-gmuted">{label}</span>
            <span className="meter !bg-graphite2"><span style={{ transform: `scaleX(${v / top})`, background: color }} /></span>
            <span className="num text-right text-gink">{v.toFixed(1)} mm</span>
          </div>
        ))}
      </div>
    </section>
  );
}
