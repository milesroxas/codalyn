import { ArrowLeft } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { HeaderLogo } from "@/app/ui/Header";
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

function SettingsSectionBody({ section }: { section: SettingsSectionId }) {
  const Comp = section === "presets" ? LazyPresets : section === "preferences" ? LazyPreferences : LazyAccount;
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
  const [section, setSection] = useState<SettingsSectionId>(initialSection);
  const { isTowerUser } = useBeaconAppSettings();

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
        <SettingsSectionNav value={section} onValueChange={setSection} />
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 pt-3">
        {!isTowerUser ? <GuestSettingsUpsell /> : null}
        <SettingsSectionBody section={section} />
      </div>
    </div>
  );
}
