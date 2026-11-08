import { create } from "zustand";
import type { WeatherStation, RegionForecast, VerificationRow, LayerMode } from "@/types/weather";

interface WeatherState {
  forecast: RegionForecast | null;
  scorecard: VerificationRow[];
  selectedStationId: string | null;
  selectedStation: WeatherStation | null;
  layerMode: LayerMode;
  leadDay: number;
  scorecardOpen: boolean;
  setForecast: (f: RegionForecast) => void;
  setScorecard: (s: VerificationRow[]) => void;
  selectStation: (id: string) => void;
  setLayerMode: (m: LayerMode) => void;
  toggleScorecard: () => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  forecast: null,
  scorecard: [],
  selectedStationId: null,
  selectedStation: null,
  layerMode: "consensus",
  leadDay: 1,
  scorecardOpen: false,

  setForecast: (f) =>
    set((state) => ({
      forecast: f,
      selectedStation: f.stations.find((s) => s.id === state.selectedStationId) ?? f.stations[0] ?? null,
    })),
  setScorecard: (s) => set({ scorecard: s }),
  selectStation: (id) =>
    set((state) => {
      const found = state.forecast?.stations.find((s) => s.id === id);
      return found ? { selectedStationId: id, selectedStation: found } : {};
    }),
  setLayerMode: (m) => set({ layerMode: m }),
  toggleScorecard: () => set((s) => ({ scorecardOpen: !s.scorecardOpen })),
}));
