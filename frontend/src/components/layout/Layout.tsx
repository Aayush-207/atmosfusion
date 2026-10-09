import Header from "./Header";
import MainMap from "../map/MainMap";
import WeightEngineDrawer from "../inspector/WeightEngineDrawer";
import AnalyticsDrawer from "../analytics/AnalyticsDrawer";

import ScorecardTray from "../scorecard/ScorecardTray";

export default function Layout() {
  return (
    <>
      <Header />
      <div className="flex-1 flex overflow-hidden" style={{ animation: 'af-fadein 0.5s ease 0.1s both' }}>
        {/* Left Drawer */}
        <WeightEngineDrawer />

        {/* Center Content */}
        <main className="flex-1 flex flex-col relative bg-obsidian h-full">
          <div className="flex-1 relative">
            <MainMap />
          </div>
          <ScorecardTray />
        </main>

        {/* Right Drawer */}
        <AnalyticsDrawer />
      </div>
    </>
  );
}
