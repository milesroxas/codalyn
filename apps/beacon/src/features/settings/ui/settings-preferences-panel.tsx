import { Monitor, Moon, Sun } from "lucide-react";
import { useId, useState } from "react";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { readTelemetryOptOut, setTelemetryOptOut } from "@/shared/lib/telemetry-preference";
import { Label } from "@/shared/ui/label";
import {
  RadioGroupTileGrid,
  RadioGroupTileOption,
  RadioGroupTileOptionControl,
  RadioGroupTileOptionCopy,
  RadioGroupTileOptionDescription,
  RadioGroupTileOptionIcon,
  RadioGroupTileOptionTitle,
} from "@/shared/ui/radio-group";
import { SurfaceSummaryCardPageIntro } from "@/shared/ui/surface-summary-card";
import { Switch } from "@/shared/ui/switch";

export function SettingsPreferencesPanel() {
  const baseId = useId();
  const { settings, updateSettings } = useBeaconAppSettings();
  const [telemetryEnabled, setTelemetryEnabled] = useState(() => !readTelemetryOptOut());

  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <SurfaceSummaryCardPageIntro title="Appearance" />
      <RadioGroupTileGrid
        value={settings.theme}
        onValueChange={(value) => {
          if (value === "light" || value === "dark" || value === "system") {
            updateSettings({ theme: value });
          }
        }}
      >
        <RadioGroupTileOption htmlFor={`${baseId}-theme-light`}>
          <RadioGroupTileOptionControl value="light" id={`${baseId}-theme-light`} />
          <RadioGroupTileOptionIcon>
            <Sun aria-hidden />
          </RadioGroupTileOptionIcon>
          <RadioGroupTileOptionCopy>
            <RadioGroupTileOptionTitle>Light</RadioGroupTileOptionTitle>
            <RadioGroupTileOptionDescription>Bright interface</RadioGroupTileOptionDescription>
          </RadioGroupTileOptionCopy>
        </RadioGroupTileOption>
        <RadioGroupTileOption htmlFor={`${baseId}-theme-dark`}>
          <RadioGroupTileOptionControl value="dark" id={`${baseId}-theme-dark`} />
          <RadioGroupTileOptionIcon>
            <Moon aria-hidden />
          </RadioGroupTileOptionIcon>
          <RadioGroupTileOptionCopy>
            <RadioGroupTileOptionTitle>Dark</RadioGroupTileOptionTitle>
            <RadioGroupTileOptionDescription>Low light</RadioGroupTileOptionDescription>
          </RadioGroupTileOptionCopy>
        </RadioGroupTileOption>
        <RadioGroupTileOption htmlFor={`${baseId}-theme-system`}>
          <RadioGroupTileOptionControl value="system" id={`${baseId}-theme-system`} />
          <RadioGroupTileOptionIcon>
            <Monitor aria-hidden />
          </RadioGroupTileOptionIcon>
          <RadioGroupTileOptionCopy>
            <RadioGroupTileOptionTitle>System</RadioGroupTileOptionTitle>
            <RadioGroupTileOptionDescription>Match device</RadioGroupTileOptionDescription>
          </RadioGroupTileOptionCopy>
        </RadioGroupTileOption>
      </RadioGroupTileGrid>
      <div className="mt-4 flex min-w-0 flex-col gap-1.5">
        <SurfaceSummaryCardPageIntro
          title="Privacy"
          description="Beacon collects anonymous operational telemetry to fix errors and improve features: error reports, feature-usage events, app version, and the current Webflow site and workspace IDs. No session recording, no autocapture, and no page or design content is ever collected."
        />
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${baseId}-telemetry`}>Share usage &amp; error telemetry</Label>
          <Switch
            id={`${baseId}-telemetry`}
            checked={telemetryEnabled}
            onCheckedChange={(checked) => {
              setTelemetryEnabled(checked);
              setTelemetryOptOut(!checked);
            }}
          />
        </div>
      </div>
    </section>
  );
}
