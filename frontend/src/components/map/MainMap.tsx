import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF, PolygonF } from "@react-google-maps/api";
import * as turf from "@turf/turf";
import { useWeatherStore } from "@/store/useWeatherStore";
import { LAYERS, type WeatherStation, type LayerMode } from "@/types/weather";

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const CENTER = { lat: 18.5204, lng: 73.8567 };

const LIGHT_GOOGLE_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f3f0e8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6f6a60" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f3f0e8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#e3ded2" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d6e2e6" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

function dot(color: string, selected: boolean, alert: boolean) {
  const r = selected ? 9 : 6;
  const ring = selected ? "#1d2733" : alert ? "#c2410c" : "transparent";
  const size = r * 2 + 10;
  return { size, svg: `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><circle cx='${size / 2}' cy='${size / 2}' r='${r + 3}' fill='none' stroke='${ring}' stroke-width='1.5'/><circle cx='${size / 2}' cy='${size / 2}' r='${r}' fill='${color}' stroke='#fff' stroke-width='2'/></svg>` };
}

function leafletIcon(color: string, selected: boolean, alert: boolean, name: string) {
  const { size, svg } = dot(color, selected, alert);
  return L.divIcon({
    className: "",
    // Only the selected station is labelled; gauges cluster and labels collide otherwise.
    html: `<div style="display:flex;flex-direction:column;align-items:center">${svg}${selected ? `<span style="font:600 11px 'IBM Plex Sans',sans-serif;color:#1d2733;white-space:nowrap;text-shadow:0 0 3px #fbfaf6,0 0 3px #fbfaf6,0 0 3px #fbfaf6">${name}</span>` : ""}</div>`,
    iconSize: [140, size + 16],
    iconAnchor: [70, size / 2],
  });
}

function StationCard({ station }: { station: WeatherStation }) {
  const rows: [string, string][] = [
    ["Observed 24h", `${station.observed_rain_24h} mm`],
    ["Blend", `${station.consensus_blend} mm`],
    ["90th percentile", `${station.worst_case_90th} mm`],
    ["P(heavy ≥64.5)", `${Math.round(station.p_heavy_rain * 100)}%`],
  ];
  return (
    <div className="card shadow-lg w-[220px] p-3 font-sans text-ink">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-[13px] truncate">{station.name}</span>
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
      {station.active_alert && <div className="mt-2 pt-2 border-t text-[11px] text-alert font-medium">Active alert</div>}
    </div>
  );
}

function FitBounds({ stations }: { stations: WeatherStation[] }) {
  const map = useMap();
  useEffect(() => {
    if (stations.length) map.fitBounds(stations.map((s) => [s.lat, s.lng] as [number, number]), { padding: [80, 80], maxZoom: 12 });
  }, [stations, map]);
  return null;
}

function useVoronoi(stations: WeatherStation[], on: boolean) {
  return useMemo(() => {
    if (!on || stations.length < 3) return [];
    const points = turf.featureCollection(stations.map((s) => turf.point([s.lng, s.lat])));
    const bbox = turf.bbox(turf.buffer(points, 30, { units: "kilometers" })!);
    return turf.voronoi(points, { bbox }).features.flatMap((f, i) => {
      if (!f) return [];
      // ponytail: mutates station so AnalyticsDrawer can show radius; move into store if it ever needs reactivity
      stations[i].coverage_radius_km = Math.round(Math.sqrt(turf.area(f) / 1e6 / Math.PI));
      return [{ station: stations[i], feature: f }];
    });
  }, [stations, on]);
}

function useMapData() {
  const { forecast, selectStation, selectedStationId, layerMode } = useWeatherStore();
  const stations = forecast?.stations ?? [];
  const colorOf = LAYERS[layerMode].color;
  return { stations, selectStation, selectedStationId, colorOf, cells: useVoronoi(stations, layerMode === "coverage") };
}

function OSMMap() {
  const { stations, selectStation, selectedStationId, colorOf, cells } = useMapData();
  return (
    <MapContainer center={[CENTER.lat, CENTER.lng]} zoom={11} className="w-full h-full" zoomControl={false}>
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
        maxZoom={16}
      />
      <FitBounds stations={stations} />
      {cells.map(({ station, feature }) => {
        const sel = station.id === selectedStationId;
        return (
          <GeoJSON
            key={`cell-${station.id}-${sel}`}
            data={feature}
            pathOptions={{ color: colorOf(station), fillOpacity: sel ? 0.18 : 0.05, weight: sel ? 2 : 1 }}
            eventHandlers={{ click: () => selectStation(station.id) }}
          />
        );
      })}
      {stations.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={leafletIcon(colorOf(s), s.id === selectedStationId, !!s.active_alert, s.name)}
          eventHandlers={{ click: () => selectStation(s.id) }}
        >
          <Tooltip direction="top" offset={[0, -14]} opacity={1}>
            <StationCard station={s} />
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}

function GoogleMapView() {
  const { stations, selectStation, selectedStationId, colorOf, cells } = useMapData();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: GMAPS_KEY, id: "atmfusion-gmap" });

  const onLoad = useCallback((map: google.maps.Map) => {
    const bounds = new google.maps.LatLngBounds();
    stations.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
    if (stations.length) map.fitBounds(bounds, 80);
  }, [stations]);

  if (loadError || !isLoaded)
    return <div className="w-full h-full flex items-center justify-center text-sm text-muted">{loadError ? "Google Maps failed to load. Check the API key." : "Loading map…"}</div>;

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={CENTER}
      zoom={11}
      options={{ styles: LIGHT_GOOGLE_STYLES, disableDefaultUI: true, backgroundColor: "#f3f0e8" }}
      onLoad={onLoad}
    >
      {cells.map(({ station, feature }) => {
        const sel = station.id === selectedStationId;
        const color = colorOf(station);
        return (
          <PolygonF
            key={`cell-${station.id}`}
            paths={feature.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }))}
            options={{ strokeColor: color, strokeWeight: sel ? 2 : 1, fillColor: color, fillOpacity: sel ? 0.18 : 0.05 }}
            onClick={() => selectStation(station.id)}
          />
        );
      })}
      {stations.map((s) => {
        const { size, svg } = dot(colorOf(s), s.id === selectedStationId, !!s.active_alert);
        return (
          <MarkerF
            key={s.id}
            position={{ lat: s.lat, lng: s.lng }}
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
              scaledSize: new google.maps.Size(size, size),
              anchor: new google.maps.Point(size / 2, size / 2),
              labelOrigin: new google.maps.Point(size / 2, size + 8),
            }}
            label={s.id === selectedStationId ? { text: s.name, color: "#1d2733", fontSize: "11px", fontWeight: "600" } : undefined}
            onClick={() => selectStation(s.id)}
            onMouseOver={() => setHoveredId(s.id)}
            onMouseOut={() => setHoveredId(null)}
          >
            {hoveredId === s.id && (
              <InfoWindowF options={{ disableAutoPan: true }}>
                <StationCard station={s} />
              </InfoWindowF>
            )}
          </MarkerF>
        );
      })}
    </GoogleMap>
  );
}

function LayerBar() {
  const { layerMode, setLayerMode } = useWeatherStore();
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] card shadow-sm p-1 flex gap-0.5">
      {(Object.keys(LAYERS) as LayerMode[]).map((id) => (
        <button
          key={id}
          onClick={() => setLayerMode(id)}
          className={`px-3 py-1.5 text-xs whitespace-nowrap rounded-md transition-colors ${layerMode === id ? "bg-ink text-surface" : "text-muted hover:text-ink hover:bg-paper"}`}
        >
          {LAYERS[id].label}
        </button>
      ))}
    </div>
  );
}

function Legend() {
  const layer = LAYERS[useWeatherStore((s) => s.layerMode)];
  return (
    <div className="absolute bottom-4 left-4 z-[1000] card shadow-sm px-3 py-2.5 space-y-1">
      {layer.legend.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2 text-[11px] text-muted">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          {label}
        </div>
      ))}
    </div>
  );
}

export default function MainMap() {
  const [google, setGoogle] = useState(false);
  return (
    <div className="absolute inset-0">
      {google ? <GoogleMapView /> : <OSMMap />}
      <LayerBar />
      <Legend />
      {GMAPS_KEY && (
        <button onClick={() => setGoogle((g) => !g)} className="absolute bottom-4 right-4 z-[1000] card shadow-sm px-3 py-1.5 text-xs text-muted hover:text-ink">
          {google ? "Use OSM basemap" : "Use Google basemap"}
        </button>
      )}
    </div>
  );
}
