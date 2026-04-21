import { Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";
import { type AspectPreset, aspectLabels } from "@/features/image-editor/lib/aspect-preset";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { cn } from "@/shared/lib/utils";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";

const themeTileClass =
  "relative flex min-h-0 min-w-0 cursor-pointer flex-col items-center gap-1 rounded-md border border-border/80 bg-muted/20 p-2 pt-5 text-center transition-colors hover:bg-muted/35 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/40 has-[[data-state=checked]]:shadow-sm";

export function SettingsPreferencesPanel() {
  const baseId = useId();
  const { settings, updateSettings } = useBeaconAppSettings();

  return (
    <div className="flex min-w-0 flex-col">
      <section className="flex flex-col gap-1.5 pb-5">
        <h2 className="text-sm font-medium leading-tight">Appearance</h2>
        <RadioGroup
          value={settings.theme}
          onValueChange={(v) => {
            if (v === "light" || v === "dark" || v === "system") {
              updateSettings({ theme: v });
            }
          }}
          className="grid grid-cols-3 gap-1.5"
        >
          <label className={cn(themeTileClass)} htmlFor={`${baseId}-theme-light`}>
            <RadioGroupItem className="absolute top-1.5 right-1.5" value="light" id={`${baseId}-theme-light`} />
            <Sun aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs leading-tight font-medium">Light</span>
              <span className="text-muted-foreground text-xs leading-snug">Bright interface</span>
            </div>
          </label>
          <label className={cn(themeTileClass)} htmlFor={`${baseId}-theme-dark`}>
            <RadioGroupItem className="absolute top-1.5 right-1.5" value="dark" id={`${baseId}-theme-dark`} />
            <Moon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs leading-tight font-medium">Dark</span>
              <span className="text-muted-foreground text-xs leading-snug">Low light</span>
            </div>
          </label>
          <label className={cn(themeTileClass)} htmlFor={`${baseId}-theme-system`}>
            <RadioGroupItem className="absolute top-1.5 right-1.5" value="system" id={`${baseId}-theme-system`} />
            <Monitor aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs leading-tight font-medium">System</span>
              <span className="text-muted-foreground text-xs leading-snug">Match device</span>
            </div>
          </label>
        </RadioGroup>
      </section>

      <Separator />

      <section className="flex flex-col gap-2 py-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium leading-tight">Default crop aspect</h2>
          <Label className="text-muted-foreground text-xs font-normal leading-snug" htmlFor={`${baseId}-aspect`}>
            Aspect ratio preset
          </Label>
        </div>
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
      </section>

      <Separator />

      <section className="flex flex-col gap-2 pt-6">
        <h2 className="text-sm font-medium leading-tight">Image editor</h2>
        <div className="flex min-w-0 items-start gap-2">
          <Checkbox
            id={`${baseId}-limit-crop-zoom`}
            checked={settings.limitCropZoomToNativeResolution}
            onCheckedChange={(v) => updateSettings({ limitCropZoomToNativeResolution: v === true })}
          />
          <div className="min-w-0 grid gap-1 leading-snug">
            <Label className="cursor-pointer font-normal leading-tight" htmlFor={`${baseId}-limit-crop-zoom`}>
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
