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
        <main className="flex-1 flex flex-col min-w-0 bg-paper2 p-4 gap-4">
          <div className="card flex-1 min-h-0 relative overflow-clip">
            <MainMap />
          </div>
          <ScorecardTray />
        </main>
        <AnalyticsDrawer />
      </div>
    </>
  );
}
