import { Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
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

export function SettingsPreferencesPanel() {
  const baseId = useId();
  const { settings, updateSettings } = useBeaconAppSettings();

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
    </section>
  );
}
