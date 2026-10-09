/**
 * AtmosFusion — Dual Map Canvas
 * Map1: OpenStreetMap with CSS dark inversion (free, no key)
 * Map2: Google Maps with custom dark style (API key)
 * Floating Map1/Map2 toggle pill, shared station markers & layer controls.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  MapContainer, TileLayer, CircleMarker, GeoJSON,
  Marker, Tooltip, useMap, LayerGroup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF, PolygonF } from "@react-google-maps/api";
import { useWeatherStore } from "@/store/useWeatherStore";
import type { WeatherStation, LayerMode } from "@/types/weather";
import {
  Layers, Target, AlertTriangle, BarChart3,
  Shield, Eye, Map as MapIcon,
} from "lucide-react";
import * as turf from "@turf/turf";

/* ─────────────────────────────────────────────────────────── */
/*  Config                                                      */
/* ─────────────────────────────────────────────────────────── */

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const DARK_GOOGLE_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",               stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill",       stylers: [{ color: "#8a9bb0" }] },
  { elementType: "labels.text.stroke",     stylers: [{ color: "#0d1117" }] },
  { featureType: "administrative",         elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "administrative.locality",elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "road",                   elementType: "geometry.fill",  stylers: [{ color: "#1e293b" }] },
  { featureType: "road",                   elementType: "labels.text.fill",stylers: [{ color: "#64748b" }] },
  { featureType: "road.highway",           elementType: "geometry",        stylers: [{ color: "#334155" }] },
  { featureType: "road.highway",           elementType: "labels.text.fill",stylers: [{ color: "#94a3b8" }] },
  { featureType: "water",                  elementType: "geometry",        stylers: [{ color: "#0c1a2e" }] },
  { featureType: "water",                  elementType: "labels.text.fill",stylers: [{ color: "#1e3a5f" }] },
  { featureType: "poi",                    stylers: [{ visibility: "off" }] },
  { featureType: "poi.park",               elementType: "geometry", stylers: [{ color: "#0f1f10" }] },
  { featureType: "transit",                stylers: [{ visibility: "off" }] },
  { featureType: "landscape",              elementType: "geometry", stylers: [{ color: "#111827" }] },
];

const GMAPS_CENTER = { lat: 18.5204, lng: 73.8567 };

/* ─────────────────────────────────────────────────────────── */
/*  Color helpers                                               */
/* ─────────────────────────────────────────────────────────── */

function rainColor(mm: number): string {
  if (mm >= 204.5) return "#f87171";
  if (mm >= 115.6) return "#FFB703";
  if (mm >= 64.5)  return "#FF6B35";
  if (mm >= 35.5)  return "#3b82f6";
  if (mm >= 7.5)   return "#06D6A0";
  return "#3A86FF";
}

function getStationColor(station: WeatherStation, mode: LayerMode): string {
  switch (mode) {
    case "consensus": return rainColor(station.consensus_blend);
    case "trust":
      return station.dominant_family === "Physics" ? "#3A86FF"
           : station.dominant_family === "AI"      ? "#06D6A0"
           : "#8338EC";
    case "disagreement": {
      const d = station.disagreement_index;
      return d >= 100 ? "#E63946" : d >= 50 ? "#FFB703" : d >= 25 ? "#FF6B35" : "#06D6A0";
    }
    case "risk":
      return station.worst_case_90th >= 115.6 ? "#E63946"
           : station.worst_case_90th >= 64.5  ? "#FFB703"
           : "#06D6A0";
    case "coverage": return "#8338EC"; // Use a distinct color for coverage Voronoi areas
    default: return "#3b82f6";
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  Leaflet DivIcon builder                                     */
/* ─────────────────────────────────────────────────────────── */

function buildLeafletIcon(color: string, isSelected: boolean, hasAlert: boolean, name: string): L.DivIcon {
  const size = isSelected ? 18 : 13;
  const pulseHtml = hasAlert
    ? `<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size+20}px;height:${size+20}px;border-radius:50%;border:2px solid ${color};animation:af-pulse-ring 1.8s ease-out infinite;pointer-events:none;"></span>`
    : "";
  const spinRing = isSelected
    ? `<span style="position:absolute;inset:-5px;border-radius:50%;border:2px dashed ${color};opacity:0.7;animation:af-spin 3s linear infinite;pointer-events:none;"></span>`
    : "";
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size+10}px;height:${size+10}px;">
          ${pulseHtml}${spinRing}
          <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 ${isSelected?20:10}px ${color}CC,0 2px 8px rgba(0,0,0,0.6);position:relative;z-index:2;"></div>
        </div>
        <div style="margin-top:2px;font-size:9px;font-weight:700;color:${color};text-shadow:0 1px 5px rgba(0,0,0,1);white-space:nowrap;background:rgba(9,9,11,0.75);padding:1px 5px;border-radius:4px;pointer-events:none;">${name}</div>
      </div>`,
    iconAnchor: [50, (size+10)/2],
    popupAnchor: [0, -(size+20)],
    iconSize: [100, 45],
  });
}

/* ─────────────────────────────────────────────────────────── */
/*  Google Maps SVG marker builder                             */
/* ─────────────────────────────────────────────────────────── */

function buildGoogleIcon(color: string, isSelected: boolean): google.maps.Icon {
  const r = isSelected ? 11 : 8;
  const glow = isSelected ? 5 : 3;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${r*2+glow*4}' height='${r*2+glow*4}'>
    <defs>
      <filter id='g'>
        <feGaussianBlur stdDeviation='${glow}' result='b'/>
        <feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>
      </filter>
    </defs>
    <circle cx='${r+glow*2}' cy='${r+glow*2}' r='${r}' fill='${color}' stroke='rgba(255,255,255,0.45)' stroke-width='2' filter='url(%23g)'/>
  </svg>`;
  const size = r*2+glow*4;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size/2, size/2),
    labelOrigin: new window.google.maps.Point(size/2, size+10),
  };
}

/* ─────────────────────────────────────────────────────────── */
/*  Shared station tooltip card                                 */
/* ─────────────────────────────────────────────────────────── */

function StationCard({ station, color }: { station: WeatherStation; color: string }) {
  const deg = "\u00B0";
  const hasAlert = !!station.active_alert;
  return (
    <div className="bg-[#0d0d10]/[.97] backdrop-blur-xl border border-slate-border rounded-xl shadow-2xl w-[300px] font-sans overflow-hidden" style={{ animation: "af-fadein 0.18s ease both" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-border bg-frosted-slate/30">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="font-bold text-[13px] text-slate-100">{station.name}</span>
          <span className="text-[9px] text-slate-500 font-mono">{station.elevation_m}m</span>
        </div>
        {hasAlert && <span className="bg-crimson-hazard/15 text-crimson-hazard px-1.5 py-0.5 rounded text-[9px] font-bold uppercase animate-pulse">⚠ Alert</span>}
      </div>
      {/* Params */}
      <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {[
          { icon: "🌡", label: "Temp", obs: `${station.observed_temp_c}${deg}C`, model: `${station.consensus_temp}${deg}C`, c: "text-rose-400" },
          { icon: "💧", label: "Humidity", obs: `${station.observed_humidity}%`, model: `${station.consensus_humidity}%`, c: "text-sky-400" },
          { icon: "💨", label: "Wind", obs: `${station.observed_wind_kmh}`, model: `${station.consensus_wind}`, unit: " km/h", c: "text-emerald-400" },
          { icon: "🌧", label: "Rain 24h", obs: `${station.observed_rain_24h}`, model: `${station.consensus_blend}`, unit: " mm", c: "text-blue-400" },
          { icon: "⏱", label: "Pressure", obs: `${station.observed_pressure} hPa`, c: "text-amber-400" },
          { icon: "📈", label: "90th%ile", obs: `${station.worst_case_90th} mm`, c: "text-orange-400" },
        ].map(({ icon, label, obs, model, unit = "", c }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <div className="text-[8px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">{icon} {label}</div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[10px] text-slate-400">{obs}{!model ? unit : ""}</span>
              {model && <><span className="text-slate-600 text-[8px]">→</span><span className={`font-mono text-[10px] font-bold ${c}`}>{model}{unit}</span></>}
            </div>
          </div>
        ))}
      </div>
      {/* Model mini-grid */}
      <div className="px-3 pb-2">
        <div className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mb-1">Model Rain (mm)</div>
        <div className="grid grid-cols-3 gap-1">
          {Object.entries(station.model_predictions).map(([k, v]) => (
            <div key={k} className="bg-frosted-slate/40 rounded px-1.5 py-1 border border-slate-border/40">
              <div className="text-[7px] text-slate-500 uppercase font-bold">{k}</div>
              <div className="font-mono text-[10px] text-slate-200">{v}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-slate-border bg-frosted-slate/20 flex items-center justify-between">
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-quantum-violet animate-pulse"/><span className="text-[9px] text-slate-500">Dominant: <span className="text-slate-200 font-semibold">{station.dominant_model}</span></span></div>
        <span className="text-[9px] text-slate-600 font-mono">{station.lat.toFixed(3)}{"\u00B0"}N</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Leaflet fit-bounds helper                                   */
/* ─────────────────────────────────────────────────────────── */

function FitBounds() {
  const map = useMap();
  const forecast = useWeatherStore((s) => s.forecast);
  useEffect(() => {
    if (forecast?.stations.length) {
      map.fitBounds(forecast.stations.map((s) => [s.lat, s.lng] as [number, number]), { padding: [80, 80], maxZoom: 12 });
    }
  }, [forecast, map]);
  return null;
}

/* ─────────────────────────────────────────────────────────── */
/*  Layer controls panel                                        */
/* ─────────────────────────────────────────────────────────── */

const LAYERS: { id: LayerMode; label: string; icon: React.ReactNode }[] = [
  { id: "consensus",    label: "Consensus",    icon: <Target className="w-3.5 h-3.5" /> },
  { id: "trust",        label: "Trust Map",    icon: <Shield className="w-3.5 h-3.5" /> },
  { id: "disagreement", label: "Disagreement", icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { id: "risk",         label: "90th % Risk",  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { id: "coverage",     label: "Coverage",     icon: <Eye className="w-3.5 h-3.5" /> },
];

function LayerControls() {
  const { layerMode, setLayerMode } = useWeatherStore();
  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5" style={{ animation: "af-fadein 0.6s ease both" }}>
      <div className="panel p-1">
        <div className="px-2 py-1 text-[9px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1.5">
          <Layers className="w-3 h-3" /> Layers
        </div>
        {LAYERS.map((l) => (
          <button key={l.id} onClick={() => setLayerMode(l.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-[11px] rounded-sm transition-all duration-200 ${layerMode === l.id ? "bg-monsoon-cyan/10 text-monsoon-cyan" : "text-slate-400 hover:bg-frosted-slate hover:text-slate-100"}`}>
            {l.icon}{l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Voronoi Generator Hook                                      */
/* ─────────────────────────────────────────────────────────── */
function useVoronoiPolygons(stations: WeatherStation[], showCoverage: boolean) {
  return useMemo(() => {
    if (!showCoverage || stations.length < 3) return [];
    
    // Create turf points
    const points = turf.featureCollection(
      stations.map(s => turf.point([s.lng, s.lat], { id: s.id }))
    );
    
    // Bounding box for Voronoi with a 30km buffer
    const bbox = turf.bbox(turf.buffer(points, 30, { units: 'kilometers' }));
    
    // Generate Voronoi polygons
    const voronoiPolygons = turf.voronoi(points, { bbox });
    
    // Map properties back to polygons since turf drops them
    return voronoiPolygons.features.map((feature, idx) => {
       if (!feature) return null;
       // The voronoi function keeps the index order of the input points
       feature.properties = { ...stations[idx] };
       
       // Calculate area for display in analytics
       const areaKm2 = turf.area(feature) / 1000000;
       
       // Sync back the computed area to the store for AnalyticsDrawer to read (or just use it locally)
       // This is a dirty hack, ideally we store this in Zustand but this is fast for UI.
       stations[idx].coverage_radius_km = Math.round(Math.sqrt(areaKm2 / Math.PI)); 
       
       return feature;
    }).filter(Boolean) as GeoJSON.Feature<GeoJSON.Polygon, any>[];
  }, [stations, showCoverage]);
}

/* ─────────────────────────────────────────────────────────── */
/*  Map 1 — Leaflet OSM (CSS dark)                            */
/* ─────────────────────────────────────────────────────────── */

function OSMMap() {
  const showCoverage = useWeatherStore(s => s.layerMode) === "coverage";
  const { forecast, selectStation, selectedStationId, layerMode } = useWeatherStore();
  const stations = forecast?.stations ?? [];
  
  const voronoiFeatures = useVoronoiPolygons(stations, showCoverage);

  return (
    <MapContainer center={[18.5204, 73.8567]} zoom={11} className="w-full h-full af-dark-map" zoomControl={false} attributionControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        subdomains={["a","b","c"]} maxZoom={19}
      />
      <FitBounds />
      
      {showCoverage && voronoiFeatures.map((feature) => {
        const isSelected = feature.properties.id === selectedStationId;
        const color = getStationColor(feature.properties, layerMode);
        return (
          <GeoJSON 
            key={`voronoi-${feature.properties.id}`}
            data={feature}
            pathOptions={{ 
              color, 
              fillColor: color, 
              fillOpacity: isSelected ? 0.2 : 0.05, 
              weight: isSelected ? 2 : 1, 
              dashArray: "6 5" 
            }}
            eventHandlers={{
              click: () => selectStation(feature.properties.id)
            }}
          />
        );
      })}

      {stations.map((station) => {
        const color = getStationColor(station, layerMode);
        const isSelected = station.id === selectedStationId;
        const hasAlert = !!station.active_alert;
        const icon = buildLeafletIcon(color, isSelected, hasAlert, station.name);
        return (
          <LayerGroup key={station.id}>
            {hasAlert && (
              <CircleMarker center={[station.lat, station.lng]} radius={26}
                pathOptions={{ color:"#f87171", fillColor:"transparent", fillOpacity:0, weight:1.5, opacity:0.5, dashArray:"5 4" }} />
            )}
            <Marker position={[station.lat, station.lng]} icon={icon} eventHandlers={{ click: () => selectStation(station.id) }}>
              <Tooltip direction="top" offset={[0,-22]} opacity={1} className="!bg-transparent !border-0 !shadow-none !p-0">
                <StationCard station={station} color={color} />
              </Tooltip>
            </Marker>
          </LayerGroup>
        );
      })}
    </MapContainer>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Map 2 — Google Maps (dark style)                           */
/* ─────────────────────────────────────────────────────────── */

function GoogleMapView() {
  const showCoverage = useWeatherStore(s => s.layerMode) === "coverage";
  const { forecast, selectStation, selectedStationId, layerMode } = useWeatherStore();
  const stations = forecast?.stations ?? [];
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: GMAPS_KEY, id: "atmfusion-gmap" });

  const voronoiFeatures = useVoronoiPolygons(stations, showCoverage);

  const onLoad = useCallback((map: google.maps.Map) => {
    if (stations.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      stations.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
      map.fitBounds(bounds, 80);
    }
  }, [stations]);

  if (loadError) return (
    <div className="w-full h-full flex items-center justify-center bg-obsidian text-crimson-hazard text-sm">
      Failed to load Google Maps. Check API key.
    </div>
  );
  if (!isLoaded) return (
    <div className="w-full h-full flex items-center justify-center bg-obsidian text-slate-400 text-sm" style={{ animation: "af-fadein 0.3s ease both" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-monsoon-cyan border-t-transparent rounded-full" style={{ animation: "af-spin 0.8s linear infinite" }} />
        <span className="text-xs">Loading Google Maps…</span>
      </div>
    </div>
  );

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={GMAPS_CENTER}
      zoom={11}
      options={{
        styles: DARK_GOOGLE_STYLES,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        backgroundColor: "#0d1117",
      }}
      onLoad={onLoad}
    >
      {showCoverage && voronoiFeatures.map(feature => {
        const isSelected = feature.properties.id === selectedStationId;
        const color = getStationColor(feature.properties, layerMode);
        const paths = feature.geometry.coordinates[0].map((coord: any) => ({ lat: coord[1], lng: coord[0] }));
        
        return (
          <PolygonF
             key={`voronoi-${feature.properties.id}`}
             paths={paths}
             options={{
               strokeColor: color,
               strokeOpacity: 0.8,
               strokeWeight: isSelected ? 2 : 1,
               fillColor: color,
               fillOpacity: isSelected ? 0.2 : 0.05,
             }}
             onClick={() => selectStation(feature.properties.id)}
          />
        )
      })}

      {stations.map((station) => {
        const color = getStationColor(station, layerMode);
        const isSelected = station.id === selectedStationId;
        const hasAlert = !!station.active_alert;
        const isHovered = hoveredId === station.id;

        return (
          <div key={station.id}>
            <MarkerF
              position={{ lat: station.lat, lng: station.lng }}
              icon={buildGoogleIcon(color, isSelected)}
              label={{ text: station.name, color: color, fontSize: "9px", fontWeight: "700" }}
              onClick={() => selectStation(station.id)}
              onMouseOver={() => setHoveredId(station.id)}
              onMouseOut={() => setHoveredId(null)}
            />
            {(isHovered || isSelected) && (
              <InfoWindowF
                position={{ lat: station.lat, lng: station.lng }}
                options={{ disableAutoPan: true, pixelOffset: new window.google.maps.Size(0, -30) }}
                onCloseClick={() => setHoveredId(null)}
              >
                <StationCard station={station} color={color} />
              </InfoWindowF>
            )}
            {hasAlert && (
              <MarkerF
                position={{ lat: station.lat, lng: station.lng }}
                icon={{
                  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><circle cx='24' cy='24' r='22' fill='none' stroke='%23f87171' stroke-width='1.5' stroke-dasharray='5 4' opacity='0.6'/></svg>`)}`,
                  scaledSize: new window.google.maps.Size(48,48),
                  anchor: new window.google.maps.Point(24,24),
                }}
                clickable={false}
              />
            )}
          </div>
        );
      })}
    </GoogleMap>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Map toggle pill                                             */
/* ─────────────────────────────────────────────────────────── */

type MapType = "osm" | "google";

function MapToggle({ mapType, onToggle }: { mapType: MapType; onToggle: (t: MapType) => void }) {
  if (!GMAPS_KEY) return null;
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1001] flex" style={{ animation: "af-fadein 0.7s ease both" }}>
      <div className="panel flex rounded-full overflow-hidden border border-slate-border shadow-2xl">
        {([["osm","Map 1 · OSM Dark"],["google","Map 2 · Google"]] as [MapType,string][]).map(([id,label]) => (
          <button key={id} onClick={() => onToggle(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-all duration-250 ${mapType===id ? "bg-monsoon-cyan/20 text-monsoon-cyan" : "text-slate-500 hover:text-slate-200"}`}>
            <MapIcon className="w-3 h-3"/>{label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Main component                                             */
/* ─────────────────────────────────────────────────────────── */

export default function MainMap() {
  const [mapType, setMapType] = useState<MapType>("osm");

  return (
    <div className="relative flex-1 w-full h-full">
      {mapType === "osm" ? <OSMMap /> : <GoogleMapView />}
      <LayerControls />
      <MapToggle mapType={mapType} onToggle={setMapType} />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-obsidian/50 to-transparent pointer-events-none z-[400]" />
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-obsidian/30 to-transparent pointer-events-none z-[400]" />
    </div>
  );
}
