// Mirrors backend/models.py

export const API = "http://localhost:8000/api/v1";

export interface WeatherStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevation_m: number;
  terrain_type: string;
  reach_km: number; // representative radius from WMO raingauge density class
  observed_rain_24h: number;
  model_predictions: Record<string, number>;
  assigned_weights: Record<string, number>;
  recent_mae_48h: Record<string, number>;
  consensus_blend: number;
  simple_average: number;
  worst_case_90th: number;
  p_heavy_rain: number; // P(rain >= 64.5 mm)
  p_very_heavy: number;
  p_extremely_heavy: number;
  active_alert: string | null;
  dominant_model: string;
  dominant_family: string; // "Physics" | "Ensemble" | "AI"
  shap_explanation: string;
  disagreement_index: number; // max - min across models (mm)
  coverage_radius_km?: number; // equivalent-circle radius of the clipped Voronoi cell
  coverage_area_km2?: number;
}

export interface RegionForecast {
  region_name: string;
  regime: string;
  regime_confidence: number;
  season: string;
  lead_day: number;
  stations: WeatherStation[];
}

export interface QuantilePoint {
  lead_day: number;
  p10: number;
  p50: number;
  p90: number;
  simple_avg: number;
}

export interface VerificationRow {
  model_name: string;
  model_type: string;
  day1_rmse: number;
  day3_rmse: number;
  heavy_rain_ets: number;
  extreme_rain_csi: number;
  crps_score: number;
}

export type LayerMode = "consensus" | "trust" | "disagreement" | "risk" | "coverage";

export const MODEL_LABELS: Record<string, string> = {
  gfs: "GFS / BharatFS",
  ncum: "NCUM",
  wrf: "WRF (3km)",
  ecmwf: "ECMWF IFS HRES",
  graphcast: "Google GraphCast",
  aifs: "ECMWF AIFS",
};

export const MODEL_FAMILIES: Record<string, string> = {
  gfs: "Physics NWP",
  ncum: "Physics NWP",
  wrf: "Physics NWP",
  ecmwf: "Physics NWP",
  graphcast: "AI / ML",
  aifs: "AI / ML",
};

// Every colour is a token in src/tokens.css; these are references to it.
// Inline styles and SVG take var() as is; MapLibre needs the value, so use cssColor().
const v = (name: string) => `var(--${name})`;

/** The CSS variables that give an element a layer's signature colour (with the tone-layer class). */
export const hueVars = ([h, c]: [number, number]) => ({ "--h": h, "--c": c }) as React.CSSProperties;

export function cssColor(c: string) {
  const m = /^var\((--[\w-]+)\)$/.exec(c);
  return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || c : c;
}

export const MODEL_COLORS: Record<string, string> = {
  gfs: v("model-gfs"),
  ncum: v("model-ncum"),
  wrf: v("model-wrf"),
  ecmwf: v("model-ecmwf"),
  graphcast: v("model-graphcast"),
  aifs: v("model-aifs"),
};

export const FAMILY_COLORS: Record<string, string> = {
  Physics: v("family-physics"),
  AI: v("family-ai"),
  Ensemble: v("family-ensemble"),
};

type Legend = { color: string; label: string }[];

// IMD 24h rainfall categories
const RAIN: [number, string, string][] = [
  [204.5, v("rain-6"), "Extremely heavy ≥204.5"],
  [115.6, v("rain-5"), "Very heavy ≥115.6"],
  [64.5, v("rain-4"), "Heavy ≥64.5"],
  [35.5, v("rain-3"), "Mod. heavy ≥35.5"],
  [7.5, v("rain-2"), "Moderate ≥7.5"],
  [0, v("rain-1"), "Light"],
];
const rain = (mm: number) => RAIN.find(([t]) => mm >= t)![1];
const HIGH = v("level-high"), MID = v("level-mid"), LOW = v("level-low");
const tri = (x: number, hi: number, mid: number) => (x >= hi ? HIGH : x >= mid ? MID : LOW);

// hue: each layer's signature colour as [oklch hue, chroma], used on its button, legend heading and ranking.
export const LAYERS: Record<LayerMode, { label: string; caption: string; hue: [number, number]; color: (s: WeatherStation) => string; legend: Legend }> = {
  consensus: {
    label: "Consensus",
    hue: [255, 0.16],
    caption: "Blended 24h rainfall at each gauge, coloured by IMD category.",
    color: (s) => rain(s.consensus_blend),
    legend: RAIN.map(([, color, label]) => ({ color, label })),
  },
  trust: {
    label: "Trust",
    hue: [190, 0.1],
    caption: "Which model family carries the most weight at each gauge.",
    color: (s) => FAMILY_COLORS[s.dominant_family] ?? FAMILY_COLORS.Ensemble,
    legend: Object.entries(FAMILY_COLORS).map(([label, color]) => ({ color, label })),
  },
  disagreement: {
    label: "Disagreement",
    hue: [65, 0.14],
    caption: "Spread between models. Wider spread means less certain forecast.",
    color: (s) => tri(s.disagreement_index, 100, 25),
    legend: [{ color: HIGH, label: "≥100 mm" }, { color: MID, label: "25 to 100 mm" }, { color: LOW, label: "<25 mm" }],
  },
  risk: {
    label: "Risk",
    hue: [27, 0.18],
    caption: "Plausible upper bound of the blend, for extreme-event preparedness.",
    color: (s) => tri(s.worst_case_90th, 115.6, 64.5),
    legend: [{ color: HIGH, label: "≥115.6 mm" }, { color: MID, label: "64.5 to 115.6 mm" }, { color: LOW, label: "<64.5 mm" }],
  },
  coverage: {
    label: "Coverage",
    hue: [152, 0.13],
    caption: "Area each gauge represents: its Voronoi cell, clipped to the WMO reach for its terrain (8.9 km in the Ghats, 13.5 km elsewhere).",
    // Bigger cell = each gauge stands for more ground = sparser network there.
    color: (s) => tri(s.coverage_radius_km ?? 0, 11, 8.5),
    legend: [{ color: HIGH, label: "≥11 km radius, sparse" }, { color: MID, label: "8.5 to 11 km radius" }, { color: LOW, label: "<8.5 km radius, dense" }],
  },
};
