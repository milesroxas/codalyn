import { Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";
import { type AspectPreset, aspectLabels } from "@/features/image-editor/lib/aspect-preset";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Slider } from "@/shared/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

export function SettingsPreferencesPanel() {
  const baseId = useId();
  const { settings, updateSettings, isTowerUser } = useBeaconAppSettings();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Appearance</h2>
        <RadioGroup
          value={settings.theme}
          onValueChange={(v) => {
            if (v === "light" || v === "dark" || v === "system") {
              updateSettings({ theme: v });
            }
          }}
          className="flex flex-col gap-2"
        >
          <label
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2"
            htmlFor={`${baseId}-theme-light`}
          >
            <RadioGroupItem value="light" id={`${baseId}-theme-light`} />
            <Sun aria-hidden className="size-4 text-muted-foreground" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm leading-none">Light</span>
              <span className="text-muted-foreground text-xs">Bright interface</span>
            </div>
          </label>
          <label
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2"
            htmlFor={`${baseId}-theme-dark`}
          >
            <RadioGroupItem value="dark" id={`${baseId}-theme-dark`} />
            <Moon aria-hidden className="size-4 text-muted-foreground" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm leading-none">Dark</span>
              <span className="text-muted-foreground text-xs">Low light</span>
            </div>
          </label>
          <label
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2"
            htmlFor={`${baseId}-theme-system`}
          >
            <RadioGroupItem value="system" id={`${baseId}-theme-system`} />
            <Monitor aria-hidden className="size-4 text-muted-foreground" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm leading-none">System</span>
              <span className="text-muted-foreground text-xs">Match device</span>
            </div>
          </label>
        </RadioGroup>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Default export</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Starting values for format and quality when you open a new image. Saved export presets live under Presets.
        </p>
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs" id={`${baseId}-format`}>
            Compression type
          </span>
          <ToggleGroup
            type="single"
            value={settings.defaultExportFormat}
            onValueChange={(v) => {
              if (v === "webp" || v === "avif") {
                updateSettings({ defaultExportFormat: v });
              }
            }}
            variant="outline"
            size="sm"
            className="w-full"
            aria-labelledby={`${baseId}-format`}
          >
            <ToggleGroupItem value="webp" className="flex-1">
              WebP
            </ToggleGroupItem>
            <ToggleGroupItem value="avif" className="flex-1" disabled={!isTowerUser}>
              AVIF
            </ToggleGroupItem>
          </ToggleGroup>
          {!isTowerUser ? (
            <p className="text-muted-foreground text-[10px] leading-snug">
              AVIF needs a Tower account. Guests use WebP in the Designer.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground text-xs" htmlFor={`${baseId}-quality`}>
            Quality
          </Label>
          <Slider
            id={`${baseId}-quality`}
            min={0.05}
            max={1}
            step={0.01}
            value={[settings.defaultExportQuality]}
            onValueChange={(v) => {
              const q = v[0];
              if (typeof q === "number") {
                updateSettings({ defaultExportQuality: q });
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground text-xs" htmlFor={`${baseId}-aspect`}>
            Default crop aspect
          </Label>
          <Select
            value={settings.defaultAspectPreset}
            onValueChange={(v) => {
              if (v === "free" || v === "1" || v === "16-9" || v === "4-3" || v === "3-2" || v === "9-16") {
                updateSettings({ defaultAspectPreset: v });
              }
            }}
          >
            <SelectTrigger id={`${baseId}-aspect`} size="full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(aspectLabels) as AspectPreset[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {aspectLabels[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>
    </div>
  );
}
