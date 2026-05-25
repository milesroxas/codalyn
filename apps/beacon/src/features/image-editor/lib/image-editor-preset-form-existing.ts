import {
  type BeaconAppSettings,
  type BeaconPresetRow,
  buildPresetTargetKeyForScope,
  findBeaconPresetRowByTargetKey,
  formatBeaconPresetDimensionsLabel,
  formatBeaconPresetDisplayName,
  type PresetCrudScope,
  type ResolvedUploadTarget,
} from "@codalyn/webflow-kit";

export type PresetFormExistingMatch = {
  scope: PresetCrudScope;
  row: BeaconPresetRow;
  displayName: string;
  dimensionsLabel: string;
};

/** Surface add/edit preset form scopes. Site default is a global fallback shown when no surface preset exists. */
export function isSurfaceTargetPresetScope(scope: PresetCrudScope): scope is Exclude<PresetCrudScope, "site-default"> {
  return scope !== "site-default";
}

export function findExistingPresetForFormScope(input: {
  settings: BeaconAppSettings;
  scope: PresetCrudScope;
  siteId: string | null;
  resolvedTarget: Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }> | null;
}): PresetFormExistingMatch | null {
  const { settings, scope, siteId, resolvedTarget } = input;
  if (scope === "site-default") {
    const row = settings.imagePresetStorage.siteDefault;
    if (row == null) {
      return null;
    }
    return {
      scope,
      row,
      displayName: formatBeaconPresetDisplayName(row, scope),
      dimensionsLabel: formatBeaconPresetDimensionsLabel(row),
    };
  }
  if (siteId == null || resolvedTarget == null) {
    return null;
  }
  const targetKey = buildPresetTargetKeyForScope({ scope, target: resolvedTarget });
  if (targetKey == null) {
    return null;
  }
  const row = findBeaconPresetRowByTargetKey(settings.imagePresetStorage, targetKey);
  if (row == null) {
    return null;
  }
  return {
    scope,
    row,
    displayName: formatBeaconPresetDisplayName(row, scope),
    dimensionsLabel: formatBeaconPresetDimensionsLabel(row),
  };
}

export function listExistingPresetsForFormTarget(input: {
  settings: BeaconAppSettings;
  siteId: string | null;
  resolvedTarget: Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }> | null;
  scopeOptions: ReadonlyArray<{ scope: PresetCrudScope; enabled: boolean }>;
}): PresetFormExistingMatch[] {
  const matches: PresetFormExistingMatch[] = [];
  for (const option of input.scopeOptions) {
    if (!option.enabled || !isSurfaceTargetPresetScope(option.scope)) {
      continue;
    }
    const match = findExistingPresetForFormScope({
      settings: input.settings,
      scope: option.scope,
      siteId: input.siteId,
      resolvedTarget: input.resolvedTarget,
    });
    if (match) {
      matches.push(match);
    }
  }
  if (matches.length === 0 && input.siteId != null) {
    const siteDefaultFallback = findExistingPresetForFormScope({
      settings: input.settings,
      scope: "site-default",
      siteId: input.siteId,
      resolvedTarget: input.resolvedTarget,
    });
    if (siteDefaultFallback != null && siteDefaultFallback.row.targetKey.siteId === input.siteId) {
      matches.push(siteDefaultFallback);
    }
  }
  return matches;
}

export type PresetFormAddableScope = {
  scope: PresetCrudScope;
  label: string;
};

export function listAddablePresetScopesForFormTarget(input: {
  scopeOptions: ReadonlyArray<{ scope: PresetCrudScope; enabled: boolean; label: string }>;
  existingPresets: ReadonlyArray<PresetFormExistingMatch>;
}): PresetFormAddableScope[] {
  const existingScopes = new Set(input.existingPresets.map((match) => match.scope));
  return input.scopeOptions
    .filter((option) => option.enabled && isSurfaceTargetPresetScope(option.scope) && !existingScopes.has(option.scope))
    .map((option) => ({ scope: option.scope, label: option.label }));
}

export function presetFormExistingMatchToListRow(match: PresetFormExistingMatch): {
  id: string;
  name: string;
  displayName: string;
  scope: PresetCrudScope;
  width: number;
  height: number;
  exportFormat?: BeaconPresetRow["exportFormat"];
  maxFileSizeBytes: number;
} {
  return {
    id: match.row.id,
    name: match.row.name,
    displayName: match.displayName,
    scope: match.scope,
    width: match.row.width,
    height: match.row.height,
    exportFormat: match.row.exportFormat,
    maxFileSizeBytes: match.row.maxFileSizeBytes,
  };
}
