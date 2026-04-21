import { ArrowLeft } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { HeaderLogo } from "@/app/ui/Header";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { GuestSettingsUpsell } from "@/features/settings/ui/guest-settings-upsell";
import { SettingsPanelSkeleton } from "@/features/settings/ui/settings-panel-skeleton";
import {
  DEFAULT_SETTINGS_SECTION,
  type SettingsSectionId,
  SettingsSectionNav,
} from "@/features/settings/ui/settings-section-nav";
import { Button } from "@/shared/ui/button";

const LazyPresets = lazy(() =>
  import("@/features/settings/ui/settings-presets-panel").then((m) => ({ default: m.SettingsPresetsPanel }))
);
const LazyPreferences = lazy(() =>
  import("@/features/settings/ui/settings-preferences-panel").then((m) => ({ default: m.SettingsPreferencesPanel }))
);
const LazyAccount = lazy(() =>
  import("@/features/settings/ui/settings-account-panel").then((m) => ({ default: m.SettingsAccountPanel }))
);

function SettingsSectionBody({
  section,
  allowPresetsPanel,
}: {
  section: SettingsSectionId;
  allowPresetsPanel: boolean;
}) {
  const effectiveSection: SettingsSectionId = !allowPresetsPanel && section === "presets" ? "preferences" : section;
  const Comp =
    effectiveSection === "presets" ? LazyPresets : effectiveSection === "preferences" ? LazyPreferences : LazyAccount;
  return (
    <Suspense fallback={<SettingsPanelSkeleton />}>
      <Comp />
    </Suspense>
  );
}

export type BeaconSettingsScreenProps = {
  onBack: () => void;
  initialSection?: SettingsSectionId;
};

export function BeaconSettingsScreen(props: BeaconSettingsScreenProps) {
  const { onBack, initialSection = DEFAULT_SETTINGS_SECTION } = props;
  const { isTowerUser, editorExperience } = useBeaconAppSettings();
  const { user: towerUser, isPending: towerSessionPending } = useBeaconTowerSession();
  /** Presets require Tower; while a session token is resolving, keep Export available to avoid flicker for signed-in users. */
  const allowPresetsSection = (Boolean(towerUser?.id) || towerSessionPending) && !editorExperience;

  const [section, setSection] = useState<SettingsSectionId>(() => {
    const guestForPresets = !towerUser && !towerSessionPending;
    return guestForPresets && initialSection === "presets" ? "preferences" : initialSection;
  });

  useEffect(() => {
    if (!allowPresetsSection && section === "presets") {
      setSection("preferences");
    }
  }, [allowPresetsSection, section]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="supports-backdrop-filter:bg-background/75 relative border-b border-border/70 bg-background/90 px-3 pt-2 pb-0 backdrop-blur">
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <Button type="button" size="icon-sm" variant="ghost" onClick={onBack} aria-label="Back to editor">
              <ArrowLeft aria-hidden className="size-4" />
            </Button>
            <h1 className="m-0 truncate text-base font-medium leading-none">Settings</h1>
          </div>
          <div className="flex shrink-0 justify-center px-2">
            <HeaderLogo asHeading={false} />
          </div>
          <div className="min-w-0" aria-hidden />
        </div>
        <SettingsSectionNav value={section} onValueChange={setSection} showPresetsSection={allowPresetsSection} />
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 pt-3">
        {!isTowerUser && section !== "account" ? <GuestSettingsUpsell /> : null}
        <SettingsSectionBody section={section} allowPresetsPanel={allowPresetsSection} />
      </div>
    </div>
  );
}
