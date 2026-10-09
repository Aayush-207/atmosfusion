/**
 * AtmosFusion — Right Drawer: Layer Analytics & Station Insights
 */

import { useWeatherStore } from "@/store/useWeatherStore";
import {
  Activity,
  Layers,
  Thermometer,
  Wind,
  CloudRain,
  Gauge,
  Target,
  Shield,
  BarChart3,
  AlertTriangle,
  Cpu, Eye, MapPin
} from "lucide-react";

/* ─────────────────────────────────────────────────────────── */
/*  Views based on Layer Mode                                   */
/* ─────────────────────────────────────────────────────────── */

function ConsensusView({ station, allStations }: { station: any; allStations: any[] }) {
  const sortedStations = [...allStations].sort((a, b) => b.consensus_blend - a.consensus_blend);

  return (
    <div className="space-y-3" style={{ animation: 'af-fadein 0.4s ease both' }}>
      <div className="panel p-3 bg-midnight-slate/50">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-atlantic-blue" />
          {station ? `Vector Profile: ${station.name}` : "Region Overview"}
        </div>
        {station ? (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="panel p-3 bg-obsidian flex flex-col gap-1 border border-slate-700">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest"><Thermometer className="w-3.5 h-3.5 text-crimson-hazard" />Temperature</div>
              <div className="text-xl font-bold text-slate-100">{station.consensus_temp}°C</div>
            </div>
            <div className="panel p-3 bg-obsidian flex flex-col gap-1 border border-slate-700">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest"><Wind className="w-3.5 h-3.5 text-monsoon-cyan" />Wind Speed</div>
              <div className="text-xl font-bold text-slate-100">{station.consensus_wind} <span className="text-sm">km/h</span></div>
            </div>
            <div className="panel p-3 bg-obsidian flex flex-col gap-1 border border-slate-700">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest"><CloudRain className="w-3.5 h-3.5 text-blue-400" />Rainfall</div>
              <div className="text-xl font-bold text-slate-100">{station.consensus_blend} <span className="text-sm">mm</span></div>
            </div>
            <div className="panel p-3 bg-obsidian flex flex-col gap-1 border border-slate-700">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest"><Gauge className="w-3.5 h-3.5 text-amber-400" />Pressure</div>
              <div className="text-xl font-bold text-slate-100">{station.observed_pressure} <span className="text-sm">hPa</span></div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-4 text-center">Select a station to see its atmospheric profile.</div>
        )}
      </div>

      {/* All Stations Summary List */}
      <div className="panel p-3 bg-midnight-slate/50 flex flex-col flex-1 min-h-[250px]">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
          <CloudRain className="w-3 h-3 text-monsoon-cyan" />
          All Stations (Rainfall & Temp)
        </div>
        <div className="space-y-1">
          {sortedStations.map((s) => (
            <div 
              key={s.id} 
              onClick={() => useWeatherStore.getState().selectStation(s.id)}
              className={`flex items-center justify-between p-2 rounded text-xs border cursor-pointer hover:bg-slate-800 transition-colors ${station?.id === s.id ? 'bg-monsoon-cyan/10 border-monsoon-cyan/40' : 'bg-obsidian border-slate-border'}`}>
              <span className="font-semibold text-slate-200">{s.name}</span>
              <div className="flex gap-3">
                <span className="text-monsoon-cyan">{s.consensus_blend}mm</span>
                <span className="text-crimson-hazard">{s.consensus_temp}°C</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrustView({ station, allStations }: { station: any; allStations: any[] }) {
  // Sort by highest dominant weight
  const sortedByTrust = [...allStations].sort((a, b) => {
    const wA = Math.max(...Object.values(a.assigned_weights as Record<string, number>));
    const wB = Math.max(...Object.values(b.assigned_weights as Record<string, number>));
    return wB - wA;
  });

  return (
    <div className="space-y-3" style={{ animation: 'af-fadein 0.4s ease both' }}>
      <div className="panel p-4 bg-midnight-slate/50 text-center space-y-2">
        <Shield className="w-6 h-6 text-neural-emerald mx-auto" />
        <h3 className="text-sm font-bold text-slate-100">Trust Map Analysis</h3>
        <p className="text-xs text-slate-400">Highlights the dominant model family (Physics vs. AI vs. Ensemble) providing the highest weight per region.</p>
      </div>

      {station && (
        <div className="panel p-3 bg-midnight-slate/50 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Station Trust Profile: {station.name}</div>
          <div className="flex justify-between items-center text-xs p-2 bg-obsidian rounded border border-slate-border">
            <span className="text-slate-400">Dominant Family</span>
            <span className="font-bold text-neural-emerald">{station.dominant_family}</span>
          </div>
          <div className="flex justify-between items-center text-xs p-2 bg-obsidian rounded border border-slate-border">
            <span className="text-slate-400">Dominant Model</span>
            <span className="font-bold text-slate-200">{station.dominant_model}</span>
          </div>
          <div className="flex justify-between items-center text-xs p-2 bg-obsidian rounded border border-slate-border">
            <span className="text-slate-400">Model Weight</span>
            <span className="font-bold text-monsoon-cyan">
               {Math.round(Math.max(...Object.values(station.assigned_weights as Record<string, number>)) * 100)}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 p-2 bg-monsoon-cyan/5 border border-monsoon-cyan/20 rounded">
            {station.shap_explanation || "AI weights heavily influenced by recent local error gradients."}
          </div>
        </div>
      )}

      <div className="panel p-3 bg-midnight-slate/50">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Stations by Model Confidence</div>
        <div className="space-y-1">
          {sortedByTrust.map((s) => {
            const maxWeight = Math.max(...Object.values(s.assigned_weights as Record<string, number>));
            return (
              <div 
                key={s.id} 
                onClick={() => useWeatherStore.getState().selectStation(s.id)}
                className="flex items-center justify-between p-2 rounded text-xs bg-obsidian border border-slate-border cursor-pointer hover:bg-slate-800 transition-colors">
                <div className="flex flex-col">
                   <span className="text-slate-300 font-semibold">{s.name}</span>
                   <span className="text-[9px] text-slate-500">{s.dominant_model} ({Math.round(maxWeight * 100)}%)</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${s.dominant_family === 'Physics' ? 'bg-atlantic-blue/10 text-atlantic-blue' : s.dominant_family === 'AI' ? 'bg-neural-emerald/10 text-neural-emerald' : 'bg-quantum-violet/10 text-quantum-violet'}`}>
                  {s.dominant_family}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DisagreementView({ station, allStations }: { station: any; allStations: any[] }) {
  const sortedByDisagreement = [...allStations].sort((a, b) => b.disagreement_index - a.disagreement_index);

  return (
    <div className="space-y-3" style={{ animation: 'af-fadein 0.4s ease both' }}>
      <div className="panel p-4 bg-midnight-slate/50 text-center space-y-2">
        <BarChart3 className="w-6 h-6 text-amber-alert mx-auto" />
        <h3 className="text-sm font-bold text-slate-100">Model Disagreement Spread</h3>
        <p className="text-xs text-slate-400">Visualizes regions where NWP and AI models diverge significantly, indicating higher forecast uncertainty.</p>
      </div>

      <div className="panel p-3 bg-midnight-slate/50">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Highest Uncertainty Regions</div>
        <div className="space-y-1">
          {sortedByDisagreement.map((s) => (
            <div 
              key={s.id} 
              onClick={() => useWeatherStore.getState().selectStation(s.id)}
              className={`flex items-center justify-between p-2 rounded text-xs border cursor-pointer hover:bg-slate-800 transition-colors ${station?.id === s.id ? 'bg-amber-alert/10 border-amber-alert/40' : 'bg-obsidian border-slate-border'}`}>
              <span className="font-semibold text-slate-200">{s.name}</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${s.disagreement_index > 50 ? 'text-crimson-hazard' : s.disagreement_index > 20 ? 'text-amber-alert' : 'text-neural-emerald'}`}>
                  {s.disagreement_index} mm spread
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskView({ station, allStations }: { station: any; allStations: any[] }) {
  const sortedByRisk = [...allStations].sort((a, b) => b.worst_case_90th - a.worst_case_90th);

  return (
    <div className="space-y-3" style={{ animation: 'af-fadein 0.4s ease both' }}>
      <div className="panel p-4 bg-midnight-slate/50 text-center space-y-2">
        <AlertTriangle className="w-6 h-6 text-crimson-hazard mx-auto" />
        <h3 className="text-sm font-bold text-slate-100">90th Percentile Risk</h3>
        <p className="text-xs text-slate-400">Identifies the blend's 90th percentile to show the plausible extreme upper bound (used for extreme event preparedness).</p>
      </div>

      <div className="panel p-3 bg-midnight-slate/50">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Severe Risk Zones (90th Pctl)</div>
        <div className="space-y-1">
          {sortedByRisk.map((s) => (
            <div 
              key={s.id} 
              onClick={() => useWeatherStore.getState().selectStation(s.id)}
              className={`flex items-center justify-between p-2 rounded text-xs border cursor-pointer hover:bg-slate-800 transition-colors ${station?.id === s.id ? 'bg-crimson-hazard/10 border-crimson-hazard/40' : 'bg-obsidian border-slate-border'}`}>
              <span className="font-semibold text-slate-200">{s.name}</span>
              <div className="flex items-center gap-2">
                {s.active_alert && <span className="w-1.5 h-1.5 rounded-full bg-crimson-hazard animate-pulse" />}
                <span className="font-mono text-crimson-hazard font-bold">
                  {s.worst_case_90th} mm
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoverageView({ station, allStations }: { station: any; allStations: any[] }) {
  return (
    <div className="space-y-4 pt-1" style={{ animation: 'af-fadein 0.4s ease both' }}>
      <div className="panel p-4 bg-midnight-slate/50 text-center space-y-2">
        <Eye className="w-6 h-6 text-quantum-violet mx-auto" />
        <h3 className="text-sm font-bold text-slate-100">Voronoi Representativeness</h3>
        <p className="text-xs text-slate-400">The map shows Thiessen (Voronoi) polygons representing the area of influence for each AWS gauge. It indicates spatial gaps in the observational network.</p>
      </div>

      <div className="panel p-3 bg-midnight-slate/50">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Station Network List</div>
        <div className="space-y-1">
          {allStations.map((s) => (
            <div 
              key={s.id} 
              onClick={() => useWeatherStore.getState().selectStation(s.id)}
              className={`flex items-center justify-between p-2 rounded text-xs border cursor-pointer hover:bg-slate-800 transition-colors ${station?.id === s.id ? 'bg-quantum-violet/20 border-quantum-violet/50' : 'bg-obsidian border-slate-border'}`}>
              <div className="flex items-center gap-2">
                <MapPin className={`w-3.5 h-3.5 ${station?.id === s.id ? 'text-quantum-violet' : 'text-slate-400'}`} />
                <span className="font-semibold text-slate-200">{s.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Main Drawer Component                                       */
/* ─────────────────────────────────────────────────────────── */

export default function AnalyticsDrawer() {
  const { selectedStation, forecast, layerMode } = useWeatherStore();
  const allStations = forecast?.stations || [];

  const renderContent = () => {
    switch (layerMode) {
      case "consensus":
        return <ConsensusView station={selectedStation} allStations={allStations} />;
      case "trust":
        return <TrustView station={selectedStation} allStations={allStations} />;
      case "disagreement":
        return <DisagreementView station={selectedStation} allStations={allStations} />;
      case "risk":
        return <RiskView station={selectedStation} allStations={allStations} />;
      case "coverage":
        return <CoverageView station={selectedStation} allStations={allStations} />;
      default:
        return null;
    }
  };

  const getLayerTitle = () => {
    switch (layerMode) {
      case "consensus": return { icon: <Target className="w-4 h-4 text-monsoon-cyan" />, title: "Consensus Overview" };
      case "trust": return { icon: <Shield className="w-4 h-4 text-neural-emerald" />, title: "Trust Map Analysis" };
      case "disagreement": return { icon: <BarChart3 className="w-4 h-4 text-amber-alert" />, title: "Disagreement Matrix" };
      case "risk": return { icon: <AlertTriangle className="w-4 h-4 text-crimson-hazard" />, title: "Risk Assessment" };
      case "coverage": return { icon: <Eye className="w-4 h-4 text-quantum-violet" />, title: "Coverage Topology" };
      default: return { icon: <Layers className="w-4 h-4" />, title: "Layer Analytics" };
    }
  };

  const headerInfo = getLayerTitle();

  return (
    <div className="w-[380px] flex-shrink-0 bg-obsidian border-l border-slate-border flex flex-col overflow-hidden drawer-right">
      {/* Panel Header */}
      <div className="panel-header flex-shrink-0 bg-midnight-slate/50">
        {headerInfo.icon}
        {headerInfo.title}
      </div>

      <div className="flex-1 overflow-y-auto p-3" key={layerMode}>
        {renderContent()}
      </div>
    </div>
  );
}
