import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWeatherStore } from "./store/useWeatherStore";
import Layout from "./components/layout/Layout";

export default function App() {
  const { setForecast, selectStation, selectedStationId } = useWeatherStore();
  const leadDay = useWeatherStore(s => s.leadDay);

  const { data, isLoading, error } = useQuery({
    queryKey: ["forecast", "pune", leadDay],
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/api/v1/regions/pune/forecast?lead_day=${leadDay}`);
      if (!res.ok) throw new Error("Failed to fetch forecast");
      return res.json();
    }
  });

  const { data: scorecardData } = useQuery({
    queryKey: ["scorecard"],
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/api/v1/scorecard`);
      if (!res.ok) throw new Error("Failed to fetch scorecard");
      return res.json();
    }
  });

  useEffect(() => {
    if (data) {
      setForecast(data);
      if (!selectedStationId && data.stations.length > 0) {
        selectStation(data.stations[0].id);
      }
    }
    if (scorecardData) {
      useWeatherStore.getState().setScorecard(scorecardData);
    }
  }, [data, scorecardData, setForecast, selectStation, selectedStationId]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-obsidian text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-monsoon-cyan border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading Forecast Data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-obsidian text-crimson-hazard">
        <div className="panel p-6 text-center space-y-2 border-crimson-hazard/30 bg-crimson-hazard/10">
          <h2 className="font-bold text-lg">Failed to load forecast</h2>
          <p className="text-sm text-slate-400">Ensure the backend API is running on localhost:8000</p>
        </div>
      </div>
    );
  }

  return <Layout />;
}
