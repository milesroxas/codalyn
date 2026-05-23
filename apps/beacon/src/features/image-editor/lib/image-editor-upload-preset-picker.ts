import {
  type BeaconAppSettings,
  type BeaconPresetRow,
  createBeaconPresetResolver,
  type ExportConstraints,
  type PresetConstraintSource,
  type ResolvedUploadTarget,
  type ResolverOutput,
  serializePresetTargetKey,
} from "@codalyn/webflow-kit";

const MANUAL_UPLOAD_PRESET_OPTION_ID = "manual-override";
const RESOLVED_CONSTRAINTS_UPLOAD_PRESET_OPTION_ID = "resolved-constraints";

type UploadPresetPickerScope = "instance" | "component" | "element" | "site-default" | "active" | "manual";

export type UploadPresetPickerOption = {
  id: string;
  label: string;
  scope: UploadPresetPickerScope;
  constraints: ExportConstraints | null;
  /** True when the preset row has an explicit export format (not workspace default). */
  exportFormatConfigured: boolean;
};

const pickerResolver = createBeaconPresetResolver();

function sourceScope(source: PresetConstraintSource): UploadPresetPickerScope {
  if (source === "site-default") {
    return "site-default";
  }
  if (source === "component") {
    return "component";
  }
  if (source === "element") {
    return "element";
  }
  if (source === "instance") {
    return "instance";
  }
  return "active";
}

function presetOptionId(row: BeaconPresetRow): string {
  return `preset:${row.id}`;
}

function resolveSingleRowConstraints(args: {
  row: NonNullable<BeaconAppSettings["imagePresetStorage"]["siteDefault"]>;
  rowScope: UploadPresetPickerScope;
  target: ResolvedUploadTarget;
  settings: BeaconAppSettings;
}): ExportConstraints | null {
  const { row, rowScope, target, settings } = args;
  const byTargetKey =
    rowScope === "site-default" ? new Map() : new Map([[serializePresetTargetKey(row.targetKey), row]]);
  const siteDefault = rowScope === "site-default" ? row : null;
  const resolved = pickerResolver.resolve({
    settings: {
      siteDefault,
      byTargetKey,
      defaults: {
        exportFormat: settings.defaultExportFormat,
        exportQuality: settings.defaultExportQuality,
      },
    },
    target,
  });
  return resolved.constraints;
}

function presetRowExportFormatConfigured(row: BeaconPresetRow): boolean {
  return row.exportFormat !== undefined;
}

function findPresetRowById(settings: BeaconAppSettings, presetId: string | null): BeaconPresetRow | null {
  if (presetId == null) {
    return null;
  }
  const siteDefault = settings.imagePresetStorage.siteDefault;
  if (siteDefault?.id === presetId) {
    return siteDefault;
  }
  for (const row of Object.values(settings.imagePresetStorage.byTargetKey)) {
    if (row.id === presetId) {
      return row;
    }
  }
  return null;
}

function resolvedPresetOptionLabel(readout: ResolverOutput, presetRow: BeaconPresetRow | null): string {
  if (presetRow != null) {
    return presetRow.name;
  }
  if (readout.source === "tagged") {
    return "Tagged export size";
  }
  return "Resolved preset";
}

function optionForPresetRow(args: {
  row: BeaconPresetRow;
  scope: UploadPresetPickerScope;
  target: ResolvedUploadTarget;
  settings: BeaconAppSettings;
}): UploadPresetPickerOption {
  const { row, scope, target, settings } = args;
  return {
    id: presetOptionId(row),
    label: row.name,
    scope,
    constraints: resolveSingleRowConstraints({ row, rowScope: scope, target, settings }),
    exportFormatConfigured: presetRowExportFormatConfigured(row),
  };
}

function pushResolvedPresetOption(
  options: UploadPresetPickerOption[],
  readout: ResolverOutput | null,
  settings: BeaconAppSettings
) {
  if (readout?.constraints == null || readout.source === "manual") {
    return;
  }
  const presetRow = findPresetRowById(settings, readout.presetId);
  options.push({
    id: presetRow != null ? presetOptionId(presetRow) : RESOLVED_CONSTRAINTS_UPLOAD_PRESET_OPTION_ID,
    label: resolvedPresetOptionLabel(readout, presetRow),
    scope: readout.source === "tagged" ? "active" : sourceScope(readout.source),
    constraints: readout.constraints,
    exportFormatConfigured: presetRow != null && presetRowExportFormatConfigured(presetRow),
  });
}

function pushSiteDefaultFallbackOption(args: {
  options: UploadPresetPickerOption[];
  settings: BeaconAppSettings;
  target: Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }>;
  readout: ResolverOutput | null;
}) {
  const { options, settings, target, readout } = args;
  const siteDefaultRow = settings.imagePresetStorage.siteDefault;
  if (siteDefaultRow?.targetKey.siteId !== target.siteId) {
    return;
  }
  if (readout?.presetId === siteDefaultRow.id) {
    return;
  }
  options.push(
    optionForPresetRow({
      row: siteDefaultRow,
      scope: "site-default",
      target,
      settings,
    })
  );
}

export function buildUploadPresetPickerOptions(input: {
  enabled: boolean;
  settings: BeaconAppSettings;
  target: ResolvedUploadTarget | null;
  readout: ResolverOutput | null;
  allowTeamPresets: boolean;
}): UploadPresetPickerOption[] {
  const { enabled, settings, target, readout, allowTeamPresets } = input;
  if (!enabled || target == null) {
    return [];
  }

  const options: UploadPresetPickerOption[] = [];
  pushResolvedPresetOption(options, readout, settings);

  if (allowTeamPresets && target.kind !== "cms-ambiguous") {
    pushSiteDefaultFallbackOption({ options, settings, target, readout });
  }

  options.push({
    id: MANUAL_UPLOAD_PRESET_OPTION_ID,
    label: "Manual override",
    scope: "manual",
    constraints: null,
    exportFormatConfigured: false,
  });

  return options;
}

export function getDefaultUploadPresetOptionId(readout: ResolverOutput | null): string {
  if (readout?.source === "manual" || readout?.constraints == null) {
    return MANUAL_UPLOAD_PRESET_OPTION_ID;
  }
  if (readout.presetId != null) {
    return `preset:${readout.presetId}`;
  }
  return RESOLVED_CONSTRAINTS_UPLOAD_PRESET_OPTION_ID;
}

export function resolveAutoUploadPresetOptionId(input: {
  currentOptionId: string;
  userPicked: boolean;
  readout: ResolverOutput | null;
  availableOptionIds: ReadonlySet<string>;
  targetResolutionSettled: boolean;
}): string | null {
  if (!input.targetResolutionSettled) {
    return null;
  }
  const fallbackOptionId = getDefaultUploadPresetOptionId(input.readout);
  if (input.userPicked && input.availableOptionIds.has(input.currentOptionId)) {
    return input.currentOptionId;
  }
  return fallbackOptionId;
}

export function isManualUploadPresetOptionId(id: string): boolean {
  return id === MANUAL_UPLOAD_PRESET_OPTION_ID;
}

export function isUploadPresetExportFormatLocked(selectedOption: UploadPresetPickerOption | null | undefined): boolean {
  if (selectedOption == null || isManualUploadPresetOptionId(selectedOption.id)) {
    return false;
  }
  return selectedOption.exportFormatConfigured;
}
