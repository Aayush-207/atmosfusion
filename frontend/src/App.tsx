import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWeatherStore } from "./store/useWeatherStore";
import Layout from "./components/layout/Layout";
import { API } from "./types/weather";

export default function App() {
  const { setForecast, selectStation, selectedStationId } = useWeatherStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["forecast", "pune"],
    queryFn: async () => {
      const res = await fetch(`${API}/regions/pune/forecast`);
      if (!res.ok) throw new Error("Failed to fetch forecast");
      return res.json();
    }
  });

  const { data: scorecardData } = useQuery({
    queryKey: ["scorecard"],
    queryFn: async () => {
      const res = await fetch(`${API}/scorecard`);
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

  if (isLoading || error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="card shadow-hard px-8 py-7 w-[340px] text-center animate-rise">
          <div className="relative mx-auto w-14 h-10 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`absolute top-0 w-[2px] h-3 rounded-full ${error ? "bg-alert" : "bg-blend"} animate-rain`}
                style={{ left: `${8 + i * 10}px`, animationDelay: `${i * 170}ms` }}
              />
            ))}
          </div>
          <div className="text-xl font-semibold tracking-tight mt-3">
            Atmos<span className="font-normal text-accent">Fusion</span>
          </div>
          <p className={`text-xs mt-1.5 ${error ? "text-alert" : "text-muted"}`}>
            {error ? "Could not reach the forecast API on localhost:8000." : "Blending six models…"}
          </p>
        </div>
      </div>
    );
  }

  return <Layout />;
}
