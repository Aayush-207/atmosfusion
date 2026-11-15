import { useEffect, useState, useMemo, useRef } from "react";
import { Info, TriangleAlert } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useWeatherStore } from "@/store/useWeatherStore";
import { LAYERS, MODEL_LABELS, MODEL_COLORS, cssColor, type WeatherStation, type LayerMode } from "@/types/weather";

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

// IMD 24 h rainfall categories, for the hover card's headline pill
const CATEGORY: [number, string, string][] = [
  [204.5, "Extremely heavy", "var(--rain-6)"],
  [115.6, "Very heavy", "var(--rain-5)"],
  [64.5, "Heavy", "var(--rain-4)"],
  [35.5, "Moderately heavy", "var(--rain-3)"],
  [7.5, "Moderate", "var(--rain-2)"],
  [0, "Light", "var(--rain-1)"],
];
const categoryOf = (mm: number) => CATEGORY.find(([t]) => mm >= t)!;

// The hover card, a small chart of the gauge: its IMD category, the blend set beside a ring for the heavy-rain
// chance, observed, blend and 90th percentile compared on one scale, and the model that leads its blend.
function StationCard({ station, below = false }: { station: WeatherStation; below?: boolean }) {
  const [, cat, catColor] = categoryOf(station.consensus_blend);
  const heavy = Math.round(station.p_heavy_rain * 100);
  const bars: [string, number, string][] = [
    ["Observed", station.observed_rain_24h, "var(--data-observed)"],
    ["Blend", station.consensus_blend, "var(--data-forecast)"],
    ["90th pct", station.worst_case_90th, "var(--data-upper)"],
  ];
  const top = Math.max(...bars.map(([, v]) => v), 1);
  const [leadKey, leadW] = Object.entries(station.assigned_weights).sort(([, a], [, b]) => b - a)[0] ?? ["", 0];
  const ringTone = heavy >= 60 ? "var(--level-high)" : heavy >= 25 ? "var(--level-mid)" : "var(--level-low)";

  return (
    <div className="relative w-[300px] rounded-[14px] bg-paper text-ink shadow-float ring-1 ring-rule">
      <div className="px-4 pt-3.5 pb-3 flex items-start justify-between gap-3 border-b border-rule">
        <div className="min-w-0">
          <div className="font-display text-[15px] font-semibold leading-snug text-heading">{station.name}</div>
          <div className="text-[12px] text-label leading-snug mt-0.5">{station.terrain_type}, <span className="num">{station.elevation_m} m</span></div>
        </div>
        <span className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[11px] font-medium text-ink2"
          style={{ background: `color-mix(in oklab, ${catColor} 16%, var(--color-paper))` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: catColor }} aria-hidden />
          {cat}
        </span>
      </div>

      <div className="px-4 pt-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium text-label">Blend, next 24 h</div>
          <div className="font-display text-[28px] font-semibold leading-none mt-1 num c-forecast">
            {station.consensus_blend}<span className="text-[13px] font-medium text-label"> mm</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" style={{ stroke: "var(--color-paper-3)" }} />
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" pathLength={100} strokeLinecap="round"
              style={{ stroke: ringTone, strokeDasharray: `${Math.max(heavy, 0.5)} 100` }} />
          </svg>
          <div className="leading-tight">
            <div className="num text-[15px] font-semibold text-heading">{heavy}%</div>
            <div className="text-[11px] text-label">heavy rain</div>
          </div>
        </div>
      </div>

      <dl className="px-4 pt-3 pb-3.5 space-y-1.5">
        {bars.map(([label, v, color]) => (
          <div key={label} className="grid grid-cols-[60px_1fr_56px] items-center gap-2 text-[12px]">
            <dt className="text-label">{label}</dt>
            <dd className="meter !h-1.5"><span style={{ transform: `scaleX(${v / top})`, background: color }} /></dd>
            <dd className="num text-right font-medium text-ink">{v} mm</dd>
          </div>
        ))}
      </dl>

      {leadKey && (
        <div className={`px-4 py-2.5 border-t border-rule flex items-center gap-2 text-[12px] ${station.active_alert ? "" : "rounded-b-[14px]"} bg-paper2`}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MODEL_COLORS[leadKey] }} aria-hidden />
          <span className="text-label">Led by</span>
          <span className="font-medium text-ink truncate">{MODEL_LABELS[leadKey] ?? leadKey}</span>
          <span className="num ml-auto font-semibold text-heading">{Math.round(leadW * 100)}%</span>
        </div>
      )}

      {station.active_alert && (
        <div className="px-4 py-2 rounded-b-[14px] bg-error-wash flex items-center gap-1.5 text-[12px] font-semibold text-error">
          <TriangleAlert size={13} aria-hidden /> Active alert at this gauge
        </div>
      )}

      {below ? (
        <span aria-hidden className="absolute left-1/2 -top-[6px] w-3 h-3 -translate-x-1/2 rotate-45 ring-1 ring-rule bg-paper [clip-path:polygon(0_0,100%_0,0_100%)]" />
      ) : (
        <span aria-hidden className={`absolute left-1/2 -bottom-[6px] w-3 h-3 -translate-x-1/2 rotate-45 ring-1 ring-rule [clip-path:polygon(100%_0,100%_100%,0_100%)] ${station.active_alert ? "bg-error-wash" : "bg-paper2"}`} />
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
        // Above the gauge; near the top edge there is no room, so it opens below instead
        <div className="absolute z-[30] pointer-events-none" style={hover.y < 320
          ? { left: hover.x, top: hover.y + 18, transform: "translate(-50%, 0)" }
          : { left: hover.x, top: hover.y - 18, transform: "translate(-50%, -100%)" }}>
          <div className={`animate-pop ${hover.y < 320 ? "origin-top" : "origin-bottom"}`}>
            <StationCard station={hover.s} below={hover.y < 320} />
          </div>
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
    <div className="absolute bottom-[68px] left-4 z-[10] cut px-3 py-2.5">
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
