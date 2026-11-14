import { useEffect, useState, useMemo, useRef } from "react";
import { Info, TriangleAlert } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useWeatherStore } from "@/store/useWeatherStore";
import { LAYERS, cssColor, type WeatherStation, type LayerMode } from "@/types/weather";

const CENTER = { lat: 18.5204, lng: 73.8567 };

const esri = (svc: string) => `https://server.arcgisonline.com/ArcGIS/rest/services/${svc}/MapServer/tile/{z}/{y}/{x}`;
const raster = (id: string, url: string) => ({ id, source: { type: "raster" as const, tiles: [url], tileSize: 256, maxzoom: 19 } });
const SAT = [raster("sat", esri("World_Imagery")), raster("roads", esri("Reference/World_Transportation")), raster("places", esri("Reference/World_Boundaries_and_Places"))];

// OpenFreeMap vector style (no key) renders smoothly at every zoom; satellite stays raster.
const BASEMAPS: Record<string, { label: string; style: string | maplibregl.StyleSpecification }> = {
  map: { label: "Map", style: "https://tiles.openfreemap.org/styles/liberty" },
  satellite: {
    label: "Satellite",
    style: {
      version: 8,
      sources: Object.fromEntries(SAT.map((l) => [l.id, l.source])),
      layers: SAT.map((l) => ({ id: l.id, type: "raster" as const, source: l.id })),
    },
  },
};

// Label goes left when another gauge sits just east, so neighbouring labels don't overlap.
// ponytail: fixed lat/lng window, tuned for zoom ~11; real collision detection if gauges get dense
function labelSide(s: WeatherStation, all: WeatherStation[]) {
  return all.some((o) => o !== s && o.lng > s.lng && o.lng - s.lng < 0.15 && Math.abs(o.lat - s.lat) < 0.05) ? "left" : "right";
}

function pinHtml(s: WeatherStation, color: string, selected: boolean, side: "left" | "right") {
  const alert = !!s.active_alert;
  const r = selected ? 9 : 6, size = r * 2 + 10, c = size / 2;
  const ring = selected ? "var(--color-accent)" : alert ? "var(--color-error)" : "transparent";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' aria-hidden='true'><circle cx='${c}' cy='${c}' r='${r + 3}' style='fill:none;stroke:${ring};stroke-width:2'/><circle cx='${c}' cy='${c}' r='${r}' style='fill:${color};stroke:var(--color-paper);stroke-width:2.5'/></svg>`;
  const pulse = alert ? `<span class="absolute inset-0 rounded-full border-2 border-error animate-pulse_ring"></span>` : "";
  const pos = side === "right" ? `left:${size + 4}px` : `right:${size + 4}px;text-align:right`;
  const chip = selected ? "bg-graphite text-gink border-graphite" : "bg-paper text-ink border-rule";
  const sub = selected ? "text-gmuted" : "text-muted";
  return `<div class="relative cursor-pointer transition-transform duration-micro ease-out [@media(hover:hover)]:hover:scale-[1.06]" style="width:${size}px;height:${size}px">${pulse}${svg}
    <div class="absolute top-1/2 -translate-y-1/2 px-2 py-1 rounded-input border whitespace-nowrap leading-tight shadow-card ${chip}" style="${pos}">
      <div class="text-[12px] font-medium">${s.name}</div>
      <div class="text-[11px] ${sub}"><span class="num">${s.consensus_blend} mm</span> in ${s.terrain_type}</div>
    </div></div>`;
}

function StationCard({ station }: { station: WeatherStation }) {
  const rows: [string, string][] = [
    ["Observed 24 h", `${station.observed_rain_24h} mm`],
    ["Blend", `${station.consensus_blend} mm`],
    ["90th percentile", `${station.worst_case_90th} mm`],
    ["Heavy rain chance", `${Math.round(station.p_heavy_rain * 100)}%`],
  ];
  return (
    <div className="cut w-[232px] p-3 text-ink">
      <div className="flex items-baseline justify-between gap-2 pb-2 border-b border-rule">
        <span className="font-display font-semibold text-[15px] truncate">{station.name}</span>
        <span className="text-[12px] text-muted num">{station.elevation_m} m</span>
      </div>
      <dl className="mt-2 space-y-1 text-[13px]">
        {rows.map(([label, v]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted">{label}</dt>
            <dd className="num">{v}</dd>
          </div>
        ))}
      </dl>
      {station.active_alert && (
        <div className="mt-2 pt-2 border-t border-rule flex items-center gap-1.5 text-[12px] font-medium text-error">
          <TriangleAlert size={13} aria-hidden /> Active alert
        </div>
      )}
    </div>
  );
}

function VectorMap({ basemap }: { basemap: string }) {
  const { forecast, cells: all, selectStation, selectedStationId, layerMode } = useWeatherStore();
  const stations = useMemo(() => forecast?.stations ?? [], [forecast]);
  const colorOf = LAYERS[layerMode].color;
  const cells = useMemo(
    () => (layerMode === "coverage" ? stations.flatMap((st) => (all[st.id] ? [{ station: st, feature: all[st.id] }] : [])) : []),
    [layerMode, stations, all],
  );
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const styleKey = useRef(basemap);
  const [styleTick, setStyleTick] = useState(0); // bumps on every style load so overlays get re-added
  const [hover, setHover] = useState<{ s: WeatherStation; x: number; y: number } | null>(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: box.current!,
      style: BASEMAPS[styleKey.current].style,
      center: [CENTER.lng, CENTER.lat],
      zoom: 10,
      attributionControl: { compact: true },
      fadeDuration: 200,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({}), "bottom-right");
    map.on("style.load", () => setStyleTick((t) => t + 1));
    map.on("click", "cells-fill", (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) useWeatherStore.getState().selectStation(id);
    });
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    if (styleKey.current === basemap) return;
    styleKey.current = basemap;
    // diff:false forces a full reload so "style.load" fires and the cell layers get re-added
    mapRef.current?.setStyle(BASEMAPS[basemap].style, { diff: false });
  }, [basemap]);

  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !stations.length || !mapRef.current) return;
    fitted.current = true;
    const b = new maplibregl.LngLatBounds();
    stations.forEach((s) => b.extend([s.lng, s.lat]));
    mapRef.current.fitBounds(b, { padding: { top: 90, bottom: 90, left: 100, right: 220 }, maxZoom: 12, duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1200 });
  }, [stations]);

  // Voronoi cells as a GeoJSON fill layer; colours come from feature properties.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleTick) return;
    // A layer change while a new basemap is still loading would throw and unmount the app; retry once it settles.
    if (!map.isStyleLoaded()) {
      map.once("idle", () => setStyleTick((t) => t + 1));
      return;
    }
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: cells.map(({ station, feature }) => ({ ...feature, properties: { id: station.id, color: cssColor(colorOf(station)), sel: station.id === selectedStationId } })),
    };
    const src = map.getSource("cells") as maplibregl.GeoJSONSource | undefined;
    if (src) return void src.setData(data);
    map.addSource("cells", { type: "geojson", data });
    map.addLayer({ id: "cells-fill", type: "fill", source: "cells", paint: { "fill-color": ["get", "color"], "fill-opacity": ["case", ["get", "sel"], 0.25, 0.1] } });
    map.addLayer({ id: "cells-line", type: "line", source: "cells", paint: { "line-color": ["get", "color"], "line-width": ["case", ["get", "sel"], 2.5, 1.2] } });
  }, [cells, colorOf, selectedStationId, styleTick]);

  // HTML markers sit above the canvas, so they survive style switches untouched.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = stations.map((s) => {
      const sel = s.id === selectedStationId;
      const el = document.createElement("div");
      el.innerHTML = pinHtml(s, colorOf(s), sel, labelSide(s, stations));
      el.style.zIndex = sel ? "2" : "1";
      el.onclick = () => selectStation(s.id);
      el.onmouseenter = () => {
        const p = map.project([s.lng, s.lat]);
        setHover({ s, x: p.x, y: p.y });
      };
      el.onmouseleave = () => setHover(null);
      return new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
    });
    return () => markers.forEach((m) => m.remove());
  }, [stations, selectedStationId, colorOf, selectStation]);

  return (
    <div className="w-full h-full relative">
      <div ref={box} className="w-full h-full" />
      {hover && (
        <div className="absolute z-[5] pointer-events-none animate-pop origin-bottom" style={{ left: hover.x - 115, top: hover.y - 150 }}>
          <StationCard station={hover.s} />
        </div>
      )}
    </div>
  );
}

function LayerBar() {
  const { layerMode, setLayerMode } = useWeatherStore();
  return (
    <div className="absolute top-4 left-4 z-[10] tray shadow-float" role="group" aria-label="Map layer">
      {(Object.keys(LAYERS) as LayerMode[]).map((id) => (
        <button key={id} type="button" onClick={() => setLayerMode(id)} title={LAYERS[id].caption} aria-pressed={layerMode === id}>
          {LAYERS[id].label}
        </button>
      ))}
    </div>
  );
}

function Legend() {
  const mode = useWeatherStore((s) => s.layerMode);
  const layer = LAYERS[mode];
  return (
    <div className="absolute bottom-4 left-4 z-[10] cut px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="font-display text-[13px] font-semibold text-ink">{layer.label}</span>
        <span className="text-muted cursor-help" title={layer.caption} aria-label={layer.caption}><Info size={13} aria-hidden /></span>
      </div>
      <ul key={mode} className="grid grid-cols-[max-content_max-content] gap-x-4 gap-y-1 animate-fade">
        {layer.legend.map(({ color, label }) => (
          <li key={label} className="flex items-center gap-1.5 text-[12px] text-ink2">
            <span className="w-2.5 h-2.5 rounded-[2px] flex-shrink-0" style={{ background: color }} aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MainMap() {
  const [basemap, setBasemap] = useState("map");
  return (
    <div className="absolute inset-0">
      <VectorMap basemap={basemap} />
      <div className="absolute top-4 right-4 z-[10] tray shadow-float" role="group" aria-label="Basemap">
        {Object.keys(BASEMAPS).map((k) => (
          <button key={k} type="button" onClick={() => setBasemap(k)} aria-pressed={basemap === k}>
            {BASEMAPS[k].label}
          </button>
        ))}
      </div>
      <LayerBar />
      <Legend />
    </div>
  );
}
