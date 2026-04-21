import { Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";
import { type AspectPreset, aspectLabels } from "@/features/image-editor/lib/aspect-preset";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export function SettingsPreferencesPanel() {
  const baseId = useId();
  const { settings, updateSettings } = useBeaconAppSettings();

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
        <h2 className="text-sm font-medium">Default crop aspect</h2>
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground text-xs" htmlFor={`${baseId}-aspect`}>
            Aspect ratio preset
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

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Image editor</h2>
        <div className="flex items-start gap-2">
          <Checkbox
            id={`${baseId}-limit-crop-zoom`}
            checked={settings.limitCropZoomToNativeResolution}
            onCheckedChange={(v) => updateSettings({ limitCropZoomToNativeResolution: v === true })}
          />
          <div className="grid gap-1.5 leading-none">
            <Label className="cursor-pointer font-normal" htmlFor={`${baseId}-limit-crop-zoom`}>
              Cap crop zoom to image resolution
            </Label>
            <p className="text-muted-foreground text-xs leading-snug">
              Stops the crop preview from zooming past about 1:1 pixels so the image does not look upscaled and soft.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
