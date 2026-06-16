import { Outlet } from "react-router-dom";
import Header from "@/app/ui/Header";
import { BeaconSiteLinkGuard } from "@/features/auth/ui/beacon-site-link-gate";
import { BeaconUsageApproachingBanner } from "@/features/billing/ui/beacon-usage-approaching-banner";
import { beaconAppRouteSurfaceClass } from "@/shared/lib/beacon-app-route-surface";
import { buildInfo } from "@/shared/lib/build-info";

export function BeaconAppShell() {
  return (
    <main className={beaconAppRouteSurfaceClass} data-version={buildInfo.version}>
      <Header />
      <div className={beaconAppRouteSurfaceClass}>
        <BeaconUsageApproachingBanner />
        {/* Header stays mounted (sign-out reachable); the gate replaces all route content until the
            current Designer site is authorized in the workspace's Webflow OAuth grant. */}
        <BeaconSiteLinkGuard>
          <Outlet />
        </BeaconSiteLinkGuard>
      </div>
    </main>
  );
}
