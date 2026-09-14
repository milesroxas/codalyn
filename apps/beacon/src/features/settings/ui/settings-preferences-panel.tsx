import { Monitor, Moon, Sun } from "lucide-react";
import { useId, useState } from "react";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { AVIF_TOWER_SETTINGS_TOGGLE_LABEL } from "@/shared/lib/avif-tower-consent-copy";
import { CODALYN_PRIVACY_POLICY_URL, CODALYN_TERMS_URL, codalynPolicyLinkProps } from "@/shared/lib/codalyn-links";
import { applyTelemetryConsent } from "@/shared/lib/init-observability";
import { isTelemetryGranted } from "@/shared/lib/telemetry-preference";
import { Button } from "@/shared/ui/button";
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
  const [telemetryEnabled, setTelemetryEnabled] = useState(() => isTelemetryGranted());

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
          description="Telemetry is off unless you enable it. When enabled, Beacon collects anonymous operational telemetry to fix errors and improve features: error reports, feature-usage events, app version and build details, the current Webflow site and workspace identifiers and names, and basic browser and device details (browser, operating system, language, screen size) — processed by PostHog (product analytics and error reporting) on Codalyn's behalf. No session recording, no autocapture, no location, no referrer capture, and telemetry never includes page or design content. Separately from telemetry, AVIF conversion is off by default; when you enable it, choosing the AVIF file type in the image editor sends that image to Codalyn's Tower service over HTTPS for conversion — images are processed in memory and not stored, and no image ever leaves the Designer while it is off. When you are signed in, your Beacon settings — export defaults, crop presets, and the page and collection identifiers and names you have referenced — sync to your Codalyn account."
        />
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${baseId}-telemetry`}>Share usage &amp; error telemetry</Label>
          <Switch
            id={`${baseId}-telemetry`}
            checked={telemetryEnabled}
            onCheckedChange={(checked) => {
              setTelemetryEnabled(checked);
              applyTelemetryConsent(checked ? "granted" : "denied");
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${baseId}-avif-tower`}>{AVIF_TOWER_SETTINGS_TOGGLE_LABEL}</Label>
          <Switch
            id={`${baseId}-avif-tower`}
            checked={settings.avifTowerConsent}
            onCheckedChange={(checked) => {
              void updateSettings({ avifTowerConsent: checked });
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="link" size="2xs" className="px-0">
            <a {...codalynPolicyLinkProps(CODALYN_PRIVACY_POLICY_URL)}>Privacy policy</a>
          </Button>
          <Button asChild variant="link" size="2xs" className="px-0">
            <a {...codalynPolicyLinkProps(CODALYN_TERMS_URL)}>Terms</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
