import { lazy, Suspense, useState } from "react";
import { BeaconDeferredLoadingFallback } from "@/app/ui/beacon-deferred-loading-fallback";
import {
  getSettingsSection,
  SETTINGS_SCREEN_TITLE,
  type SettingsSectionId,
} from "@/features/settings/lib/settings-sections";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { GuestSettingsUpsell } from "@/features/settings/ui/guest-settings-upsell";
import { SettingsPanelSkeleton } from "@/features/settings/ui/settings-panel-skeleton";
import { SettingsRouteChrome } from "@/features/settings/ui/settings-route-chrome";
import { SettingsSectionMenuList } from "@/features/settings/ui/settings-section-menu-list";

const LazyPreferences = lazy(() =>
  import("@/features/settings/ui/settings-preferences-panel").then((m) => ({ default: m.SettingsPreferencesPanel }))
);
const LazyAccount = lazy(() =>
  import("@/features/settings/ui/settings-account-panel").then((m) => ({ default: m.SettingsAccountPanel }))
);

type SettingsView = "menu" | SettingsSectionId;

function SettingsSectionBody({ section }: { section: SettingsSectionId }) {
  const Comp = section === "preferences" ? LazyPreferences : LazyAccount;
  return (
    <Suspense
      fallback={
        <BeaconDeferredLoadingFallback>
          <SettingsPanelSkeleton />
        </BeaconDeferredLoadingFallback>
      }
    >
      <Comp />
    </Suspense>
  );
}

export type BeaconSettingsScreenProps = {
  onBack: () => void;
  initialSection?: SettingsSectionId;
};

export function BeaconSettingsScreen(props: BeaconSettingsScreenProps) {
  const { onBack, initialSection } = props;
  const { isTowerUser } = useBeaconAppSettings();
  const [view, setView] = useState<SettingsView>(initialSection ?? "menu");

  const isMenu = view === "menu";
  const title = isMenu ? SETTINGS_SCREEN_TITLE : getSettingsSection(view).label;
  const showGuestUpsell = !isTowerUser && view !== "account";

  return (
    <SettingsRouteChrome
      title={title}
      onBack={() => {
        if (isMenu) {
          onBack();
        } else {
          setView("menu");
        }
      }}
      backLabel={isMenu ? "Back" : "Back to settings"}
      scrollResetKey={view}
    >
      {showGuestUpsell ? <GuestSettingsUpsell /> : null}
      {isMenu ? <SettingsSectionMenuList onSelectSection={setView} /> : <SettingsSectionBody section={view} />}
    </SettingsRouteChrome>
  );
}
