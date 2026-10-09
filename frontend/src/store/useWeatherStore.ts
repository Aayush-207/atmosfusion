import { create } from "zustand";
import type {
  WeatherStation,
  RegionForecast,
  VerificationRow,
  QuantileCurvePoint,
  LayerMode,
} from "@/types/weather";

interface WeatherState {
  // Data
  forecast: RegionForecast | null;
  scorecard: VerificationRow[];
  quantileCurve: QuantileCurvePoint[];

  // Controls
  selectedStationId: string | null;
  layerMode: LayerMode;
  leadDay: number;
  scenarioPreset: string;
  scorecardOpen: boolean;

  // Derived
  selectedStation: WeatherStation | null;

  // Actions
  setForecast: (f: RegionForecast) => void;
  setScorecard: (s: VerificationRow[]) => void;
  setQuantileCurve: (q: QuantileCurvePoint[]) => void;
  selectStation: (id: string) => void;
  setLayerMode: (m: LayerMode) => void;
  setLeadDay: (d: number) => void;
  setScenarioPreset: (p: string) => void;
  toggleScorecard: () => void;
}

export const useWeatherStore = create<WeatherState>((set, get) => ({
  forecast: null,
  scorecard: [],
  quantileCurve: [],

  selectedStationId: null,
  layerMode: "consensus",
  leadDay: 1,
  scenarioPreset: "pune-monsoon",
  scorecardOpen: false,

  selectedStation: null,

  setForecast: (f) =>
    set((state) => ({
      forecast: f,
      selectedStation:
        f.stations.find((s) => s.id === state.selectedStationId) ??
        f.stations[0] ?? null,
    })),

  setScorecard: (s) => set({ scorecard: s }),
  setQuantileCurve: (q) => set({ quantileCurve: q }),

  selectStation: (id) =>
    set((state) => {
      const found = state.forecast?.stations.find((s) => s.id === id);
      if (found) {
        return {
          selectedStationId: id,
          selectedStation: found,
        };
      }
      return {}; // Keep previous station if not found
    }),

  setLayerMode: (m) => set({ layerMode: m }),
  setLeadDay: (d) => set({ leadDay: d }),
  setScenarioPreset: (p) => set({ scenarioPreset: p }),
  toggleScorecard: () => set((s) => ({ scorecardOpen: !s.scorecardOpen })),
}));
