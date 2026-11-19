import { useEffect, useState, useMemo, useRef } from "react";
import CountUp from "@/components/layout/CountUp";
import { Info, TriangleAlert } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import { circle } from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import { useWeatherStore } from "@/store/useWeatherStore";
import { LAYERS, hueVars, MODEL_LABELS, MODEL_COLORS, cssColor, type WeatherStation, type LayerMode } from "@/types/weather";

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

function pinHtml(s: WeatherStation, color: string, selected: boolean, side: "left" | "right", hovered = false) {
  const alert = !!s.active_alert;
  if (hovered) {
    // Google-Maps-style location dot: a blue core in a white ring, soft shadow, and a halo breathing out
    const size = 30, pos = side === "right" ? `left:${size + 2}px` : `right:${size + 2}px;text-align:right`;
    return `<div class="relative cursor-pointer" style="width:${size}px;height:${size}px">
      <span class="absolute inset-0 rounded-full gmap-halo"></span>
      <span class="absolute rounded-full gmap-dot" style="left:7px;top:7px;width:16px;height:16px"></span>
      <div class="absolute top-1/2 -translate-y-1/2 px-2 py-1 rounded-input border whitespace-nowrap leading-tight shadow-card bg-paper text-ink border-rule" style="${pos}">
        <div class="text-[12px] font-medium">${s.name}</div>
        <div class="text-[11px] text-muted"><span class="num">${s.consensus_blend} mm</span> in ${s.terrain_type}</div>
      </div></div>`;
  }
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
function StationCard({ station, below = false, shift = 0 }: { station: WeatherStation; below?: boolean; shift?: number }) {
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
          <div className="text-[12px] text-label leading-snug mt-0.5">{station.terrain_type}, <span className="num"><CountUp value={station.elevation_m} replay={station.id} duration={700} /> m</span></div>
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
            <CountUp value={station.consensus_blend} replay={station.id} duration={700} /><span className="text-[13px] font-medium text-label"> mm</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" style={{ stroke: "var(--color-paper-3)" }} />
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" pathLength={100} strokeLinecap="round"
              className="ring-in" style={{ stroke: ringTone, strokeDasharray: `${Math.max(heavy, 0.5)} 100` }} />
          </svg>
          <div className="leading-tight">
            <div className="num text-[15px] font-semibold text-heading"><CountUp value={heavy} replay={station.id} duration={700} />%</div>
            <div className="text-[11px] text-label">heavy rain</div>
          </div>
        </div>
      </div>

      <dl className="px-4 pt-3 pb-3.5 space-y-1.5">
        {bars.map(([label, v, color], i) => (
          <div key={label} className="grid grid-cols-[60px_1fr_56px] items-center gap-2 text-[12px]">
            <dt className="text-label">{label}</dt>
            <dd className="meter !h-1.5"><span className="fill-in" style={{ transform: `scaleX(${v / top})`, background: color, animationDelay: `${i * 70}ms` }} /></dd>
            <dd className="num text-right font-medium text-ink"><CountUp value={v} replay={station.id} duration={700} /> mm</dd>
          </div>
        ))}
      </dl>

      <div className="px-4 py-2.5 border-t border-rule flex items-center gap-2 text-[12px]">
        <span className="relative w-3 h-3 flex-shrink-0 rounded-full" style={{ background: "color-mix(in oklab, var(--map-coverage) 22%, transparent)" }} aria-hidden>
          <span className="absolute inset-[3px] rounded-full" style={{ background: "var(--map-coverage)" }} />
        </span>
        <span className="text-label">Covers</span>
        <span className="font-medium text-ink">
          <CountUp value={station.coverage_radius_km ?? station.reach_km} replay={station.id} duration={700} /> km radius
        </span>
        {station.coverage_area_km2 !== undefined && (
          <span className="num ml-auto font-semibold text-heading"><CountUp value={station.coverage_area_km2} replay={station.id} duration={700} /> km²</span>
        )}
      </div>

      {leadKey && (
        <div className={`px-4 py-2.5 border-t border-rule flex items-center gap-2 text-[12px] ${station.active_alert ? "" : "rounded-b-[14px]"} bg-paper2`}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MODEL_COLORS[leadKey] }} aria-hidden />
          <span className="text-label">Led by</span>
          <span className="font-medium text-ink truncate">{MODEL_LABELS[leadKey] ?? leadKey}</span>
          <span className="num ml-auto font-semibold text-heading"><CountUp value={Math.round(leadW * 100)} replay={station.id} duration={700} />%</span>
        </div>
      )}

      {station.active_alert && (
        <div className="px-4 py-2 rounded-b-[14px] bg-error-wash flex items-center gap-1.5 text-[12px] font-semibold text-error">
          <TriangleAlert size={13} aria-hidden /> Active alert at this gauge
        </div>
      )}

      {below ? (
        <span aria-hidden style={{ left: `calc(50% + ${shift}px)` }} className="absolute -top-[6px] w-3 h-3 -translate-x-1/2 rotate-45 ring-1 ring-rule bg-paper [clip-path:polygon(0_0,100%_0,0_100%)]" />
      ) : (
        <span aria-hidden style={{ left: `calc(50% + ${shift}px)` }} className={`absolute -bottom-[6px] w-3 h-3 -translate-x-1/2 rotate-45 ring-1 ring-rule [clip-path:polygon(100%_0,100%_100%,0_100%)] ${station.active_alert ? "bg-error-wash" : "bg-paper2"}`} />
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
  const [hover, setHover] = useState<{ s: WeatherStation; x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: box.current!,
      style: BASEMAPS[styleKey.current].style,
      center: [CENTER.lng, CENTER.lat],
      zoom: 10,
      attributionControl: { compact: true },
      fadeDuration: 400,
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
    // Padding scales with the map, so a narrow map still frames the gauges instead of zooming out to the country
    const c = mapRef.current.getContainer(), w = c.clientWidth, h = c.clientHeight;
    const padding = { top: Math.min(90, h * 0.14), bottom: Math.min(110, h * 0.18), left: Math.min(100, w * 0.12), right: Math.min(220, w * 0.22) };
    mapRef.current.fitBounds(b, { padding, maxZoom: 12, duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1200 });
  }, [stations]);

  // Picking another gauge glides the map to it (not the first selection, which the opening fit already frames)
  const lastSel = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    const s = stations.find((x) => x.id === selectedStationId);
    if (!map || !s) return;
    if (lastSel.current === null) { lastSel.current = s.id; return; }
    if (lastSel.current === s.id) return;
    lastSel.current = s.id;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.easeTo({ center: [s.lng, s.lat], duration: reduce ? 0 : 1000, easing: (t) => 1 - Math.pow(1 - t, 3) });
  }, [selectedStationId, stations]);

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

  // Hovering a gauge shows the area it stands for: a circle at its coverage radius (the equivalent radius of its
  // Voronoi cell, else its WMO reach), drawn at true scale in a light transparent blue with a fine blue edge, like
  // Google Maps' accuracy circle. On leave the circle fades out rather than vanishing.
  const hoverId = hover?.s.id ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleTick) return;
    const s = hoverId ? stations.find((x) => x.id === hoverId) : undefined;
    const apply = () => {
      const blue = cssColor("var(--map-coverage)");
      // Each piece checked on its own, so a retry after a half-finished attempt adds whatever is still missing
      if (!map.getSource("hover-cov")) map.addSource("hover-cov", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      if (!map.getLayer("hover-cov-fill")) map.addLayer({ id: "hover-cov-fill", type: "fill", source: "hover-cov",
        paint: { "fill-color": blue, "fill-opacity": 0, "fill-opacity-transition": { duration: 350, delay: 0 } } });
      if (!map.getLayer("hover-cov-line")) map.addLayer({ id: "hover-cov-line", type: "line", source: "hover-cov",
        paint: { "line-color": blue, "line-width": 1.5, "line-opacity": 0, "line-opacity-transition": { duration: 350, delay: 0 } } });
      map.moveLayer("hover-cov-fill"); map.moveLayer("hover-cov-line"); // above the coverage layer
      if (s) {
        const km = s.coverage_radius_km ?? s.reach_km;
        (map.getSource("hover-cov") as maplibregl.GeoJSONSource).setData(circle([s.lng, s.lat], km, { units: "kilometers", steps: 128 }));
      }
      map.setPaintProperty("hover-cov-fill", "fill-opacity", s ? 0.16 : 0);
      map.setPaintProperty("hover-cov-line", "line-opacity", s ? 0.6 : 0);
    };
    // Sources can be added once the style has parsed; if it is mid-reload, try again when the map settles
    const retry = () => { try { apply(); } catch { /* still loading; the next event tries again */ } };
    try { apply(); } catch { map.once("styledata", retry); map.once("idle", retry); }
  }, [hoverId, stations, styleTick]);

  // HTML markers sit above the canvas, so they survive style switches untouched. They are created once and
  // updated in place: a selection or layer change rewrites only the markers whose look changed, so nothing blinks.
  const markers = useRef(new Map<string, { marker: maplibregl.Marker; el: HTMLDivElement; html: string }>());
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const store = markers.current;
    const ids = new Set(stations.map((s) => s.id));
    for (const [id, m] of store) if (!ids.has(id)) { m.marker.remove(); store.delete(id); }
    for (const s of stations) {
      const sel = s.id === selectedStationId;
      const html = pinHtml(s, colorOf(s), sel, labelSide(s, stations), s.id === hoverId);
      let m = store.get(s.id);
      if (!m) {
        const el = document.createElement("div");
        m = { marker: new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map), el, html: "" };
        store.set(s.id, m);
      }
      m.el.onclick = () => selectStation(s.id);
      m.el.onmouseenter = () => {
        const p = map.project([s.lng, s.lat]);
        const c = map.getContainer();
        setHover({ s, x: p.x, y: p.y, w: c.clientWidth, h: c.clientHeight });
      };
      m.el.onmouseleave = () => setHover(null);
      m.el.style.zIndex = s.id === hoverId ? "3" : sel ? "2" : "1";
      if (m.html !== html) { m.el.innerHTML = html; m.html = html; }
    }
  }, [stations, selectedStationId, colorOf, selectStation, hoverId]);
  useEffect(() => {
    const store = markers.current;
    return () => { store.forEach((m) => m.marker.remove()); store.clear(); };
  }, []);

  return (
    <div className="w-full h-full relative">
      <div ref={box} className="w-full h-full" />
      {hover && (() => {
        // Above the gauge when there is room, else below; slid sideways to stay inside the map, the pointer still on the gauge
        const HALF = 150, EDGE = 12;
        const below = hover.y < 410 && hover.h - hover.y > hover.y;
        const cx = Math.min(Math.max(hover.x, HALF + EDGE), hover.w - HALF - EDGE);
        const shift = Math.max(Math.min(hover.x - cx, HALF - 20), -(HALF - 20));
        return (
          <div className="absolute z-[30] pointer-events-none" style={below
            ? { left: cx, top: hover.y + 20, transform: "translate(-50%, 0)" }
            : { left: cx, top: hover.y - 20, transform: "translate(-50%, -100%)" }}>
            <div className={`animate-pop ${below ? "origin-top" : "origin-bottom"}`}>
              <StationCard key={hover.s.id} station={hover.s} below={below} shift={shift} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function LayerBar() {
  const { layerMode, setLayerMode } = useWeatherStore();
  return (
    <div className="absolute top-4 left-4 z-[10] tray shadow-float max-w-[calc(100%-200px)] overflow-x-auto no-scrollbar" role="group" aria-label="Map layer">
      {(Object.keys(LAYERS) as LayerMode[]).map((id) => (
        <button key={id} type="button" onClick={() => setLayerMode(id)} title={LAYERS[id].caption} aria-pressed={layerMode === id}
          className="tone-layer inline-flex items-center gap-1.5" style={hueVars(LAYERS[id].hue)}>
          <span className="dot w-1.5 h-1.5 rounded-full" aria-hidden />
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
    <div className="absolute bottom-[68px] left-4 z-[10] cut tone-layer px-3 py-2.5" style={hueVars(layer.hue)}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: "var(--tone)" }} aria-hidden />
        <span className="font-display text-[13px] font-semibold tone-text">{layer.label}</span>
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
