import type { ExportConstraints, ResolverOutput } from "@codalyn/webflow-kit";
import { parseOutputDimensionStrict } from "@/features/image-editor/lib/apply-cropped-export";
import { aspectValue, type EditorAspectSelection } from "@/features/image-editor/lib/aspect-preset";
import { hasValidExportConstraints } from "@/features/image-editor/lib/image-editor-upload-preset-picker";

/**
 * Compose-session constraints (highest precedence), else picker selection, else resolver readout (e.g. site default).
 * Compose constraints come from a Designer per-prop preset and lock the session — they win over every other source.
 */
export function resolveEffectiveExportConstraints(input: {
  composeConstraints?: ExportConstraints | null;
  uploadPresetManualOverride: boolean;
  selectedPresetConstraints: ExportConstraints | null;
  resolvedReadout: ResolverOutput | null;
}): ExportConstraints | null {
  if (hasValidExportConstraints(input.composeConstraints)) {
    return input.composeConstraints ?? null;
  }
  if (input.uploadPresetManualOverride) {
    return null;
  }
  if (hasValidExportConstraints(input.selectedPresetConstraints)) {
    return input.selectedPresetConstraints;
  }
  const readout = input.resolvedReadout;
  if (readout != null && readout.source !== "manual" && hasValidExportConstraints(readout.constraints)) {
    return readout.constraints;
  }
  return null;
}

type SessionCropFrameMode = "aspect" | "custom";

export function resolveManualSessionExportDimensionsReady(input: {
  cropFrameMode: SessionCropFrameMode;
  widthStr: string;
  heightStr: string;
  aspectPreset: EditorAspectSelection;
}): boolean {
  if (input.cropFrameMode === "custom") {
    return parseOutputDimensionStrict(input.widthStr) != null && parseOutputDimensionStrict(input.heightStr) != null;
  }
  if (input.aspectPreset === "unset") {
    return false;
  }
  const w = parseOutputDimensionStrict(input.widthStr);
  const r = aspectValue(input.aspectPreset);
  return r != null && w != null && w >= 1;
}

export function resolveExportDimensionsReady(input: {
  effectiveTaggedDimensionsActive: boolean;
  effectiveExportConstraints: ExportConstraints | null;
  cropFrameMode: SessionCropFrameMode;
  widthStr: string;
  heightStr: string;
  aspectPreset: EditorAspectSelection;
}): boolean {
  if (input.effectiveTaggedDimensionsActive) {
    return true;
  }
  if (hasValidExportConstraints(input.effectiveExportConstraints)) {
    return true;
  }
  return resolveManualSessionExportDimensionsReady(input);
}
