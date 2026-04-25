export type AspectPreset = "free" | "1" | "16-9" | "4-3" | "3-2" | "9-16";

/**
 * `unset` — user has not chosen a crop aspect yet (image editor only; not persisted in settings).
 */
export type EditorAspectSelection = AspectPreset | "unset";

export const aspectLabels: Record<AspectPreset, string> = {
  free: "Free",
  "1": "1:1",
  "16-9": "16:9",
  "4-3": "4:3",
  "3-2": "3:2",
  "9-16": "9:16",
};

export function editorAspectLabel(selection: EditorAspectSelection): string {
  if (selection === "unset") {
    return "—";
  }
  return aspectLabels[selection];
}

export function aspectValue(preset: AspectPreset): number | undefined {
  switch (preset) {
    case "free":
      return undefined;
    case "1":
      return 1;
    case "16-9":
      return 16 / 9;
    case "4-3":
      return 4 / 3;
    case "3-2":
      return 3 / 2;
    case "9-16":
      return 9 / 16;
    default:
      return undefined;
  }
}
