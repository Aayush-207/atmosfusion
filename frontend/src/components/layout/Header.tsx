/**
 * AtmosFusion - Top Command Bar
 * System Status, lead day pills, regime status, and export controls.
 */

import { useWeatherStore } from "@/store/useWeatherStore";
import {
  Radar,
  ChevronDown,
  Download,
  Zap,
  Globe,
  Clock,
  CheckCircle2,
  Activity,
  Server
} from "lucide-react";

const LEAD_DAYS = [1, 2, 3, 5, 7, 10];

export default function Header() {
  const {
    leadDay,
    setLeadDay,
  } = useWeatherStore();

  return (
    <header className="flex-shrink-0 h-12 bg-midnight-slate/90 backdrop-blur-md border-b border-slate-border flex items-center justify-between px-4 z-50 header-anim">
      {/* Left: Branding */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-monsoon-cyan/10 radar-glow" />
          <Radar className="w-5 h-5 text-monsoon-cyan relative z-10 animate-radar-sweep" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-100 tracking-tight">
              AtmosFusion
            </span>
            <span className="text-[10px] text-slate-500 hidden lg:inline">
              Hybrid AI-NWP Multi-Model Forecast Blending
            </span>
          </div>
          <span className="text-[9px] text-slate-600 tracking-wide hidden md:block">
            NCMRWF | Ministry of Earth Sciences (MoES) | SIH26081
          </span>
        </div>
      </div>

      {/* Center: System Info + Lead Day */}
      <div className="flex items-center gap-4">
        {/* System Info */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 panel text-[10px] font-semibold tracking-wider uppercase">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Server className="w-3.5 h-3.5 text-monsoon-cyan" />
            Core: <span className="text-monsoon-cyan">Online</span>
          </div>
          <div className="w-px h-3 bg-slate-border" />
          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-neural-emerald" />
            Ingestion: <span className="text-neural-emerald">Live</span>
          </div>
          <div className="w-px h-3 bg-slate-border" />
          <div className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
            Last Sync: <span className="text-slate-300">Just now</span>
          </div>
        </div>

        {/* Lead Day Pills Removed */}
      </div>

      {/* Right: Status & Export */}
      <div className="flex items-center gap-3">
        {/* Regime Status */}
        <div className="hidden xl:flex items-center gap-2 text-[10px]">
          <div className="flex items-center gap-1.5 px-2 py-1 panel">
            <Zap className="w-3 h-3 text-amber-alert" />
            <span className="text-slate-600">Regime:</span>
            <span className="text-amber-alert font-semibold">
              Active Orographic Monsoon
            </span>
            <span className="font-mono text-monsoon-cyan">(94%)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 panel">
            <span className="text-slate-500">0.25° Mesh</span>
            <span className="font-mono text-monsoon-cyan">141x141</span>
            <span className="text-slate-500">Synced</span>
          </div>
        </div>

        {/* Export */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 px-2.5 py-1 panel text-xs text-slate-600 hover:text-monsoon-cyan transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="absolute top-full right-0 mt-1 w-48 panel p-1 hidden group-hover:block z-50">
            {["Export GeoTIFF", "Export NetCDF4", "Export CAP Alert JSON"].map(
              (item) => (
                <button
                  key={item}
                  className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-frosted-slate hover:text-slate-200 rounded-sm transition-colors"
                >
                  {item}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
