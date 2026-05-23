import {
  type BeaconAppSettings,
  createBeaconPresetResolver,
  type ExportConstraints,
  type PresetConstraintSource,
  type ResolvedUploadTarget,
  type ResolverOutput,
  serializePresetTargetKey,
} from "@codalyn/webflow-kit";

const ACTIVE_RESOLVED_UPLOAD_PRESET_OPTION_ID = "active-resolved";
const MANUAL_UPLOAD_PRESET_OPTION_ID = "manual-override";

type UploadPresetPickerScope = "instance" | "component" | "element" | "site-default" | "active" | "manual";

export type UploadPresetPickerOption = {
  id: string;
  label: string;
  scope: UploadPresetPickerScope;
  constraints: ExportConstraints | null;
};

const pickerResolver = createBeaconPresetResolver();

function scopeLabel(scope: UploadPresetPickerScope): string {
  if (scope === "active") {
    return "Active resolved preset";
  }
  if (scope === "site-default") {
    return "Site default preset";
  }
  if (scope === "component") {
    return "Component preset";
  }
  if (scope === "element") {
    return "Element preset";
  }
  if (scope === "instance") {
    return "Instance preset";
  }
  return "Manual override";
}

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

function resolveSingleRowConstraints(args: {
  row: NonNullable<BeaconAppSettings["imagePresetStorageV2"]["siteDefault"]>;
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

function optionForRow(args: {
  row: NonNullable<BeaconAppSettings["imagePresetStorageV2"]["siteDefault"]>;
  scope: UploadPresetPickerScope;
  target: ResolvedUploadTarget;
  settings: BeaconAppSettings;
}): UploadPresetPickerOption {
  const { row, scope, target, settings } = args;
  return {
    id: `preset:${row.id}`,
    label: `${scopeLabel(scope)} - ${row.name}`,
    scope,
    constraints: resolveSingleRowConstraints({ row, rowScope: scope, target, settings }),
  };
}

function pushActiveResolvedOption(options: UploadPresetPickerOption[], readout: ResolverOutput | null) {
  if (readout?.constraints == null) {
    return;
  }
  options.push({
    id: ACTIVE_RESOLVED_UPLOAD_PRESET_OPTION_ID,
    label: scopeLabel(readout.source === "tagged" ? "active" : sourceScope(readout.source)),
    scope: "active",
    constraints: readout.constraints,
  });
}

function pushBareImagePresetOptions(args: {
  options: UploadPresetPickerOption[];
  settings: BeaconAppSettings;
  target: Extract<ResolvedUploadTarget, { kind: "bare-image" }>;
}) {
  const { options, settings, target } = args;
  const bareInstanceRow =
    settings.imagePresetStorageV2.byTargetKey[
      serializePresetTargetKey({
        kind: "bare-image-instance",
        siteId: target.siteId,
        pageId: target.pageId,
        elementId: target.elementId,
      })
    ];
  if (bareInstanceRow != null) {
    options.push(optionForRow({ row: bareInstanceRow, scope: "instance", target, settings }));
  }
  const bareElementRow =
    settings.imagePresetStorageV2.byTargetKey[
      serializePresetTargetKey({
        kind: "bare-image-element",
        siteId: target.siteId,
      })
    ];
  if (bareElementRow != null) {
    options.push(optionForRow({ row: bareElementRow, scope: "element", target, settings }));
  }
}

function pushComponentImagePresetOptions(args: {
  options: UploadPresetPickerOption[];
  settings: BeaconAppSettings;
  target: Extract<ResolvedUploadTarget, { kind: "component-image" }>;
}) {
  const { options, settings, target } = args;
  const componentInstanceRow =
    settings.imagePresetStorageV2.byTargetKey[
      serializePresetTargetKey({
        kind: "component-image-instance",
        siteId: target.siteId,
        pageId: target.pageId,
        instanceElementId: target.instanceElementId,
        imagePropId: target.imagePropId,
      })
    ];
  if (componentInstanceRow != null) {
    options.push(optionForRow({ row: componentInstanceRow, scope: "instance", target, settings }));
  }
  const componentRow =
    settings.imagePresetStorageV2.byTargetKey[
      serializePresetTargetKey({
        kind: "component-image",
        siteId: target.siteId,
        componentDefinitionId: target.componentDefinitionId,
        imagePropId: target.imagePropId,
      })
    ];
  if (componentRow != null) {
    options.push(optionForRow({ row: componentRow, scope: "component", target, settings }));
  }
}

function pushSiteDefaultPresetOption(args: {
  options: UploadPresetPickerOption[];
  settings: BeaconAppSettings;
  target: Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }>;
}) {
  const { options, settings, target } = args;
  const siteDefaultRow = settings.imagePresetStorageV2.siteDefault;
  if (siteDefaultRow?.targetKey.siteId === target.siteId) {
    options.push(optionForRow({ row: siteDefaultRow, scope: "site-default", target, settings }));
  }
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
  pushActiveResolvedOption(options, readout);

  if (allowTeamPresets && target.kind !== "cms-ambiguous") {
    if (target.kind === "bare-image") {
      pushBareImagePresetOptions({ options, settings, target });
    } else {
      pushComponentImagePresetOptions({ options, settings, target });
    }
    pushSiteDefaultPresetOption({ options, settings, target });
  }

  options.push({
    id: MANUAL_UPLOAD_PRESET_OPTION_ID,
    label: scopeLabel("manual"),
    scope: "manual",
    constraints: null,
  });

  return options;
}

export function getDefaultUploadPresetOptionId(readout: ResolverOutput | null): string {
  if (readout?.source === "manual" || readout?.constraints == null) {
    return MANUAL_UPLOAD_PRESET_OPTION_ID;
  }
  return ACTIVE_RESOLVED_UPLOAD_PRESET_OPTION_ID;
}

export function isManualUploadPresetOptionId(id: string): boolean {
  return id === MANUAL_UPLOAD_PRESET_OPTION_ID;
}
