import { CMS_SLOT_COMPONENT_STRING_PROPS_GROUP } from "@/shared/lib/beacon-component-string-prop";

/**
 * List-target copy field: a `textContent` component prop bound to the root div’s text setting so per-instance
 * values drive the same DOM the data attributes are on. A plain `string` prop is not connected to canvas text;
 * legacy components may still expose `string` so reads tolerate both.
 */
export const CMS_SLOT_LIST_TARGET_TEXT_PROP_NAME = "Text" as const;

export type CmsSlotListTargetTextProp = {
  id: string;
  valueType: BindableValueType;
};

function listTargetTextFieldProp(props: readonly Prop[]): Prop | undefined {
  return props.find(
    (p) => p.name === CMS_SLOT_LIST_TARGET_TEXT_PROP_NAME && (p.type === "textContent" || p.type === "string")
  );
}

/**
 * `{id, valueType}` for the Text prop, or `null` when missing.
 */
export async function getCmsSlotListTargetTextProp(component: Component): Promise<CmsSlotListTargetTextProp | null> {
  const found = listTargetTextFieldProp(await component.getProps());
  return found != null ? { id: found.id, valueType: found.valueType } : null;
}

/** Shorthand for callers that only need the prop id. */
export async function getCmsSlotListTargetTextPropId(component: Component): Promise<string | null> {
  return (await getCmsSlotListTargetTextProp(component))?.id ?? null;
}

export async function cmsSlotListTargetHasTextProp(component: Component): Promise<boolean> {
  return listTargetTextFieldProp(await component.getProps()) != null;
}

function beaconListTargetTextContentPropOptions() {
  return {
    type: "textContent" as const,
    name: CMS_SLOT_LIST_TARGET_TEXT_PROP_NAME,
    group: CMS_SLOT_COMPONENT_STRING_PROPS_GROUP,
    defaultValue: "",
  };
}

async function bindListTargetTextPropToRootDom(def: Component, prop: Prop): Promise<void> {
  const root = await def.getRootElement();
  if (root == null || root.type !== "DOM") {
    return;
  }
  const dom = root as DOMElement;
  if (typeof dom.searchSettings !== "function") {
    return;
  }

  let map = await dom.searchSettings({ valueType: prop.valueType });
  if (Object.keys(map).length === 0 && dom.textContent === true) {
    await dom.setTextContent("");
    map = await dom.searchSettings({ valueType: prop.valueType });
  }
  if (Object.keys(map).length === 0 && prop.valueType !== "textContent") {
    map = await dom.searchSettings({ valueType: "textContent" });
  }

  for (const [key, setting] of Object.entries(map)) {
    if (setting.canBind) {
      const input: SetSettingsInput = { [key]: { sourceType: "prop", propId: prop.id } };
      await dom.setSettings(input);
      return;
    }
  }
}

async function userCanModifyComponents(): Promise<boolean> {
  const perms = await webflow.canForAppMode([webflow.appModes.canModifyComponents]);
  return perms[webflow.appModes.canModifyComponents];
}

/**
 * Idempotent: returns `true` when the Text prop exists (creating + binding it to the root if needed) and `false`
 * when the user lacks `canModifyComponents` and the prop is still missing. Throws only on unexpected errors from
 * the Designer API; `createProps` failures are surfaced as `false` so callers can decide whether to escalate.
 */
export async function tryAddCmsSlotListTargetTextPropDirectToDefinition(def: Component): Promise<boolean> {
  const existing = listTargetTextFieldProp(await def.getProps());
  const canModify = await userCanModifyComponents();

  if (existing != null) {
    if (canModify) {
      await bindListTargetTextPropToRootDom(def, existing);
    }
    return true;
  }
  if (!canModify) {
    return false;
  }
  try {
    await def.createProps([beaconListTargetTextContentPropOptions()]);
  } catch {
    return false;
  }
  const created = listTargetTextFieldProp(await def.getProps());
  if (created == null) {
    return false;
  }
  await bindListTargetTextPropToRootDom(def, created);
  return true;
}

/**
 * Ensures the `textContent` Text prop exists on a list-target definition we own (registered via
 * {@link createCmsSlotListTargetComponent}). Throws when the prop can’t be added so callers can surface a clear
 * error instead of silently binding to nothing.
 */
export async function ensureCmsSlotListTargetTextProp(def: Component): Promise<void> {
  if (await tryAddCmsSlotListTargetTextPropDirectToDefinition(def)) {
    return;
  }
  throw new Error(
    "Could not add the “Text” field to the list target. Open the project so it can be edited and try again."
  );
}
