// Mirrors backend/models.py

export const API = "http://localhost:8000/api/v1";

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
  coverage_radius_km?: number; // equivalent-circle radius of the clipped Voronoi cell
  coverage_area_km2?: number;
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

export const MODEL_COLORS: Record<string, string> = {
  gfs: "#5B8BD9",
  ncum: "#8DB1E8",
  wrf: "#93B1DD",
  ecmwf: "#3F6FC4",
  graphcast: "#2E9C88",
  aifs: "#6CC2AF",
};

export const FAMILY_COLORS: Record<string, string> = {
  Physics: "#3B7DC4",
  AI: "#2E9C88",
  Ensemble: "#8E5BB5",
};

type Legend = { color: string; label: string }[];

// IMD 24h rainfall categories
const RAIN: [number, string, string][] = [
  [204.5, "#C62D3A", "Extremely heavy ≥204.5"],
  [115.6, "#E8702A", "Very heavy ≥115.6"],
  [64.5, "#E5B21F", "Heavy ≥64.5"],
  [35.5, "#2F6FC0", "Mod. heavy ≥35.5"],
  [7.5, "#4F9FDB", "Moderate ≥7.5"],
  [0, "#8CC8E8", "Light"],
];
const rain = (mm: number) => RAIN.find(([t]) => mm >= t)![1];
const tri = (v: number, hi: number, mid: number) => (v >= hi ? "#D9453A" : v >= mid ? "#C98A12" : "#4E9A5E");

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
    legend: [{ color: "#D9453A", label: "≥100 mm" }, { color: "#C98A12", label: "25–100 mm" }, { color: "#4E9A5E", label: "<25 mm" }],
  },
  risk: {
    label: "Risk",
    caption: "Plausible upper bound of the blend, for extreme-event preparedness.",
    color: (s) => tri(s.worst_case_90th, 115.6, 64.5),
    legend: [{ color: "#D9453A", label: "≥115.6 mm" }, { color: "#C98A12", label: "64.5–115.6 mm" }, { color: "#4E9A5E", label: "<64.5 mm" }],
  },
  coverage: {
    label: "Coverage",
    caption: "Area each gauge represents (Voronoi cell, capped at 20 km reach). Large cells mark network gaps.",
    // Bigger cell = each gauge stands for more ground = sparser network there.
    color: (s) => tri(s.coverage_radius_km ?? 0, 16, 10),
    legend: [{ color: "#D9453A", label: "≥16 km radius · sparse" }, { color: "#C98A12", label: "10–16 km radius" }, { color: "#4E9A5E", label: "<10 km radius · dense" }],
  },
};
