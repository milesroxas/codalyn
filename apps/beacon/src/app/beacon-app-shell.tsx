import { Outlet } from "react-router-dom";
import Header from "@/app/ui/Header";
import { BeaconUsageApproachingBanner } from "@/features/billing/ui/beacon-usage-approaching-banner";
import { beaconAppRouteSurfaceClass } from "@/shared/lib/beacon-app-route-surface";
import { buildInfo } from "@/shared/lib/build-info";

export function BeaconAppShell() {
  return (
    <main className={beaconAppRouteSurfaceClass} data-version={buildInfo.version}>
      <Header />
      <div className={beaconAppRouteSurfaceClass}>
        <BeaconUsageApproachingBanner />
        <Outlet />
      </div>
    </main>
  );
}
