import { BEACON_IMAGE_ERROR_CODES } from "./beacon-image-errors.js";

const TAGGED_EXPORT_MAX_EDGE = 2560;
const TAGGED_EXPORT_DEFAULT_WIDTH = 1920;
const TAGGED_EXPORT_DEFAULT_HEIGHT = 1080;

export type BareImageInstancePresetTargetKey = {
  kind: "bare-image-instance";
  siteId: string;
  pageId: string;
  elementId: string;
};

export type SiteDefaultPresetTargetKey = {
  kind: "site-default";
  siteId: string;
};

export type BareImageElementPresetTargetKey = {
  kind: "bare-image-element";
  siteId: string;
};

export type ComponentImageInstancePresetTargetKey = {
  kind: "component-image-instance";
  siteId: string;
  pageId: string;
  instanceElementId: string;
  imagePropId: string;
};

export type ComponentImagePresetTargetKey = {
  kind: "component-image";
  siteId: string;
  componentDefinitionId: string;
  imagePropId: string;
};

/**
 * Reserved for future support of preseting an inner image element in a component definition.
 */
export type ComponentImageElementPresetTargetKey = {
  kind: "component-image-element";
  siteId: string;
  componentDefinitionId: string;
  elementId: string;
};

export type PresetTargetKey =
  | SiteDefaultPresetTargetKey
  | BareImageInstancePresetTargetKey
  | BareImageElementPresetTargetKey
  | ComponentImageInstancePresetTargetKey
  | ComponentImagePresetTargetKey
  | ComponentImageElementPresetTargetKey;

export type PresetTargetKeyString = string & { readonly __brand: "PresetTargetKeyString" };

/** Designer page context captured when an instance-scoped preset is saved. */
export type BeaconPresetInstanceLocation = {
  pageId: string;
  pageName: string;
  pageKind: "static" | "cms";
  /** Present when {@link pageKind} is `"cms"` (collection template page). */
  collectionId?: string;
};

export type BeaconPresetRow = {
  id: string;
  targetKey: PresetTargetKey;
  name: string;
  width: number;
  height: number;
  exportFormat?: "webp" | "avif";
  maxFileSizeBytes: number;
  /** Where the instance preset was saved; used for navigation and edit validation. */
  instanceLocation?: BeaconPresetInstanceLocation;
};

export type BeaconPresetSettingsSnapshot = {
  siteDefault: BeaconPresetRow | null;
  byTargetKey: ReadonlyMap<PresetTargetKeyString, BeaconPresetRow>;
  defaults: {
    exportFormat: "webp" | "avif";
    exportQuality: number;
  };
};

export type ResolvedUploadTarget =
  | {
      kind: "bare-image";
      siteId: string;
      pageId: string;
      elementId: string;
      tagged: { width: number; height: number } | null;
    }
  | {
      kind: "component-image";
      siteId: string;
      pageId: string;
      instanceElementId: string;
      componentDefinitionId: string;
      imagePropId: string;
      tagged: { width: number; height: number } | null;
    }
  | {
      kind: "cms-ambiguous";
      siteId: string;
    };

export type ResolverInput = {
  settings: BeaconPresetSettingsSnapshot;
  target: ResolvedUploadTarget;
};

export type PresetConstraintSource = "tagged" | "instance" | "component" | "element" | "site-default" | "manual";

export type ExportConstraints = {
  width: number;
  height: number;
  exportFormat: "webp" | "avif";
  maxFileSizeBytes: number | null;
  quality: number;
};

export type ResolverOutput = {
  constraints: ExportConstraints | null;
  source: PresetConstraintSource;
  presetId: string | null;
  blockers: ReadonlyArray<"ambiguous-cms-binding">;
};

export type DuplicateCheckResult = "ok" | "DUPLICATE_PRESET_TARGET";

export type PresetCrudScope = "site-default" | "element" | "component" | "instance";

export type BeaconPresetResolver = {
  resolve(input: ResolverInput): ResolverOutput;
  assertUniqueTarget(
    settings: BeaconPresetSettingsSnapshot,
    key: PresetTargetKey,
    excludeId?: string
  ): DuplicateCheckResult;
};

type PresetSelection = {
  preset: BeaconPresetRow;
  source: Exclude<PresetConstraintSource, "tagged" | "manual">;
};

function toPresetTargetKeyString(value: string): PresetTargetKeyString {
  return value as PresetTargetKeyString;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeTargetKey(key: PresetTargetKey): Record<string, string> {
  switch (key.kind) {
    case "site-default":
      return {
        kind: key.kind,
        siteId: key.siteId,
      };
    case "bare-image-instance":
      return {
        kind: key.kind,
        siteId: key.siteId,
        pageId: key.pageId,
        elementId: key.elementId,
      };
    case "bare-image-element":
      return {
        kind: key.kind,
        siteId: key.siteId,
      };
    case "component-image-instance":
      return {
        kind: key.kind,
        siteId: key.siteId,
        pageId: key.pageId,
        instanceElementId: key.instanceElementId,
        imagePropId: key.imagePropId,
      };
    case "component-image":
      return {
        kind: key.kind,
        siteId: key.siteId,
        componentDefinitionId: key.componentDefinitionId,
        imagePropId: key.imagePropId,
      };
    case "component-image-element":
      return {
        kind: key.kind,
        siteId: key.siteId,
        componentDefinitionId: key.componentDefinitionId,
        elementId: key.elementId,
      };
  }
}

function hasOnlyNonEmptyStrings(obj: Record<string, string>): boolean {
  return Object.values(obj).every((value) => isNonEmptyString(value));
}

export function isPresetTargetKey(value: unknown): value is PresetTargetKey {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (!isNonEmptyString(v.kind)) {
    return false;
  }
  switch (v.kind) {
    case "site-default":
      return isNonEmptyString(v.siteId);
    case "bare-image-instance":
      return isNonEmptyString(v.siteId) && isNonEmptyString(v.pageId) && isNonEmptyString(v.elementId);
    case "bare-image-element":
      return isNonEmptyString(v.siteId);
    case "component-image-instance":
      return (
        isNonEmptyString(v.siteId) &&
        isNonEmptyString(v.pageId) &&
        isNonEmptyString(v.instanceElementId) &&
        isNonEmptyString(v.imagePropId)
      );
    case "component-image":
      return isNonEmptyString(v.siteId) && isNonEmptyString(v.componentDefinitionId) && isNonEmptyString(v.imagePropId);
    case "component-image-element":
      return isNonEmptyString(v.siteId) && isNonEmptyString(v.componentDefinitionId) && isNonEmptyString(v.elementId);
    default:
      return false;
  }
}

export function serializePresetTargetKey(key: PresetTargetKey): PresetTargetKeyString {
  const normalized = normalizeTargetKey(key);
  if (!hasOnlyNonEmptyStrings(normalized)) {
    throw new Error(BEACON_IMAGE_ERROR_CODES.PRESET_TARGET_KEY_INVALID);
  }
  return toPresetTargetKeyString(JSON.stringify(normalized));
}

export function deserializePresetTargetKey(serialized: string): PresetTargetKey | null {
  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!isPresetTargetKey(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function trimSiteId(siteId: string): string {
  return siteId.trim();
}

export function createSiteDefaultPresetTargetKey(siteId: string): SiteDefaultPresetTargetKey {
  return {
    kind: "site-default",
    siteId: trimSiteId(siteId),
  };
}

export function buildPresetTargetKeyForScope(input: {
  scope: PresetCrudScope;
  target: ResolvedUploadTarget;
}): PresetTargetKey | null {
  const { scope, target } = input;
  if (target.kind === "cms-ambiguous") {
    return scope === "site-default" ? createSiteDefaultPresetTargetKey(target.siteId) : null;
  }
  if (scope === "site-default") {
    return createSiteDefaultPresetTargetKey(target.siteId);
  }
  if (target.kind === "bare-image") {
    if (scope === "element") {
      return {
        kind: "bare-image-element",
        siteId: target.siteId,
      };
    }
    if (scope === "instance") {
      return {
        kind: "bare-image-instance",
        siteId: target.siteId,
        pageId: target.pageId,
        elementId: target.elementId,
      };
    }
    return null;
  }
  if (scope === "component") {
    return {
      kind: "component-image",
      siteId: target.siteId,
      componentDefinitionId: target.componentDefinitionId,
      imagePropId: target.imagePropId,
    };
  }
  if (scope === "instance") {
    return {
      kind: "component-image-instance",
      siteId: target.siteId,
      pageId: target.pageId,
      instanceElementId: target.instanceElementId,
      imagePropId: target.imagePropId,
    };
  }
  return null;
}

function clampTaggedDimensions(width: number, height: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return {
      width: TAGGED_EXPORT_DEFAULT_WIDTH,
      height: TAGGED_EXPORT_DEFAULT_HEIGHT,
    };
  }
  const maxEdge = Math.max(width, height);
  if (maxEdge <= TAGGED_EXPORT_MAX_EDGE) {
    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }
  const scale = TAGGED_EXPORT_MAX_EDGE / maxEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function toPresetConstraints(
  row: BeaconPresetRow,
  defaults: BeaconPresetSettingsSnapshot["defaults"]
): ExportConstraints {
  return {
    width: row.width,
    height: row.height,
    exportFormat: row.exportFormat ?? defaults.exportFormat,
    maxFileSizeBytes: row.maxFileSizeBytes,
    quality: defaults.exportQuality,
  };
}

function getPresetByKey(
  settings: BeaconPresetSettingsSnapshot,
  targetKey: PresetTargetKey,
  source: PresetSelection["source"]
): PresetSelection | null {
  const serialized = serializePresetTargetKey(targetKey);
  const direct = settings.byTargetKey.get(serialized);
  if (direct !== undefined) {
    return { preset: direct, source };
  }
  for (const row of settings.byTargetKey.values()) {
    if (serializePresetTargetKey(row.targetKey) === serialized) {
      return { preset: row, source };
    }
  }
  return null;
}

function selectPresetForUntypedTarget(input: ResolverInput): PresetSelection | null {
  const { settings, target } = input;
  if (target.kind === "bare-image") {
    return (
      getPresetByKey(
        settings,
        {
          kind: "bare-image-instance",
          siteId: target.siteId,
          pageId: target.pageId,
          elementId: target.elementId,
        },
        "instance"
      ) ??
      getPresetByKey(
        settings,
        {
          kind: "bare-image-element",
          siteId: target.siteId,
        },
        "element"
      ) ??
      (settings.siteDefault === null ? null : { preset: settings.siteDefault, source: "site-default" })
    );
  }
  if (target.kind === "component-image") {
    return (
      getPresetByKey(
        settings,
        {
          kind: "component-image-instance",
          siteId: target.siteId,
          pageId: target.pageId,
          instanceElementId: target.instanceElementId,
          imagePropId: target.imagePropId,
        },
        "instance"
      ) ??
      getPresetByKey(
        settings,
        {
          kind: "component-image",
          siteId: target.siteId,
          componentDefinitionId: target.componentDefinitionId,
          imagePropId: target.imagePropId,
        },
        "component"
      ) ??
      (settings.siteDefault === null ? null : { preset: settings.siteDefault, source: "site-default" })
    );
  }
  return null;
}

function isTaggedDimensions(
  value: { width: number; height: number } | null
): value is { width: number; height: number } {
  return (
    value !== null &&
    Number.isFinite(value.width) &&
    Number.isFinite(value.height) &&
    Number.isInteger(value.width) &&
    Number.isInteger(value.height) &&
    value.width > 0 &&
    value.height > 0
  );
}

function resolveInternal(input: ResolverInput): ResolverOutput {
  if (input.target.kind === "cms-ambiguous") {
    return {
      constraints: null,
      source: "manual",
      presetId: null,
      blockers: ["ambiguous-cms-binding"],
    };
  }

  const presetSelection = selectPresetForUntypedTarget(input);
  if (isTaggedDimensions(input.target.tagged)) {
    const clamped = clampTaggedDimensions(input.target.tagged.width, input.target.tagged.height);
    return {
      constraints: {
        width: clamped.width,
        height: clamped.height,
        exportFormat: presetSelection?.preset.exportFormat ?? input.settings.defaults.exportFormat,
        maxFileSizeBytes: presetSelection?.preset.maxFileSizeBytes ?? null,
        quality: input.settings.defaults.exportQuality,
      },
      source: "tagged",
      presetId: presetSelection?.preset.id ?? null,
      blockers: [],
    };
  }

  if (presetSelection !== null) {
    return {
      constraints: toPresetConstraints(presetSelection.preset, input.settings.defaults),
      source: presetSelection.source,
      presetId: presetSelection.preset.id,
      blockers: [],
    };
  }

  return {
    constraints: null,
    source: "manual",
    presetId: null,
    blockers: [],
  };
}

function assertUniqueTargetInternal(
  settings: BeaconPresetSettingsSnapshot,
  key: PresetTargetKey,
  excludeId?: string
): DuplicateCheckResult {
  const keyString = serializePresetTargetKey(key);
  for (const row of settings.byTargetKey.values()) {
    const rowKey = serializePresetTargetKey(row.targetKey);
    if (rowKey !== keyString) {
      continue;
    }
    if (excludeId !== undefined && row.id === excludeId) {
      continue;
    }
    return BEACON_IMAGE_ERROR_CODES.DUPLICATE_PRESET_TARGET;
  }
  return "ok";
}

export function createBeaconPresetResolver(): BeaconPresetResolver {
  return {
    resolve(input: ResolverInput): ResolverOutput {
      return resolveInternal(input);
    },
    assertUniqueTarget(
      settings: BeaconPresetSettingsSnapshot,
      key: PresetTargetKey,
      excludeId?: string
    ): DuplicateCheckResult {
      return assertUniqueTargetInternal(settings, key, excludeId);
    },
  };
}

type PresetStorageLookup = {
  siteDefault: BeaconPresetRow | null;
  byTargetKey: Readonly<Record<string, BeaconPresetRow>> | ReadonlyMap<PresetTargetKeyString, BeaconPresetRow>;
};

function findRowInByTargetKey(
  byTargetKey: PresetStorageLookup["byTargetKey"],
  keyString: PresetTargetKeyString
): BeaconPresetRow | null {
  if (byTargetKey instanceof Map) {
    const direct = byTargetKey.get(keyString);
    if (direct !== undefined) {
      return direct;
    }
    for (const row of byTargetKey.values()) {
      if (serializePresetTargetKey(row.targetKey) === keyString) {
        return row;
      }
    }
    return null;
  }
  const record = byTargetKey as Readonly<Record<string, BeaconPresetRow>>;
  const direct = record[keyString];
  if (direct !== undefined) {
    return direct;
  }
  for (const row of Object.values(record)) {
    if (serializePresetTargetKey(row.targetKey) === keyString) {
      return row;
    }
  }
  return null;
}

/** Returns the stored preset row for a canonical target key, if any. */
export function findBeaconPresetRowByTargetKey(
  storage: PresetStorageLookup,
  key: PresetTargetKey
): BeaconPresetRow | null {
  if (key.kind === "site-default") {
    if (storage.siteDefault === null) {
      return null;
    }
    return serializePresetTargetKey(storage.siteDefault.targetKey) === serializePresetTargetKey(key)
      ? storage.siteDefault
      : null;
  }
  return findRowInByTargetKey(storage.byTargetKey, serializePresetTargetKey(key));
}

export function inferPresetCrudScopeFromTargetKey(row: BeaconPresetRow): PresetCrudScope {
  if (row.targetKey.kind === "site-default") {
    return "site-default";
  }
  if (row.targetKey.kind === "component-image") {
    return "component";
  }
  if (row.targetKey.kind === "bare-image-element" || row.targetKey.kind === "component-image-element") {
    return "element";
  }
  return "instance";
}

export function labelForPresetCrudScope(scope: PresetCrudScope): string {
  if (scope === "site-default") {
    return "Site default";
  }
  if (scope === "element") {
    return "Element";
  }
  if (scope === "component") {
    return "Component";
  }
  return "Instance";
}

export type BeaconPresetStorageEntry = {
  row: BeaconPresetRow;
  scope: PresetCrudScope;
};

export function listBeaconPresetStorageEntries(storage: {
  siteDefault: BeaconPresetRow | null;
  byTargetKey: Readonly<Record<string, BeaconPresetRow>>;
}): BeaconPresetStorageEntry[] {
  const entries: BeaconPresetStorageEntry[] = [];
  if (storage.siteDefault !== null) {
    entries.push({ row: storage.siteDefault, scope: "site-default" });
  }
  for (const row of Object.values(storage.byTargetKey)) {
    entries.push({ row, scope: inferPresetCrudScopeFromTargetKey(row) });
  }
  return entries;
}

export function formatBeaconPresetDisplayName(row: BeaconPresetRow, scope: PresetCrudScope): string {
  return `${row.name} (${labelForPresetCrudScope(scope)})`;
}

export function isInstancePresetTargetKey(
  key: PresetTargetKey
): key is BareImageInstancePresetTargetKey | ComponentImageInstancePresetTargetKey {
  return key.kind === "bare-image-instance" || key.kind === "component-image-instance";
}

export function readPageIdFromInstancePresetTargetKey(
  key: BareImageInstancePresetTargetKey | ComponentImageInstancePresetTargetKey
): string {
  return key.pageId;
}

export function doesResolvedUploadTargetMatchPresetTargetKey(
  resolved: Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }>,
  key: PresetTargetKey
): boolean {
  if (key.kind === "bare-image-instance") {
    return (
      resolved.kind === "bare-image" &&
      resolved.siteId === key.siteId &&
      resolved.pageId === key.pageId &&
      resolved.elementId === key.elementId
    );
  }
  if (key.kind === "component-image-instance") {
    return (
      resolved.kind === "component-image" &&
      resolved.siteId === key.siteId &&
      resolved.pageId === key.pageId &&
      resolved.instanceElementId === key.instanceElementId &&
      resolved.imagePropId === key.imagePropId
    );
  }
  if (key.kind === "bare-image-element") {
    return resolved.kind === "bare-image" && resolved.siteId === key.siteId;
  }
  if (key.kind === "component-image") {
    return (
      resolved.kind === "component-image" &&
      resolved.siteId === key.siteId &&
      resolved.componentDefinitionId === key.componentDefinitionId &&
      resolved.imagePropId === key.imagePropId
    );
  }
  if (key.kind === "site-default") {
    return resolved.siteId === key.siteId;
  }
  return false;
}

function toTitleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function looksLikeCmsCollectionTemplatePageName(pageName: string): boolean {
  return /\bcollection(\s+template)?\b/i.test(pageName);
}

function formatCmsCollectionTemplateLocationLabel(pageName: string): string {
  let base = pageName.trim();
  if (base.length === 0) {
    return "Template";
  }
  base = base.replace(/^collection\s+template\s*[·•\-–—:]\s*/i, "");
  base = base.replace(/\s+collection(\s+template)?$/i, "");
  base = base.replace(/\s+template$/i, "");
  base = base.trim();
  if (base.length === 0) {
    return "Template";
  }
  return `${toTitleCaseWords(base)} Template`;
}

export function formatBeaconPresetInstanceLocationLabel(location: BeaconPresetInstanceLocation): string {
  if (location.pageKind === "cms" || looksLikeCmsCollectionTemplatePageName(location.pageName)) {
    return formatCmsCollectionTemplateLocationLabel(location.pageName);
  }
  return location.pageName;
}
