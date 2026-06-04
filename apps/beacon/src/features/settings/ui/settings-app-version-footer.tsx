import { BeaconFeatureRouteFooter } from "@/app/ui/beacon-feature-route-chrome";
import { beaconPanelContainClass } from "@/shared/lib/beacon-app-route-surface";
import { getBeaconAppVersionDisplay } from "@/shared/lib/build-info";
import { cn } from "@/shared/lib/utils";

const settingsAppVersionPrimaryClass = "text-[10px] leading-snug text-muted-foreground/70";
const settingsAppVersionSecondaryClass = "text-[10px] leading-snug text-muted-foreground/55";

/** Pinned to the extension viewport bottom on settings routes (not in scroll content). */
export function SettingsAppVersionFooter() {
  const { primary, secondary } = getBeaconAppVersionDisplay();

  return (
    <BeaconFeatureRouteFooter dataSlot="settings_app_version_footer">
      <div className={cn(beaconPanelContainClass, "w-full py-1 text-center")}>
        <p className={settingsAppVersionPrimaryClass}>{primary}</p>
        {secondary ? <p className={settingsAppVersionSecondaryClass}>{secondary}</p> : null}
      </div>
    </BeaconFeatureRouteFooter>
  );
}
