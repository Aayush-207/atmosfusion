import { ChevronUp } from "lucide-react";
import { useWeatherStore } from "@/store/useWeatherStore";
import type { VerificationRow } from "@/types/weather";

// [header, value, format, lower is better]
const COLS: [string, (r: VerificationRow) => number, (v: number) => string, boolean][] = [
  ["Day-1 RMSE", (r) => r.day1_rmse, String, true],
  ["Day-3 RMSE", (r) => r.day3_rmse, String, true],
  ["Heavy ETS", (r) => r.heavy_rain_ets, (v) => v.toFixed(2), false],
  ["Extreme CSI", (r) => r.extreme_rain_csi, (v) => v.toFixed(2), false],
  ["CRPS", (r) => r.crps_score, String, true],
];

const OURS = "AtmosFusion Blend";

export default function ScorecardTray() {
  const { scorecard, scorecardOpen, toggleScorecard } = useWeatherStore();
  const best = COLS.map(([, get, , low]) => {
    const vals = scorecard.map(get);
    return vals.length ? (low ? Math.min(...vals) : Math.max(...vals)) : NaN;
  });

  return (
    <div className="card tone-crimson shadow-float">
      <button
        type="button"
        onClick={toggleScorecard}
        aria-expanded={scorecardOpen}
        aria-controls="scorecard"
        className="group w-full px-4 py-2.5 flex items-center justify-between gap-4 bg-paper hover:bg-paper2 transition-colors duration-micro"
      >
        <span className="flex items-baseline gap-3 min-w-0 whitespace-nowrap">
          <span className="font-display text-[15px] font-semibold text-heading whitespace-nowrap">Verification scorecard</span>
          <span className="text-[12px] font-medium text-label truncate hidden sm:inline">2022 held-out benchmark</span>
        </span>
        <span className="flex items-center gap-1.5 text-[13px] text-muted group-hover:text-ink">
          {scorecardOpen ? "Hide" : "Show"}
          <ChevronUp size={15} aria-hidden className={`transition-transform duration-short ease-out ${scorecardOpen ? "" : "rotate-180"}`} />
        </span>
      </button>
      {/* grid-rows 0fr to 1fr gives a height transition without measuring (the documented exception for disclosure) */}
      <div id="scorecard" className={`grid transition-[grid-template-rows] duration-short ease-out ${scorecardOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="pb-3 overflow-x-auto">
            <table className="rtable inset">
              <thead>
                <tr>
                  <th scope="col">System</th>
                  <th scope="col">Type</th>
                  {COLS.map(([h, , , low]) => (
                    <th key={h} scope="col" style={{ textAlign: "right" }}>
                      {h} <span className="sr-only">{low ? "(lower is better)" : "(higher is better)"}</span><span aria-hidden>{low ? "↓" : "↑"}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scorecard.map((r) => {
                  const ours = r.model_name === OURS;
                  return (
                    <tr key={r.model_name} className={ours ? "bg-paper2" : "hover:bg-paper2 transition-colors duration-micro"}>
                      <th scope="row" className={ours ? "c-forecast font-semibold" : "font-medium text-heading"}>
                        {r.model_name}
                      </th>
                      <td className={ours ? "c-forecast font-medium" : "text-label"}>{r.model_type}</td>
                      {COLS.map(([h, get, fmt], i) => {
                        const v = get(r);
                        const isBest = v === best[i];
                        return (
                          <td key={h} className={`text-right num ${isBest ? "text-success font-semibold" : ours ? "text-heading font-semibold" : "text-ink2"}`}>
                            {fmt(v)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[12px] text-label mt-2.5 px-4">
              The best score in each column is in <span className="text-success font-semibold">green</span>. Arrows show the better direction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
