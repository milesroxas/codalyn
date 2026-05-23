import {
  CMS_SLOT_PUBLISH_PLACEHOLDER_URL,
  isBeaconPropValueEmpty,
  isBeaconPublishPlaceholderValue,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import {
  type ComposableInstancePropMeta,
  isCmsSlotImageValueType,
} from "@/features/cms-slots/model/cms-slot-composable-props";
import type { NestedPublishSeedPair } from "@/features/cms-slots/model/cms-slot-nested-prop-alias";
import {
  ensurePublishPlaceholderImageAssetId,
  getCachedPublishPlaceholderImageAssetId,
} from "@/features/cms-slots/model/cms-slot-publish-placeholder-image-asset";
import { exitUntilPageForComponentEnter } from "@/shared/lib/component-definition-scope";

export { CMS_SLOT_PUBLISH_PLACEHOLDER_URL };

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isStaticPropValue(v: unknown): v is StaticPropValue {
  return isRecord(v) && v.sourceType === "static";
}

function isBindingValue(v: unknown): v is BindingValue {
  return isRecord(v) && v.sourceType !== "static" && typeof v.sourceType === "string";
}

function isLinkResolvedValue(v: unknown): v is LinkResolvedValue {
  return v !== null && typeof v === "object" && "mode" in v;
}

function isLinkResolvedValueEmpty(v: LinkResolvedValue): boolean {
  if (v.mode === "url" || v.mode === "phone" || v.mode === "email") {
    return isBeaconPropValueEmpty(v.to);
  }
  return v.to == null;
}

function imageUrlFromResolved(v: unknown): string | null {
  if (typeof v === "string") {
    return v;
  }
  if (isRecord(v) && typeof v.url === "string") {
    return v.url;
  }
  return null;
}

function isImageResolvedValueEmpty(v: ResolvedValue, valueType: string): boolean | null {
  if (!isCmsSlotImageValueType(valueType)) {
    return null;
  }
  const imageUrl = imageUrlFromResolved(v);
  if (imageUrl != null) {
    return isBeaconPropValueEmpty(imageUrl) || isBeaconPublishPlaceholderValue(imageUrl);
  }
  if (typeof v === "string") {
    return isBeaconPropValueEmpty(v) || isBeaconPublishPlaceholderValue(v);
  }
  return null;
}

function isResolvedValueEmpty(v: ResolvedValue | null | undefined, valueType: string): boolean {
  if (v == null) {
    return true;
  }
  const imageEmpty = isImageResolvedValueEmpty(v, valueType);
  if (imageEmpty != null) {
    return imageEmpty;
  }
  if (typeof v === "string") {
    return isBeaconPropValueEmpty(v);
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return false;
  }
  if (typeof v === "object" && "innerText" in v) {
    return isBeaconPropValueEmpty((v as RichTextResolvedValue).innerText);
  }
  if (typeof v === "object" && "src" in v) {
    return isBeaconPropValueEmpty((v as VideoResolvedValue).src);
  }
  if (isLinkResolvedValue(v)) {
    return isLinkResolvedValueEmpty(v);
  }
  if (valueType === "boolean" || valueType === "visibility") {
    return false;
  }
  return false;
}

/** Webflow may surface unset props as `{ sourceType: "conditional" }` — still needs a publish placeholder. */
function isUnsetInstancePropBinding(v: unknown): boolean {
  return isBindingValue(v) && v.sourceType === "conditional";
}

function isActiveInstancePropBinding(v: unknown): boolean {
  return isBindingValue(v) && v.sourceType !== "conditional";
}

/** Whether the hidden list instance prop is unset — mirrors runtime empty checks for publish-time conditionals. */
export function isHiddenListInstancePropEmpty(summary: Pick<InstancePropSummary, "value">, valueType: string): boolean {
  const v = summary.value;
  if (v == null) {
    return true;
  }
  if (isUnsetInstancePropBinding(v)) {
    return true;
  }
  if (isActiveInstancePropBinding(v)) {
    return false;
  }
  return isResolvedValueEmpty(v as ResolvedValue, valueType);
}

/** `searchProps()` row — prefers `resolvedValue` for instance overrides on the canvas. */
export function isSearchInstancePropEmpty(prop: Pick<InstanceProp, "value" | "resolvedValue" | "valueType">): boolean {
  if (isStaticPropValue(prop.value)) {
    return isResolvedValueEmpty(prop.resolvedValue ?? prop.value.value, String(prop.valueType));
  }
  if (isUnsetInstancePropBinding(prop.value)) {
    return true;
  }
  if (isActiveInstancePropBinding(prop.value)) {
    return false;
  }
  return isResolvedValueEmpty(prop.resolvedValue, String(prop.valueType));
}

function findExposedMeta(
  exposed: readonly ComposableInstancePropMeta[],
  propId: string
): ComposableInstancePropMeta | undefined {
  const lower = propId.toLowerCase();
  return exposed.find((e) => e.propId === propId || e.propId.toLowerCase() === lower);
}

function findSearchProp(props: readonly InstanceProp[], propId: string): InstanceProp | undefined {
  const lower = propId.toLowerCase();
  return props.find((p) => p.propId === propId || p.propId.toLowerCase() === lower);
}

/** Minimal Designer `setProps` value so Webflow includes conditionally visible descendants in published HTML. */
export function publishPlaceholderForValueType(valueType: string): ResolvedValue {
  switch (valueType) {
    case "link":
      return { mode: "url", to: CMS_SLOT_PUBLISH_PLACEHOLDER_URL };
    case "url":
    case "video":
    case "videoUrl":
      return CMS_SLOT_PUBLISH_PLACEHOLDER_URL;
    case "email":
      return { mode: "email", to: "placeholder@codalyn.invalid" };
    case "phone":
      return { mode: "phone", to: "0" };
    case "boolean":
    case "visibility":
      return true;
    case "number":
      return 0;
    default:
      return "\u00a0";
  }
}

/** Minimal Designer `setProps` value from Engine-exposed prop metadata. */
export function publishPlaceholderForExposedProp(meta: Pick<ComposableInstancePropMeta, "valueType">): ResolvedValue {
  return publishPlaceholderForValueType(meta.valueType);
}

/**
 * `setProps` seed value for one exposed prop. Image types require a real site asset id (never a URL string).
 * Returns `null` when an image prop cannot be seeded (asset missing / create failed).
 */
export function resolveSeedPlaceholderValue(
  valueType: string,
  imagePlaceholderAssetId: string | null
): ResolvedValue | null {
  if (isCmsSlotImageValueType(valueType)) {
    return imagePlaceholderAssetId;
  }
  return publishPlaceholderForValueType(valueType);
}

function taggedExposedNeedsImagePlaceholder(
  taggedPropIds: ReadonlySet<string>,
  exposed: readonly ComposableInstancePropMeta[]
): boolean {
  for (const propId of taggedPropIds) {
    const meta = findExposedMeta(exposed, propId);
    if (meta != null && isCmsSlotImageValueType(meta.valueType)) {
      return true;
    }
  }
  return false;
}

/**
 * Seeds non-empty instance prop values on the hidden Engine list row so Webflow conditional visibility
 * (e.g. “visible when link is set”) includes tagged elements in the clone source at publish time.
 *
 * Must run on the **page instance** after {@link webflow.exitComponent} — `setProps` does not apply
 * instance overrides while editing the component definition.
 */
export async function seedHiddenListPublishPlaceholders(
  instance: ComponentElement,
  exposed: readonly ComposableInstancePropMeta[],
  taggedPropIds: ReadonlySet<string>
): Promise<number> {
  if (taggedPropIds.size === 0 || exposed.length === 0) {
    return 0;
  }

  const liveProps = await instance.searchProps().catch(() => [] as InstanceProp[]);
  const entries: SetInstancePropEntry[] = [];
  const imagePlaceholderAssetId = taggedExposedNeedsImagePlaceholder(taggedPropIds, exposed)
    ? await ensurePublishPlaceholderImageAssetId()
    : null;

  for (const propId of taggedPropIds) {
    const meta = findExposedMeta(exposed, propId);
    if (meta == null) {
      continue;
    }
    const live = findSearchProp(liveProps, propId);
    if (live != null && !isSearchInstancePropEmpty(live)) {
      continue;
    }
    const valueType = String(live?.valueType ?? meta.valueType);
    const value = resolveSeedPlaceholderValue(valueType, imagePlaceholderAssetId);
    if (value == null) {
      continue;
    }
    entries.push({
      propId: live?.propId ?? meta.propId,
      value,
    });
  }

  if (entries.length === 0) {
    return 0;
  }

  await instance.setProps(entries);
  return entries.length;
}

function resolvedValueMatchesPlaceholder(resolved: ResolvedValue | null | undefined, valueType: string): boolean {
  if (isCmsSlotImageValueType(valueType)) {
    const imageAssetId = getCachedPublishPlaceholderImageAssetId();
    if (imageAssetId != null && typeof resolved === "string") {
      return resolved === imageAssetId;
    }
    if (typeof resolved === "string") {
      return isBeaconPublishPlaceholderValue(resolved);
    }
    const imageUrl = imageUrlFromResolved(resolved);
    return imageUrl != null && isBeaconPublishPlaceholderValue(imageUrl);
  }
  const placeholder = publishPlaceholderForValueType(valueType);
  if (typeof placeholder === "string") {
    return typeof resolved === "string" && resolved === placeholder;
  }
  if (isLinkResolvedValue(placeholder) && isLinkResolvedValue(resolved)) {
    return placeholder.mode === resolved.mode && placeholder.to === resolved.to;
  }
  return false;
}

/**
 * Exposed parent props tagged inside a nested component need a static publish value on the list-row
 * instance. Never seed the nested instance — that breaks wiring to the parent exposed prop.
 */
export function needsParentSeedForNestedTaggedCanonical(
  prop: Pick<InstanceProp, "value" | "resolvedValue" | "valueType">,
  meta: Pick<ComposableInstancePropMeta, "valueType">
): boolean {
  const valueType = String(prop.valueType || meta.valueType);
  if (resolvedValueMatchesPlaceholder(prop.resolvedValue, valueType)) {
    return false;
  }
  if (isSearchInstancePropEmpty(prop)) {
    return true;
  }
  if (valueType === "link" && isLinkResolvedValue(prop.resolvedValue) && prop.resolvedValue.to === "#") {
    return true;
  }
  return false;
}

function parseNestedPublishSeedPairKey(key: string): NestedPublishSeedPair | null {
  const sep = key.indexOf("|");
  if (sep <= 0) {
    return null;
  }
  const nestedPropId = key.slice(0, sep);
  const canonicalPropId = key.slice(sep + 1);
  if (nestedPropId.length === 0 || canonicalPropId.length === 0) {
    return null;
  }
  return { nestedPropId, canonicalPropId };
}

function canonicalPropIdsFromNestedPublishSeedPairs(
  nestedPublishSeedPairKeys: ReadonlySet<string>,
  taggedPropIds: ReadonlySet<string>
): string[] {
  const ids = new Set<string>();
  for (const key of nestedPublishSeedPairKeys) {
    const pair = parseNestedPublishSeedPairKey(key);
    if (pair != null && taggedPropIds.has(pair.canonicalPropId)) {
      ids.add(pair.canonicalPropId);
    }
  }
  return [...ids];
}

function collectNestedPublishSeedEntries(
  canonicalPropIds: readonly string[],
  liveProps: readonly InstanceProp[],
  exposed: readonly ComposableInstancePropMeta[],
  imagePlaceholderAssetId: string | null
): SetInstancePropEntry[] {
  const entries: SetInstancePropEntry[] = [];
  for (const propId of canonicalPropIds) {
    const meta = findExposedMeta(exposed, propId);
    if (meta == null) {
      continue;
    }
    const live = findSearchProp(liveProps, propId);
    if (live != null && !needsParentSeedForNestedTaggedCanonical(live, meta)) {
      continue;
    }
    const valueType = String(live?.valueType ?? meta.valueType);
    const value = resolveSeedPlaceholderValue(valueType, imagePlaceholderAssetId);
    if (value == null) {
      continue;
    }
    entries.push({
      propId: live?.propId ?? meta.propId,
      value,
    });
  }
  return entries;
}

/**
 * Seeds static publish placeholders on the placed list-row instance for exposed props tagged inside
 * nested components. All `setProps` run at page scope on the parent exposed prop — never on nested
 * instance props, which would break wiring from the parent.
 */
export async function seedNestedPublishPlaceholdersOnPlacedInstance(
  parentInstance: ComponentElement,
  exposed: readonly ComposableInstancePropMeta[],
  taggedPropIds: ReadonlySet<string>,
  nestedPublishSeedPairKeys: ReadonlySet<string>
): Promise<number> {
  if (nestedPublishSeedPairKeys.size === 0 || taggedPropIds.size === 0) {
    return 0;
  }
  const canonicalPropIds = canonicalPropIdsFromNestedPublishSeedPairs(nestedPublishSeedPairKeys, taggedPropIds);
  if (canonicalPropIds.length === 0) {
    return 0;
  }

  await exitUntilPageForComponentEnter();

  const liveProps = await parentInstance.searchProps().catch(() => [] as InstanceProp[]);
  const imagePlaceholderAssetId = canonicalPropIds.some((propId) => {
    const meta = findExposedMeta(exposed, propId);
    return meta != null && isCmsSlotImageValueType(meta.valueType);
  })
    ? await ensurePublishPlaceholderImageAssetId()
    : null;
  const entries = collectNestedPublishSeedEntries(canonicalPropIds, liveProps, exposed, imagePlaceholderAssetId);

  if (entries.length === 0) {
    return 0;
  }

  await parentInstance.setProps(entries);
  return entries.length;
}
