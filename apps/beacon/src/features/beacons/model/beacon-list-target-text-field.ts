import { listBeaconListTargetInstancesOnPage } from "@/features/beacons/model/beacon-list-target-instances-on-page";
import { exitCurrentComponentIfAny } from "@/features/image-editor/lib/with-image-element-for-page-target";
import { BEACON_COMPONENT_STRING_PROPS_GROUP } from "@/shared/lib/beacon-component-string-prop";

const MAX_NESTED_COMPONENT_EXITS = 8;
const LOG_PREFIX = "[beacon list target text]";

/**
 * List-target copy field: a **`textContent`** component prop, bound to the root div’s text so instance controls
 * match Webflow’s text binding (a plain `string` prop is not connected to the canvas text).
 */
export const BEACON_LIST_TARGET_TEXT_PROP_NAME = "Text" as const;

function listTargetTextFieldProp(props: readonly Prop[]): Prop | undefined {
  return props.find(
    (p) => p.name === BEACON_LIST_TARGET_TEXT_PROP_NAME && (p.type === "textContent" || p.type === "string")
  );
}

function beaconListTargetTextContentPropOptions() {
  return {
    type: "textContent" as const,
    name: BEACON_LIST_TARGET_TEXT_PROP_NAME,
    group: BEACON_COMPONENT_STRING_PROPS_GROUP,
    defaultValue: "",
  };
}

/**
 * True when a **definition** has a “Text” field (`textContent` or legacy `string`).
 */
export async function beaconListTargetHasTextProp(component: Component): Promise<boolean> {
  return listTargetTextFieldProp(await component.getProps()) != null;
}

/**
 * Binds the list-target root div’s text setting to the “Text” component prop so per-instance values drive the
 * same DOM the data attributes are on.
 */
async function tryBindListTargetTextPropToRootDom(def: Component): Promise<void> {
  const root = await def.getRootElement();
  if (root == null || root.type !== "DOM") {
    return;
  }
  const dom = root as DOMElement;
  if (typeof dom.searchSettings !== "function") {
    return;
  }
  const p = listTargetTextFieldProp(await def.getProps());
  if (p == null) {
    return;
  }

  let map = await dom.searchSettings({ valueType: p.valueType });
  if (Object.keys(map).length === 0 && dom.textContent === true) {
    await dom.setTextContent("");
    map = await dom.searchSettings({ valueType: p.valueType });
  }
  if (Object.keys(map).length === 0 && p.valueType !== "textContent") {
    map = await dom.searchSettings({ valueType: "textContent" });
  }

  for (const [key, se] of Object.entries(map)) {
    if (se.canBind) {
      const input: SetSettingsInput = { [key]: { sourceType: "prop", propId: p.id } };
      await dom.setSettings(input);
      return;
    }
  }
}

/**
 * Creates the `textContent` “Text” prop (when missing) and binds it to the root. Call after the builder root has
 * `setTextContent` in {@link createBeaconListTargetComponent}.
 * @returns `true` if the field exists after the call (or already existed), `false` if creation is not allowed or failed.
 */
export async function tryAddBeaconListTargetTextPropDirectToDefinition(def: Component): Promise<boolean> {
  const has = listTargetTextFieldProp(await def.getProps()) != null;
  const perms = await webflow.canForAppMode([webflow.appModes.canModifyComponents]);
  const canModify = perms[webflow.appModes.canModifyComponents];

  if (has) {
    if (canModify) {
      await tryBindListTargetTextPropToRootDom(def);
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
  if (listTargetTextFieldProp(await def.getProps()) == null) {
    return false;
  }
  await tryBindListTargetTextPropToRootDom(def);
  return true;
}

async function exitUntilPageForInstanceEnter(): Promise<void> {
  for (let step = 0; step < MAX_NESTED_COMPONENT_EXITS; step += 1) {
    await exitCurrentComponentIfAny();
    if ((await webflow.getCurrentComponent().catch(() => null)) == null) {
      return;
    }
  }
}

/**
 * When direct `createProps` on the definition is not available, use the same pattern as image export: page context →
 * `enterComponent` → `getCurrentComponent` → `createProps` → `exitComponent`.
 */
async function addListTargetTextPropByEnteringInstance(
  def: Component,
  input: { dataList: string; listContainer: BlockElement }
): Promise<void> {
  if (listTargetTextFieldProp(await def.getProps()) != null) {
    await tryBindListTargetTextPropToRootDom(def);
    return;
  }
  const perms = await webflow.canForAppMode([webflow.appModes.canModifyComponents]);
  if (!perms[webflow.appModes.canModifyComponents]) {
    return;
  }

  const instances = await listBeaconListTargetInstancesOnPage(input.dataList, input.listContainer, {
    maxMatches: 1,
    preferredDefinitionId: def.id,
  });
  const instance = instances[0];
  if (instance == null) {
    return;
  }

  await exitUntilPageForInstanceEnter();

  let entered = false;
  try {
    await webflow.enterComponent(instance);
    entered = true;
  } catch (e) {
    console.warn(LOG_PREFIX, "enterComponent failed (instance path)", e);
    return;
  }
  try {
    const editingDef = await webflow.getCurrentComponent();
    if (editingDef == null || editingDef.id !== def.id) {
      return;
    }
    if (listTargetTextFieldProp(await editingDef.getProps()) != null) {
      await tryBindListTargetTextPropToRootDom(editingDef);
      return;
    }
    await editingDef.createProps([beaconListTargetTextContentPropOptions()]);
    await tryBindListTargetTextPropToRootDom(editingDef);
  } finally {
    if (entered) {
      try {
        await webflow.exitComponent();
      } catch (e) {
        console.warn(LOG_PREFIX, "exitComponent failed (non-fatal)", e);
      }
    }
  }

  if (listTargetTextFieldProp(await def.getProps()) != null) {
    return;
  }
  const defName = await def.getName();
  // “Beacon Utilities” matches `BEACON_UTILITIES_COMPONENT_GROUP` in create-beacon-list-target-component.
  throw new Error(
    `Could not add the “Text” field. Open the list target from Components → “Beacon Utilities” → “${defName}” and use Place on canvas, or add a Text (text) field in the component settings.`
  );
}

/**
 * Ensures the `textContent` “Text” prop and DOM binding. Tries a direct `createProps` on the definition first, then
 * the image-style `enterComponent` path when the instance is on the page.
 */
export async function ensureBeaconListTargetTextProp(
  def: Component,
  input: { dataList: string; listContainer: BlockElement }
): Promise<void> {
  if (await tryAddBeaconListTargetTextPropDirectToDefinition(def)) {
    return;
  }
  try {
    await addListTargetTextPropByEnteringInstance(def, input);
  } catch (e) {
    if (listTargetTextFieldProp(await def.getProps()) != null) {
      return;
    }
    throw e;
  }
}
