import { BEACON_BUILTIN_ASPECT_PRESETS, type BeaconImagePresetRow, type ImageExportFormat } from "@codalyn/webflow-kit";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { parseOutputDimension } from "@/features/image-editor/lib/apply-cropped-export";
import { type AspectPreset, aspectLabels } from "@/features/image-editor/lib/aspect-preset";
import { resolvePresetExportFormat, resolvePresetExportQuality } from "@/features/image-editor/lib/export-preset";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

function PresetRowFields(props: {
  baseId: string;
  preset: BeaconImagePresetRow;
  defaultFormat: ImageExportFormat;
  defaultQuality: number;
  isTowerUser: boolean;
  onUpdate: (
    patch: Partial<Pick<BeaconImagePresetRow, "name" | "width" | "height" | "exportFormat" | "exportQuality">>
  ) => void;
  onRemove: () => void;
}) {
  const { baseId, preset: p, defaultFormat, defaultQuality, isTowerUser, onUpdate, onRemove } = props;
  const [nameDraft, setNameDraft] = useState(p.name);
  const [wStr, setWStr] = useState(String(p.width));
  const [hStr, setHStr] = useState(String(p.height));

  const resolvedFormat = resolvePresetExportFormat(p, {
    exportFormat: defaultFormat,
    exportQuality: defaultQuality,
  });
  const resolvedQuality = resolvePresetExportQuality(p, {
    exportFormat: defaultFormat,
    exportQuality: defaultQuality,
  });

  useEffect(() => {
    setNameDraft(p.name);
    setWStr(String(p.width));
    setHStr(String(p.height));
  }, [p.name, p.width, p.height]);

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background p-2.5">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label className="text-[11px] text-muted-foreground" htmlFor={`${baseId}-name-${p.id}`}>
          Name
        </Label>
        <Input
          id={`${baseId}-name-${p.id}`}
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            const t = nameDraft.trim();
            const next = t || "Untitled";
            if (next !== p.name) {
              onUpdate({ name: next });
            } else if (!t) {
              setNameDraft(next);
            }
          }}
          className="h-8 text-xs"
        />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1.5 sm:max-w-52">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground" htmlFor={`${baseId}-w-${p.id}`}>
            Width
          </Label>
          <Input
            id={`${baseId}-w-${p.id}`}
            inputMode="numeric"
            type="text"
            className="h-8 text-xs tabular-nums"
            value={wStr}
            onChange={(e) => setWStr(e.target.value)}
            onBlur={() => {
              const n = parseOutputDimension(wStr, p.width);
              setWStr(String(n));
              if (n !== p.width) {
                onUpdate({ width: n });
              }
            }}
          />
        </div>
        <span className="pb-2 text-center text-xs text-muted-foreground tabular-nums" aria-hidden>
          ×
        </span>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground" htmlFor={`${baseId}-h-${p.id}`}>
            Height
          </Label>
          <Input
            id={`${baseId}-h-${p.id}`}
            inputMode="numeric"
            type="text"
            className="h-8 text-xs tabular-nums"
            value={hStr}
            onChange={(e) => setHStr(e.target.value)}
            onBlur={() => {
              const n = parseOutputDimension(hStr, p.height);
              setHStr(String(n));
              if (n !== p.height) {
                onUpdate({ height: n });
              }
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-[11px]">Format</span>
        <ToggleGroup
          type="single"
          value={resolvedFormat}
          onValueChange={(v) => {
            if (v === "webp" || v === "avif") {
              if (v === "avif" && !isTowerUser) {
                return;
              }
              onUpdate({ exportFormat: v });
            }
          }}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <ToggleGroupItem value="webp" className="flex-1">
            WebP
          </ToggleGroupItem>
          <ToggleGroupItem value="avif" className="flex-1" disabled={!isTowerUser}>
            AVIF
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-muted-foreground text-[11px]" htmlFor={`${baseId}-q-${p.id}`}>
          Quality
        </Label>
        <Slider
          id={`${baseId}-q-${p.id}`}
          min={0.05}
          max={1}
          step={0.01}
          value={[resolvedQuality]}
          onValueChange={(vals) => {
            const q = vals[0];
            if (typeof q === "number") {
              onUpdate({ exportQuality: q });
            }
          }}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive h-8 w-8"
          aria-label={`Remove ${p.name}`}
          onClick={onRemove}
        >
          <Trash2 aria-hidden className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}

export function SettingsPresetsPanel() {
  const baseId = useId();
  const { settings, updateSettings, isTowerUser } = useBeaconAppSettings();
  const [draftName, setDraftName] = useState("");
  const [draftW, setDraftW] = useState("1920");
  const [draftH, setDraftH] = useState("1080");
  const [draftFormat, setDraftFormat] = useState<ImageExportFormat>(settings.defaultExportFormat);
  const [draftQuality, setDraftQuality] = useState(settings.defaultExportQuality);

  useEffect(() => {
    setDraftFormat(settings.defaultExportFormat);
  }, [settings.defaultExportFormat]);

  const hiddenSet = useMemo(() => new Set(settings.hiddenBuiltinAspectPresets), [settings.hiddenBuiltinAspectPresets]);
  const canRemoveBuiltin = useMemo(() => {
    const n = BEACON_BUILTIN_ASPECT_PRESETS.filter((a) => !hiddenSet.has(a)).length;
    return n > 1;
  }, [hiddenSet]);
  const hasHidden = BEACON_BUILTIN_ASPECT_PRESETS.some((a) => hiddenSet.has(a));

  const hideBuiltin = (aspect: AspectPreset) => {
    if (!canRemoveBuiltin || hiddenSet.has(aspect)) {
      return;
    }
    updateSettings({
      hiddenBuiltinAspectPresets: [...settings.hiddenBuiltinAspectPresets, aspect],
    });
  };

  const showBuiltin = (aspect: AspectPreset) => {
    updateSettings({
      hiddenBuiltinAspectPresets: settings.hiddenBuiltinAspectPresets.filter((a) => a !== aspect),
    });
  };

  const addPreset = () => {
    const name = draftName.trim();
    if (!name) {
      return;
    }
    const w = parseOutputDimension(draftW, 1920);
    const h = parseOutputDimension(draftH, 1080);
    let fmt = draftFormat;
    if (!isTowerUser && fmt === "avif") {
      fmt = "webp";
    }
    const row: BeaconImagePresetRow = {
      id: crypto.randomUUID(),
      name,
      width: w,
      height: h,
      exportFormat: fmt,
      exportQuality: draftQuality,
    };
    updateSettings({ imagePresets: [...settings.imagePresets, row] });
    setDraftName("");
    setDraftW(String(w));
    setDraftH(String(h));
  };

  const removePreset = (id: string) => {
    updateSettings({ imagePresets: settings.imagePresets.filter((p) => p.id !== id) });
  };

  const updatePreset = (
    id: string,
    patch: Partial<Pick<BeaconImagePresetRow, "name" | "width" | "height" | "exportFormat" | "exportQuality">>
  ) => {
    updateSettings({
      imagePresets: settings.imagePresets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const tileClass =
    "relative flex min-h-[2.75rem] flex-col items-center justify-center rounded-md border px-1.5 py-2 text-center";

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">Crop aspect shortcuts</h2>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Buttons in the editor crop step. They only set the crop mask—not pixel dimensions or compression.
          </p>
        </div>
        <div>
          <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wide">Visible</p>
          <div className="grid grid-cols-3 gap-1.5">
            {BEACON_BUILTIN_ASPECT_PRESETS.map((aspect) => {
              if (hiddenSet.has(aspect)) {
                return null;
              }
              return (
                <div key={aspect} className={cn(tileClass, "border-border/70 bg-muted/25")}>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive absolute right-0 top-0 h-7 w-7"
                    aria-label={`Hide ${aspectLabels[aspect]}`}
                    disabled={!canRemoveBuiltin}
                    title={!canRemoveBuiltin ? "Keep at least one visible" : undefined}
                    onClick={() => hideBuiltin(aspect)}
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </Button>
                  <span className="text-xs font-semibold leading-none">{aspectLabels[aspect]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {hasHidden ? (
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wide">Hidden</p>
            <div className="grid grid-cols-3 gap-1.5">
              {BEACON_BUILTIN_ASPECT_PRESETS.map((aspect) => {
                if (!hiddenSet.has(aspect)) {
                  return null;
                }
                return (
                  <button
                    key={aspect}
                    type="button"
                    onClick={() => showBuiltin(aspect)}
                    className={cn(
                      tileClass,
                      "border-border/50 bg-muted/10 text-muted-foreground hover:bg-muted/25 hover:text-foreground transition-colors"
                    )}
                  >
                    <Plus aria-hidden className="mb-0.5 size-3.5 opacity-70" />
                    <span className="text-[11px] font-medium leading-tight">{aspectLabels[aspect]}</span>
                    <span className="sr-only">Show {aspectLabels[aspect]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">Saved export presets</h2>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            One-tap targets in the editor: pick one at the start of the crop step (before you frame the shot). Applying
            a preset sets pixels, format, and quality, and switches crop to Custom so the frame matches width and
            height.
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/15 p-3">
          <p className="text-muted-foreground mb-3 text-[10px] font-medium uppercase tracking-wide">New preset</p>
          <div className="flex flex-col gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-[11px] text-muted-foreground" htmlFor={`${baseId}-new-name`}>
                Name
              </Label>
              <Input
                id={`${baseId}-new-name`}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="h-9 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPreset();
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground" htmlFor={`${baseId}-new-w`}>
                  Width
                </Label>
                <Input
                  id={`${baseId}-new-w`}
                  inputMode="numeric"
                  type="text"
                  className="h-9 text-xs tabular-nums"
                  value={draftW}
                  onChange={(e) => setDraftW(e.target.value)}
                  onBlur={() => setDraftW(String(parseOutputDimension(draftW, 1920)))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground" htmlFor={`${baseId}-new-h`}>
                  Height
                </Label>
                <Input
                  id={`${baseId}-new-h`}
                  inputMode="numeric"
                  type="text"
                  className="h-9 text-xs tabular-nums"
                  value={draftH}
                  onChange={(e) => setDraftH(e.target.value)}
                  onBlur={() => setDraftH(String(parseOutputDimension(draftH, 1080)))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-[11px]">Format</span>
              <ToggleGroup
                type="single"
                value={draftFormat}
                onValueChange={(v) => {
                  if (v === "webp" || v === "avif") {
                    if (v === "avif" && !isTowerUser) {
                      return;
                    }
                    setDraftFormat(v);
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full sm:max-w-xs"
              >
                <ToggleGroupItem value="webp" className="flex-1">
                  WebP
                </ToggleGroupItem>
                <ToggleGroupItem value="avif" className="flex-1" disabled={!isTowerUser}>
                  AVIF
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex flex-col gap-2 sm:max-w-xs">
              <Label className="text-muted-foreground text-[11px]" htmlFor={`${baseId}-new-q`}>
                Quality
              </Label>
              <Slider
                id={`${baseId}-new-q`}
                min={0.05}
                max={1}
                step={0.01}
                value={[draftQuality]}
                onValueChange={(vals) => {
                  const q = vals[0];
                  if (typeof q === "number") {
                    setDraftQuality(q);
                  }
                }}
              />
            </div>
            <Button
              type="button"
              className="h-9 w-full shrink-0 sm:w-auto sm:self-start"
              variant="secondary"
              onClick={addPreset}
            >
              Save preset
            </Button>
          </div>
        </div>

        {settings.imagePresets.length === 0 ? (
          <p className="text-muted-foreground text-center text-[11px]">No saved export presets yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {settings.imagePresets.map((p) => (
              <PresetRowFields
                key={p.id}
                baseId={baseId}
                preset={p}
                defaultFormat={settings.defaultExportFormat}
                defaultQuality={settings.defaultExportQuality}
                isTowerUser={isTowerUser}
                onUpdate={(patch) => updatePreset(p.id, patch)}
                onRemove={() => removePreset(p.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
