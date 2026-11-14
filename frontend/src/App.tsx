import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWeatherStore } from "./store/useWeatherStore";
import Layout from "./components/layout/Layout";
import { API } from "./types/weather";
import ProductDemo from "./components/demo/ProductDemo";

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
      <div className="flex h-screen flex-col items-center justify-center gap-6 px-4 overflow-y-auto">
        {/* While the API is down or warming up, show what the app does instead of a bare card */}
        <div className="w-full max-w-[720px] animate-rise">
          <ProductDemo />
        </div>
        <div role="status" className="rounded-card border border-rule bg-paper shadow-card px-8 py-7 w-full max-w-[340px] text-center animate-rise [animation-delay:120ms]">
          <div className="relative mx-auto w-14 h-10 overflow-hidden" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`absolute top-0 w-[2px] h-3 rounded-full ${error ? "bg-error" : "bg-accent"} animate-rain`}
                style={{ left: `${8 + i * 10}px`, animationDelay: `${i * 170}ms` }}
              />
            ))}
          </div>
          <div className="font-display text-[20px] font-semibold tracking-[-0.028em] text-ink mt-3">AtmosFusion</div>
          <p className={`text-[13px] mt-1.5 ${error ? "text-error" : "text-muted"}`}>
            {error ? "Could not reach the forecast API on localhost:8000." : "Blending six models…"}
          </p>
        </div>
      </div>
    );
  }

  return <Layout />;
}
