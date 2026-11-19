import { create } from "zustand";
import { area, circle, featureCollection, intersect, point, voronoi } from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { WeatherStation, RegionForecast, VerificationRow, LayerMode } from "@/types/weather";

// Each Voronoi cell is clipped to its gauge's own reach (backend: WMO density class),
// so edge gauges don't claim the whole bounding box.
// ponytail: circles approximate reach; clip to the district boundary polygon once one is available
export type Cell = Feature<Polygon | MultiPolygon>;

function withCoverage(stations: WeatherStation[]) {
  const cells: Record<string, Cell> = {};
  if (stations.length < 3) return { stations, cells };
  const points = featureCollection(stations.map((s) => point([s.lng, s.lat])));
  // Bounding box of the gauges, padded by twice the largest reach (km to degrees at this latitude)
  const pad = Math.max(...stations.map((s) => s.reach_km)) * 2;
  const lats = stations.map((s) => s.lat), lngs = stations.map((s) => s.lng);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const dLat = pad / 110.57, dLng = pad / (111.32 * Math.cos((midLat * Math.PI) / 180));
  const bbox: [number, number, number, number] = [Math.min(...lngs) - dLng, Math.min(...lats) - dLat, Math.max(...lngs) + dLng, Math.max(...lats) + dLat];
  const tiles = voronoi(points, { bbox }).features; // same order as input points
  const out = stations.map((s, i) => {
    const reach = circle([s.lng, s.lat], s.reach_km, { units: "kilometers", steps: 96 });
    const cell = tiles[i] && intersect(featureCollection([tiles[i], reach]));
    if (!cell) return s;
    cells[s.id] = cell;
    const km2 = area(cell) / 1e6;
    return { ...s, coverage_area_km2: Math.round(km2), coverage_radius_km: +Math.sqrt(km2 / Math.PI).toFixed(1) };
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
