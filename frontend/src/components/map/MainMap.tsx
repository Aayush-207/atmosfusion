import { useEffect, useState, useMemo, useRef, useLayoutEffect } from "react";
import { Layers } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useWeatherStore } from "@/store/useWeatherStore";
import { LAYERS, type WeatherStation, type LayerMode } from "@/types/weather";

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
  const ring = selected ? "#26323B" : alert ? "#D9453A" : "transparent";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><circle cx='${c}' cy='${c}' r='${r + 3}' fill='none' stroke='${ring}' stroke-width='2'/><circle cx='${c}' cy='${c}' r='${r}' fill='${color}' stroke='#fff' stroke-width='2.5'/></svg>`;
  const pulse = alert ? `<span class="absolute inset-0 rounded-full border-2 border-alert animate-pulse_ring"></span>` : "";
  const pos = side === "right" ? `left:${size + 2}px` : `right:${size + 2}px;text-align:right`;
  const chip = selected ? "bg-ink text-white border-ink" : "bg-white text-ink border-black/10";
  const sub = selected ? "text-white/70" : "text-muted";
  return `<div class="relative cursor-pointer transition-transform duration-200 hover:scale-110" style="width:${size}px;height:${size}px">${pulse}${svg}
    <div class="absolute top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-[4px] border whitespace-nowrap leading-tight shadow-[0_1px_4px_rgba(0,0,0,.3)] ${chip}" style="${pos}">
      <div class="text-[11px] font-semibold">${s.name}</div>
      <div class="text-[9.5px] ${sub}">${s.terrain_type} · <span class="font-data">${s.consensus_blend} mm</span></div>
    </div></div>`;
}

function StationCard({ station }: { station: WeatherStation }) {
  const rows: [string, string][] = [
    ["Observed 24h", `${station.observed_rain_24h} mm`],
    ["Blend", `${station.consensus_blend} mm`],
    ["90th percentile", `${station.worst_case_90th} mm`],
    ["P(heavy ≥64.5)", `${Math.round(station.p_heavy_rain * 100)}%`],
  ];
  return (
    <div className="card shadow-hard w-[230px] p-3 font-sans text-ink">
      <div className="flex items-baseline justify-between gap-2 pb-2 border-b border-dashed">
        <span className="font-semibold text-[14px] truncate">{station.name}</span>
        <span className="text-[11px] text-muted num">{station.elevation_m} m</span>
      </div>
      <div className="mt-2 space-y-0.5 text-xs">
        {rows.map(([label, v]) => (
          <div key={label} className="flex justify-between">
            <span className="text-muted">{label}</span>
            <span className="num">{v}</span>
          </div>
        ))}
      </div>
      {station.active_alert && <div className="mt-2 -mx-3 -mb-3 px-3 py-1.5 bg-alert text-white text-[11px] font-semibold uppercase tracking-wider">Active alert</div>}
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
    mapRef.current.fitBounds(b, { padding: { top: 90, bottom: 90, left: 100, right: 220 }, maxZoom: 12, duration: 1200 });
  }, [stations]);

  // Voronoi cells as a GeoJSON fill layer; colours come from feature properties.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleTick) return;
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: cells.map(({ station, feature }) => ({ ...feature, properties: { id: station.id, color: colorOf(station), sel: station.id === selectedStationId } })),
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
        <div className="absolute z-[5] pointer-events-none animate-rise" style={{ left: hover.x - 115, top: hover.y - 150 }}>
          <StationCard station={hover.s} />
        </div>
      )}
    </div>
  );
}

function LayerBar() {
  const { layerMode, setLayerMode } = useWeatherStore();
  const refs = useRef<Partial<Record<LayerMode, HTMLButtonElement | null>>>({});
  const [pill, setPill] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const el = refs.current[layerMode];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [layerMode]);
  return (
    <div className="absolute top-4 left-4 z-[10] card shadow-hard p-1 flex items-center gap-0.5">
      <span className="px-2 text-muted"><Layers size={14} /></span>
      <span className="absolute top-1 bottom-1 bg-ink rounded-[3px] transition-all duration-300 ease-[cubic-bezier(.2,.7,.2,1)]" style={pill} />
      {(Object.keys(LAYERS) as LayerMode[]).map((id) => (
        <button
          key={id}
          ref={(el) => { refs.current[id] = el; }}
          onClick={() => setLayerMode(id)}
          className={`relative px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-[3px] transition-colors duration-300 ${layerMode === id ? "text-white" : "text-muted hover:text-ink"}`}
        >
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
    <div key={mode} className="absolute bottom-4 left-4 z-[10] card shadow-hard px-3 py-2.5 space-y-1 w-[230px]">
      <div className="label !text-[9.5px]">{layer.label}</div>
      <p className="text-[11px] leading-snug text-muted pb-1.5 mb-1 border-b border-line">{layer.caption}</p>
      {layer.legend.map(({ color, label }, i) => (
        <div key={label} className="flex items-center gap-2 text-[11px] text-ink2 animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
          <span className="w-3 h-3 rounded-[2px] border border-ink/20" style={{ background: color }} />
          {label}
        </div>
      ))}
    </div>
  );
}

export default function MainMap() {
  const [basemap, setBasemap] = useState("map");
  return (
    <div className="absolute inset-0">
      <VectorMap basemap={basemap} />
      <div className="absolute top-4 right-4 z-[10] card shadow-hard p-1 flex gap-0.5">
        {Object.keys(BASEMAPS).map((k) => (
          <button
            key={k}
            onClick={() => setBasemap(k)}
            className={`px-3 py-1.5 text-xs font-medium rounded-[3px] transition-colors duration-200 ${basemap === k ? "bg-ink text-white" : "text-muted hover:text-ink hover:bg-paper"}`}
          >
            {BASEMAPS[k].label}
          </button>
        ))}
      </div>
      <LayerBar />
      <Legend />
    </div>
  );
}
