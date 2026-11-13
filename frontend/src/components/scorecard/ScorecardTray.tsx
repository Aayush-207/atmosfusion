import { ChevronUp, Trophy } from "lucide-react";
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
    <div className="flex-shrink-0 border-t border-line bg-surface">
      <button onClick={toggleScorecard} className="group w-full px-5 py-2.5 flex items-center justify-between text-xs hover:bg-paper transition-colors">
        <span className="flex items-center gap-2.5">
          <Trophy size={14} className="text-accent" />
          <span className="label !text-ink">Verification scorecard</span>
          <span className="text-muted">2022 held-out benchmark</span>
        </span>
        <span className="flex items-center gap-1.5 text-muted group-hover:text-ink">
          {scorecardOpen ? "Hide" : "Show"}
          <ChevronUp size={14} className={`transition-transform duration-300 ${scorecardOpen ? "" : "rotate-180"}`} />
        </span>
      </button>
      {/* grid-rows 0fr→1fr gives a height transition without measuring */}
      <div className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.2,.7,.2,1)] ${scorecardOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-5 pb-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-muted">
                  <th className="text-left font-medium py-2 label">System</th>
                  <th className="text-left font-medium label">Type</th>
                  {COLS.map(([h]) => <th key={h} className="text-right font-medium label">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {scorecard.map((r, i) => {
                  const ours = r.model_name === "AtmosFusion Blend";
                  return (
                    <tr
                      key={r.model_name}
                      className={`border-t transition-colors ${ours ? "bg-blend/15 text-blend font-semibold" : "hover:bg-paper"} ${scorecardOpen ? "animate-rise" : ""}`}
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <td className="py-2 pl-2">{ours && <span className="text-accent mr-1.5">◆</span>}{r.model_name}</td>
                      <td className={ours ? "text-blend/70" : "text-muted"}>{r.model_type}</td>
                      {COLS.map(([h, f]) => <td key={h} className="text-right num pr-2">{f(r)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[11px] text-faint mt-3">Lower RMSE and CRPS are better; higher ETS and CSI are better.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
