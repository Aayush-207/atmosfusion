/**
 * AtmosFusion — Left Drawer: Model Referee & Dynamic Weight Engine
 */

import { useState } from "react";
import { useWeatherStore } from "@/store/useWeatherStore";
import { MODEL_LABELS, MODEL_FAMILIES } from "@/types/weather";
import {
  Scale,
  Brain,
  AlertTriangle,
  TrendingDown,
  Cpu,
  ChevronDown,
  MapPin,
  Info,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

/* --- Location dropdown data --- */
const LOCATIONS = [
  { id: "pune",        label: "Pune Metropolitan",          region: "Maharashtra" },
];

function LocationDropdown() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(LOCATIONS[0]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-left w-full"
      >
        <div>
          <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            {selected.label}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
          <div className="text-[10px] text-slate-500">{selected.region}</div>
        </div>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 w-60 panel p-1 z-50"
          style={{ animation: "af-fadein 0.15s ease both" }}
        >
          {LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={() => { setSelected(loc); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                selected.id === loc.id
                  ? "bg-monsoon-cyan/10 text-monsoon-cyan"
                  : "text-slate-400 hover:bg-frosted-slate hover:text-slate-100"
              }`}
            >
              <div className="font-semibold">{loc.label}</div>
              <div className="text-[10px] text-slate-500">{loc.region}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Model weight bar colors --- */
const WEIGHT_COLORS: Record<string, string> = {
  gfs: "#3A86FF",
  ncum: "#5E60CE",
  wrf: "#7400B8",
  ecmwf: "#3A86FF",
  graphcast: "#06D6A0",
  aifs: "#22B573",
};

/* --- Family badge component --- */
function FamilyBadge({ family }: { family: string }) {
  const cls =
    family === "Physics NWP"
      ? "badge-physics"
      : family === "AI / ML"
      ? "badge-ai"
      : "badge-ensemble";
  return <span className={cls}>{family}</span>;
}

/* --- Individual Model Card --- */
function ModelCard({
  modelKey,
  prediction,
  mae,
  weight,
  delay,
}: {
  modelKey: string;
  prediction: number;
  mae: number;
  weight: number;
  delay: number;
}) {
  const label = MODEL_LABELS[modelKey] || modelKey;
  const family = MODEL_FAMILIES[modelKey] || "Unknown";
  const color = WEIGHT_COLORS[modelKey] || "#888";
  const pct = (weight * 100).toFixed(0);

  return (
    <div
      className="panel p-2 space-y-1.5"
      style={{ animation: `af-fadein 0.4s ease ${delay}ms both` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}80` }}
          />
          <span className="text-[11px] font-semibold text-slate-200">{label}</span>
        </div>
        <FamilyBadge family={family} />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="metric-label">24h Forecast</div>
          <div className="metric-value text-base">{prediction} mm</div>
        </div>
        <div className="text-right">
          <div className="metric-label">48h MAE</div>
          <div
            className={`font-mono text-xs ${
              mae <= 8
                ? "text-neural-emerald"
                : mae <= 15
                ? "text-amber-alert"
                : "text-crimson-hazard"
            }`}
          >
            {mae} mm
          </div>
        </div>
        <div className="text-right">
          <div className="metric-label">Weight</div>
          <div className="font-mono text-sm font-bold text-monsoon-cyan">{pct}%</div>
        </div>
      </div>

      {/* Animated weight bar */}
      <div className="w-full h-1 bg-frosted-slate rounded-full overflow-hidden">
        <div
          className="h-full rounded-full weight-bar-fill"
          style={{
            width: `${weight * 100}%`,
            backgroundColor: color,
            animationDelay: `${delay + 200}ms`,
          }}
        />
      </div>
    </div>
  );
}

/* --- Educational Card --- */
function AveragingComparisonCard() {
  const station = useWeatherStore((s) => s.selectedStation);
  if (!station) return null;

  const diff = station.consensus_blend - station.simple_average;
  const absDiff = Math.abs(diff);
  const isHigher = diff > 0;

  return (
    <div
      className="panel border-amber-alert/30 bg-amber-alert/5"
      style={{ animation: "af-fadein 0.6s ease 0.4s both" }}
    >
      <div className="px-3 py-2 border-b border-amber-alert/20 flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-alert" />
        <span className="text-[10px] uppercase tracking-widest text-amber-alert font-bold">
          How Averaging Erases Extremes
        </span>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(station.model_predictions).map(([key, val]) => (
            <div
              key={key}
              className="bg-frosted-slate/50 rounded-sm px-2 py-1.5 text-center border border-slate-border"
            >
              <div className="text-[9px] uppercase text-slate-500">{key.toUpperCase()}</div>
              <div className="font-mono text-xs text-slate-200">{val} mm</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-midnight-slate/50 rounded-sm border border-slate-border">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] text-slate-400">Simple Average</span>
            </div>
            <span className="font-mono text-sm text-slate-500 line-through">
              {station.simple_average} mm
            </span>
          </div>

          <div className="flex items-center justify-between p-2 bg-monsoon-cyan/5 rounded-sm border border-monsoon-cyan/20">
            <div className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-monsoon-cyan" />
              <span className="text-[11px] text-monsoon-cyan font-semibold">
                AtmosFusion Blend
              </span>
            </div>
            <span className="font-mono text-sm text-monsoon-cyan font-bold">
              {station.consensus_blend} mm
            </span>
          </div>

          {absDiff > 2 && (
            <div className="text-[10px] text-amber-alert/80 leading-snug px-1">
              ⚡ Dynamic weighting {isHigher ? "preserves" : "corrects"} the forecast by{" "}
              <span className="font-mono font-bold">
                {isHigher ? "+" : "−"}{absDiff.toFixed(1)} mm
              </span>{" "}
              versus flat averaging.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* --- Main Drawer --- */
export default function WeightEngineDrawer() {
  const station = useWeatherStore((s) => s.selectedStation);

  if (!station) {
    return (
      <div className="w-[340px] flex-shrink-0 bg-midnight-slate/50 border-r border-slate-border flex items-center justify-center drawer-left">
        <div className="text-center text-slate-600 text-xs space-y-2">
          <Scale className="w-8 h-8 mx-auto text-slate-300" />
          <div>Select a station on the map</div>
        </div>
      </div>
    );
  }

  const sortedModels = Object.entries(station.assigned_weights).sort(
    ([, a], [, b]) => b - a
  );

  const radarData = sortedModels.map(([key, weight]) => ({
    model: MODEL_LABELS[key as keyof typeof MODEL_LABELS] || key.toUpperCase(),
    weight: Math.round(weight * 100),
  }));

  return (
    <div className="w-[340px] flex-shrink-0 bg-midnight-slate/50 border-r border-slate-border flex flex-col overflow-hidden drawer-left">
      {/* --- Location Header (replaces station name) --- */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-slate-border bg-frosted-slate/50">
        <div className="flex items-center gap-2 mb-1.5">
          <MapPin className="w-4 h-4 text-monsoon-cyan flex-shrink-0" />
          <LocationDropdown />
        </div>
        {/* Active station sub-info */}
        <div className="flex items-center gap-2 ml-6">
          <div
            className="w-1.5 h-1.5 rounded-full bg-monsoon-cyan animate-pulse"
          />
          <span className="text-[10px] text-slate-500">
            Active: <span className="text-slate-300 font-medium">{station.name}</span>
            {" · "}{station.terrain_type}
          </span>
        </div>
      </div>

      {/* --- Panel Header --- */}
      <div className="panel-header flex-shrink-0">
        <Scale className="w-3.5 h-3.5 text-monsoon-cyan" />
        Dynamic Weight Engine
      </div>

      {/* --- Scrollable Content --- */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">

        {/* Radar Chart */}
        <div className="panel p-3 card-anim">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-monsoon-cyan" />
            Model Influence Vector
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#3f3f46" />
                <PolarAngleAxis
                  dataKey="model"
                  tick={{ fill: "#a1a1aa", fontSize: 9 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 40]} tick={false} axisLine={false} />
                <Radar
                  name="Weight %"
                  dataKey="weight"
                  stroke="#3b82f6"
                  fill="#60a5fa"
                  fillOpacity={0.4}
                />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", fontSize: "12px" }}
                  itemStyle={{ color: "#60a5fa" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Cards */}
        {sortedModels.map(([key, weight], i) => (
          <ModelCard
            key={key}
            modelKey={key}
            prediction={station.model_predictions[key]}
            mae={station.recent_mae_48h[key]}
            weight={weight}
            delay={i * 60}
          />
        ))}

        {/* Weight Distribution Bar */}
        <div className="panel p-3 card-anim">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
            <Cpu className="w-3 h-3" />
            Weight Distribution
          </div>
          <div className="flex h-4 rounded-sm overflow-hidden">
            {sortedModels.map(([key, weight]) => (
              <div
                key={key}
                className="h-full relative group transition-all duration-300 hover:opacity-80"
                style={{
                  width: `${weight * 100}%`,
                  backgroundColor: WEIGHT_COLORS[key] || "#888",
                }}
                title={`${MODEL_LABELS[key] || key}: ${(weight * 100).toFixed(0)}%`}
              >
                {weight >= 0.1 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-white/90">
                    {(weight * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {sortedModels.map(([key]) => (
              <div key={key} className="flex items-center gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: WEIGHT_COLORS[key] || "#888" }}
                />
                <span className="text-[9px] text-slate-500">{key.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Averaging Comparison */}
        <AveragingComparisonCard />

        {/* SHAP Explanation */}
        <div
          className="panel p-3"
          style={{ animation: "af-fadein 0.5s ease 0.5s both" }}
        >
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
            <Info className="w-3 h-3 text-quantum-violet" />
            SHAP Attribution
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {station.shap_explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
