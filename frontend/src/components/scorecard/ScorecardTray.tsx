import { useWeatherStore } from "@/store/useWeatherStore";
import type { VerificationRow } from "@/types/weather";

const COLS: [string, (r: VerificationRow) => string][] = [
  ["Day-1 RMSE", (r) => String(r.day1_rmse)],
  ["Day-3 RMSE", (r) => String(r.day3_rmse)],
  ["Heavy ETS", (r) => r.heavy_rain_ets.toFixed(2)],
  ["Extreme CSI", (r) => r.extreme_rain_csi.toFixed(2)],
  ["CRPS", (r) => String(r.crps_score)],
];

export default function ScorecardTray() {
  const { scorecard, scorecardOpen, toggleScorecard } = useWeatherStore();

  return (
    <div className="flex-shrink-0 border-t bg-surface">
      <button onClick={toggleScorecard} className="w-full px-5 py-2 flex items-center justify-between text-xs text-muted hover:text-ink">
        <span>Verification scorecard · 2022 held-out</span>
        <span>{scorecardOpen ? "Hide" : "Show"}</span>
      </button>
      {scorecardOpen && (
        <div className="px-5 pb-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted">
                <th className="text-left font-medium py-1.5">System</th>
                <th className="text-left font-medium">Type</th>
                {COLS.map(([h]) => <th key={h} className="text-right font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {scorecard.map((r) => {
                const ours = r.model_name === "AtmosFusion Blend";
                return (
                  <tr key={r.model_name} className={`border-t ${ours ? "text-blend font-semibold" : ""}`}>
                    <td className="py-1.5">{r.model_name}</td>
                    <td className={ours ? "" : "text-muted"}>{r.model_type}</td>
                    {COLS.map(([h, f]) => <td key={h} className="text-right num">{f(r)}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-faint mt-3">Lower RMSE and CRPS are better; higher ETS and CSI are better.</p>
        </div>
      )}
    </div>
  );
}
