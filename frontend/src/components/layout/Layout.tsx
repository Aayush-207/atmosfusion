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
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative">
            <MainMap />
          </div>
          <ScorecardTray />
        </main>
        <AnalyticsDrawer />
      </div>
    </>
  );
}
