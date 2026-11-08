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

  if (isLoading || error) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted">
        {error ? "Could not reach the forecast API on localhost:8000." : "Loading forecast…"}
      </div>
    );
  }

  return <Layout />;
}
