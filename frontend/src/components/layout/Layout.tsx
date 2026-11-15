import Header from "./Header";
import MainMap from "../map/MainMap";
import WeightEngineDrawer from "../inspector/WeightEngineDrawer";
import AnalyticsDrawer from "../analytics/AnalyticsDrawer";
import ScorecardTray from "../scorecard/ScorecardTray";

export default function Layout() {
  return (
    <>
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <WeightEngineDrawer />
        {/* The map fills the middle edge to edge; the scorecard floats over its foot */}
        <main className="flex-1 min-w-0 relative overflow-hidden">
          <MainMap />
          <div className="absolute inset-x-3 bottom-3 z-[20]">
            <ScorecardTray />
          </div>
        </main>
        <AnalyticsDrawer />
      </div>
    </>
  );
}
