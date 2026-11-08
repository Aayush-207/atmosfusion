// Mirrors backend/models.py

export interface WeatherStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevation_m: number;
  terrain_type: string;
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
  coverage_radius_km?: number; // computed client-side from Voronoi cells
}

export interface RegionForecast {
  region_id: string;
  region_name: string;
  regime: string;
  regime_confidence: number;
  season: string;
  lead_day: number;
  stations: WeatherStation[];
  grid_summary: Record<string, number>;
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

export const MODEL_COLORS: Record<string, string> = {
  gfs: "#3d5a80",
  ncum: "#5b7fa6",
  wrf: "#8aa4c2",
  ecmwf: "#24476b",
  graphcast: "#2a9d8f",
  aifs: "#7cc0b5",
};

export const FAMILY_COLORS: Record<string, string> = {
  Physics: "#3d5a80",
  AI: "#2a9d8f",
  Ensemble: "#8a5a9b",
};

type Legend = { color: string; label: string }[];

// IMD 24h rainfall categories
const RAIN: [number, string, string][] = [
  [204.5, "#9f1d1d", "Extremely heavy ≥204.5"],
  [115.6, "#d1601c", "Very heavy ≥115.6"],
  [64.5, "#08306b", "Heavy ≥64.5"],
  [35.5, "#2171b5", "Mod. heavy ≥35.5"],
  [7.5, "#6baed6", "Moderate ≥7.5"],
  [0, "#a9cce3", "Light"],
];
const rain = (mm: number) => RAIN.find(([t]) => mm >= t)![1];
const tri = (v: number, hi: number, mid: number) => (v >= hi ? "#c2410c" : v >= mid ? "#b7791f" : "#3f7d4e");

export const LAYERS: Record<LayerMode, { label: string; caption: string; color: (s: WeatherStation) => string; legend: Legend }> = {
  consensus: {
    label: "Consensus",
    caption: "Blended 24h rainfall at each gauge, coloured by IMD category.",
    color: (s) => rain(s.consensus_blend),
    legend: RAIN.map(([, color, label]) => ({ color, label })),
  },
  trust: {
    label: "Trust",
    caption: "Which model family carries the most weight at each gauge.",
    color: (s) => FAMILY_COLORS[s.dominant_family] ?? FAMILY_COLORS.Ensemble,
    legend: Object.entries(FAMILY_COLORS).map(([label, color]) => ({ color, label })),
  },
  disagreement: {
    label: "Disagreement",
    caption: "Spread between models. Wider spread means less certain forecast.",
    color: (s) => tri(s.disagreement_index, 100, 25),
    legend: [{ color: "#c2410c", label: "≥100 mm" }, { color: "#b7791f", label: "25–100 mm" }, { color: "#3f7d4e", label: "<25 mm" }],
  },
  risk: {
    label: "Risk",
    caption: "Plausible upper bound of the blend, for extreme-event preparedness.",
    color: (s) => tri(s.worst_case_90th, 115.6, 64.5),
    legend: [{ color: "#c2410c", label: "≥115.6 mm" }, { color: "#b7791f", label: "64.5–115.6 mm" }, { color: "#3f7d4e", label: "<64.5 mm" }],
  },
  coverage: {
    label: "Coverage",
    caption: "Voronoi area each gauge represents. Large cells mark network gaps.",
    color: () => "#8a5a9b",
    legend: [{ color: "#8a5a9b", label: "Gauge influence area" }],
  },
};
