import {
  CMS_SLOT_PUBLISH_PLACEHOLDER_URL,
  isBeaconPropValueEmpty,
  isBeaconPublishPlaceholderValue,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import {
  type ComposableInstancePropMeta,
  isCmsSlotImageValueType,
} from "@/features/cms-slots/model/cms-slot-composable-props";
import { ensurePublishPlaceholderImageAssetId } from "@/features/cms-slots/model/cms-slot-publish-placeholder-image-asset";
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

/** Minimal Designer `setProps` value from Designer-exposed prop metadata. */
export function publishPlaceholderForExposedProp(meta: Pick<ComposableInstancePropMeta, "valueType">): ResolvedValue {
  return publishPlaceholderForValueType(meta.valueType);
}

/**
 * `setProps` seed value for one prop. Image types require a real site asset id (never a URL string).
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

type ConditionalSeedTarget = { propId: string; valueType: string };

function collectConditionalSeedTargets(
  controllerPropIds: ReadonlySet<string>,
  liveProps: readonly InstanceProp[]
): ConditionalSeedTarget[] {
  const targets: ConditionalSeedTarget[] = [];
  for (const propId of controllerPropIds) {
    const live = findSearchProp(liveProps, propId);
    if (live == null || !isSearchInstancePropEmpty(live)) {
      continue;
    }
    targets.push({ propId: live.propId, valueType: String(live.valueType) });
  }
  return targets;
}

/**
 * Seeds a truthy publish placeholder on every controller prop of a conditionally-visible element so Webflow keeps
 * those nodes in the published clone source. Runs on the **page instance** after {@link webflow.exitComponent}
 * (`setProps` does not apply instance overrides while editing the component definition). Only empty controllers are
 * seeded; content-only (non-conditional) props are left at their authored default.
 */
export async function seedConditionalControllerPlaceholders(
  instance: ComponentElement,
  controllerPropIds: ReadonlySet<string>
): Promise<number> {
  if (controllerPropIds.size === 0) {
    return 0;
  }

  await exitUntilPageForComponentEnter();

  const liveProps = await instance.searchProps().catch(() => [] as InstanceProp[]);
  const targets = collectConditionalSeedTargets(controllerPropIds, liveProps);
  if (targets.length === 0) {
    return 0;
  }

  const imagePlaceholderAssetId = targets.some((t) => isCmsSlotImageValueType(t.valueType))
    ? await ensurePublishPlaceholderImageAssetId()
    : null;

  const entries: SetInstancePropEntry[] = [];
  for (const target of targets) {
    const value = resolveSeedPlaceholderValue(target.valueType || "string", imagePlaceholderAssetId);
    if (value == null) {
      continue;
    }
    entries.push({ propId: target.propId, value });
  }

  if (entries.length === 0) {
    return 0;
  }

  await instance.setProps(entries);
  return entries.length;
}
