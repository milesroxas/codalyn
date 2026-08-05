import { useEffect } from "react";

let loggedMissingTowerOrigin = false;

/** Shown when this build has no Tower origin — shared by account settings, route gates, etc. */
export function BeaconTowerNotConfiguredNotice() {
  useEffect(() => {
    if (loggedMissingTowerOrigin) {
      return;
    }
    loggedMissingTowerOrigin = true;
    console.warn("[beacon] No Codalyn service origin in this build — account features are disabled.");
  }, []);

  return (
    <p className="text-muted-foreground text-sm">
      Account features aren&rsquo;t available in this version of Beacon. Update or reinstall the app from the Webflow
      Marketplace, then try again. If it keeps happening, contact support.
    </p>
  );
}
