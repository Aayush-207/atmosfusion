import { useWeatherStore } from "@/store/useWeatherStore";
import { MODEL_LABELS, MODEL_FAMILIES, MODEL_COLORS } from "@/types/weather";

const maeTone = (mae: number) => (mae <= 8 ? "text-ok" : mae <= 15 ? "text-warn" : "text-alert");

export default function WeightEngineDrawer() {
  const station = useWeatherStore((s) => s.selectedStation);

  return (
    <aside className="w-[320px] flex-shrink-0 border-r bg-surface overflow-y-auto">
      {!station ? (
        <p className="p-5 text-sm text-muted">Select a station on the map.</p>
      ) : (
        <div className="p-5 space-y-6">
          <section>
            <div className="label">Station</div>
            <h2 className="text-lg font-semibold mt-0.5">{station.name}</h2>
            <div className="text-xs text-muted">{station.terrain_type} · {station.elevation_m} m</div>
          </section>

          <section>
            <div className="label mb-3">Model weights</div>
            <div className="space-y-3">
              {Object.entries(station.assigned_weights)
                .sort(([, a], [, b]) => b - a)
                .map(([key, w]) => (
                  <div key={key}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{MODEL_LABELS[key] ?? key}</span>
                      <span className="num font-medium">{Math.round(w * 100)}%</span>
                    </div>
                    <div className="h-1 bg-paper rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${w * 100}%`, background: MODEL_COLORS[key] ?? "#a39e92" }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted mt-1">
                      <span>{MODEL_FAMILIES[key] ?? "Unknown"} · {station.model_predictions[key]} mm</span>
                      <span>MAE <span className={`num ${maeTone(station.recent_mae_48h[key])}`}>{station.recent_mae_48h[key]}</span></span>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          <section>
            <div className="label mb-2">Blend vs simple average</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-paper p-3">
                <div className="text-[11px] text-muted">Simple average</div>
                <div className="num text-lg text-muted">{station.simple_average}<span className="text-xs"> mm</span></div>
              </div>
              <div className="rounded-md bg-blend/10 p-3">
                <div className="text-[11px] text-blend">AtmosFusion blend</div>
                <div className="num text-lg text-blend font-medium">{station.consensus_blend}<span className="text-xs"> mm</span></div>
              </div>
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Flat averaging smooths out extremes. Weighting by recent skill keeps the signal from the models that have been right here lately.
            </p>
          </section>

          {station.shap_explanation && (
            <section>
              <div className="label mb-1">Why these weights</div>
              <p className="text-sm leading-relaxed">{station.shap_explanation}</p>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
