import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWeatherStore } from "./store/useWeatherStore";
import Layout from "./components/layout/Layout";
import { API } from "./types/weather";

export default function App() {
  const { setForecast, selectStation } = useWeatherStore();

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

  // Process the forecast once when it arrives (coverage cells are heavy geometry). Switching stations must not
  // re-run this, or every switch would rebuild every station and stall a frame.
  useEffect(() => {
    if (!data) return;
    setForecast(data);
    if (!useWeatherStore.getState().selectedStationId && data.stations.length > 0) {
      selectStation(data.stations[0].id);
    }
  }, [data, setForecast, selectStation]);

  useEffect(() => {
    if (scorecardData) useWeatherStore.getState().setScorecard(scorecardData);
  }, [scorecardData]);

  if (isLoading || error) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div role="status" className="rounded-card border border-rule bg-paper shadow-card px-8 py-7 w-full max-w-[340px] text-center animate-rise">
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
