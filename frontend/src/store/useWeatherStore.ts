import { create } from "zustand";
import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { WeatherStation, RegionForecast, VerificationRow, LayerMode } from "@/types/weather";

// Max distance a single gauge is trusted to represent. Voronoi cells are clipped to it,
// so edge gauges don't claim the whole bounding box.
// ponytail: fixed 20 km reach; clip to the district boundary polygon instead once one is available
const REACH_KM = 20;
export type Cell = Feature<Polygon | MultiPolygon>;

function withCoverage(stations: WeatherStation[]) {
  const cells: Record<string, Cell> = {};
  if (stations.length < 3) return { stations, cells };
  const points = turf.featureCollection(stations.map((s) => turf.point([s.lng, s.lat])));
  const bbox = turf.bbox(turf.buffer(points, REACH_KM * 2, { units: "kilometers" })!);
  const voronoi = turf.voronoi(points, { bbox }).features; // same order as input points
  const out = stations.map((s, i) => {
    const reach = turf.circle([s.lng, s.lat], REACH_KM, { units: "kilometers", steps: 96 });
    const cell = voronoi[i] && turf.intersect(turf.featureCollection([voronoi[i], reach]));
    if (!cell) return s;
    cells[s.id] = cell;
    const area = turf.area(cell) / 1e6;
    return { ...s, coverage_area_km2: Math.round(area), coverage_radius_km: +Math.sqrt(area / Math.PI).toFixed(1) };
  });
  return { stations: out, cells };
}

interface WeatherState {
  forecast: RegionForecast | null;
  cells: Record<string, Cell>;
  scorecard: VerificationRow[];
  selectedStationId: string | null;
  selectedStation: WeatherStation | null;
  layerMode: LayerMode;
  scorecardOpen: boolean;
  setForecast: (f: RegionForecast) => void;
  setScorecard: (s: VerificationRow[]) => void;
  selectStation: (id: string) => void;
  setLayerMode: (m: LayerMode) => void;
  toggleScorecard: () => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  forecast: null,
  cells: {},
  scorecard: [],
  selectedStationId: null,
  selectedStation: null,
  layerMode: "consensus",
  scorecardOpen: false,

  setForecast: (raw) =>
    set((state) => {
      const { stations, cells } = withCoverage(raw.stations);
      const f = { ...raw, stations };
      return { forecast: f, cells, selectedStation: stations.find((s) => s.id === state.selectedStationId) ?? stations[0] ?? null };
    }),
  setScorecard: (s) => set({ scorecard: s }),
  selectStation: (id) =>
    set((state) => {
      const found = state.forecast?.stations.find((s) => s.id === id);
      return found ? { selectedStationId: id, selectedStation: found } : {};
    }),
  setLayerMode: (m) => set({ layerMode: m }),
  toggleScorecard: () => set((s) => ({ scorecardOpen: !s.scorecardOpen })),
}));
