import { instanceMatchesCmsSlotListTargetSurface } from "@/features/cms-slots/model/cms-slot-list-target-instance-surface";
import {
  CMS_SLOT_UTILITIES_COMPONENT_GROUP,
  getCmsSlotListTargetComponentOrNull,
} from "@/features/cms-slots/model/create-cms-slot-list-target-component";

export type ListCmsSlotListTargetInstancesOnPageOptions = {
  /**
   * Stop after this many list-target instances that pass the mirror surface check.
   * Use `1` for cheap “any on canvas” checks: each check calls `enterComponent` / `exitComponent` (see
   * {@link instanceMatchesCmsSlotListTargetSurface}).
   */
  maxMatches?: number;
  /** Same as {@link getCmsSlotListTargetComponentOrNull} third argument (fresh id after create). */
  preferredDefinitionId?: string | null;
};

async function instanceMatchesRegisteredCmsSlotListTargetIdentity(
  inst: ComponentElement,
  expectedName: string,
  expectedGroup: string
): Promise<boolean> {
  if (expectedGroup !== CMS_SLOT_UTILITIES_COMPONENT_GROUP) {
    return false;
  }
  const c = await inst.getComponent();
  if ((await c.getName()) !== expectedName) {
    return false;
  }
  if ((await c.getSettings()).group !== expectedGroup) {
    return false;
  }
  return true;
}

async function instanceMatchesRegisteredCmsSlotListTarget(
  inst: ComponentElement,
  expectedName: string,
  expectedGroup: string,
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  if (!(await instanceMatchesRegisteredCmsSlotListTargetIdentity(inst, expectedName, expectedGroup))) {
    return false;
  }
  return instanceMatchesCmsSlotListTargetSurface(inst, dataList, listContainer);
}

/**
 * Resolves the current list-renderer’s registered name + group, then finds every **Component** instance on the
 * **current** page where `getComponent()` matches that name and group. Uses name/group (the stable identity in the
 * UI) instead of `Component.id` comparison, which can diverge from instance `getComponent().id` in practice.
 */
export async function listCmsSlotListTargetInstancesOnPage(
  dataList: string,
  listContainer: BlockElement,
  options?: ListCmsSlotListTargetInstancesOnPageOptions
): Promise<ComponentElement[]> {
  const listTarget = await getCmsSlotListTargetComponentOrNull(dataList, listContainer, options?.preferredDefinitionId);
  if (listTarget == null) {
    return [];
  }
  const expectedName = await listTarget.getName();
  const expectedGroup = (await listTarget.getSettings()).group;
  if (expectedGroup !== CMS_SLOT_UTILITIES_COMPONENT_GROUP) {
    return [];
  }

  const all = await webflow.getAllElements();
  const out: ComponentElement[] = [];
  const cap = options?.maxMatches;

  for (const el of all) {
    if (el.type !== "ComponentInstance") {
      continue;
    }
    const inst = el as ComponentElement;
    if (await instanceMatchesRegisteredCmsSlotListTarget(inst, expectedName, expectedGroup, dataList, listContainer)) {
      out.push(inst);
      if (cap != null && out.length >= cap) {
        break;
      }
    }
  }
  return out;
}

/** True when the Designer’s current selection is a list-target instance for this CMS slot. */
export async function isCmsSlotListTargetInstanceSelected(
  dataList: string,
  listContainer: BlockElement,
  options?: ListCmsSlotListTargetInstancesOnPageOptions
): Promise<boolean> {
  const selected = await webflow.getSelectedElement();
  if (selected == null || selected.type !== "ComponentInstance") {
    return false;
  }
  const listTarget = await getCmsSlotListTargetComponentOrNull(dataList, listContainer, options?.preferredDefinitionId);
  if (listTarget == null) {
    return false;
  }
  const expectedName = await listTarget.getName();
  const expectedGroup = (await listTarget.getSettings()).group;
  // Name/group only — do not enter/exit the component on every selection event (causes Designer flicker).
  return instanceMatchesRegisteredCmsSlotListTargetIdentity(selected as ComponentElement, expectedName, expectedGroup);
}

/**
 * Deletes every list-target (Beacon Utilities) **instance** on the current page for this CMS slot. Call **before**
 * {@link webflow.unregisterComponent} on that list-target definition so the canvas is not left with broken instances
 * and a new list target can be registered cleanly.
 */
export async function removeAllCmsSlotListTargetInstancesOnPage(
  dataList: string,
  listContainer: BlockElement,
  options?: ListCmsSlotListTargetInstancesOnPageOptions
): Promise<void> {
  const instances = await listCmsSlotListTargetInstancesOnPage(dataList, listContainer, options);
  for (const inst of instances) {
    try {
      await inst.remove();
    } catch (e) {
      console.warn("[beacon] remove list target instance failed (non-fatal):", e);
    }
  }
}

/** Removes every instance of `definition` on the current page (by definition id, then name + group). */
export async function removeAllInstancesOfComponentOnPage(definition: Component): Promise<void> {
  const expectedId = definition.id;
  const expectedName = await definition.getName();
  const expectedGroup = (await definition.getSettings()).group;
  const all = await webflow.getAllElements();
  for (const el of all) {
    if (el.type !== "ComponentInstance") {
      continue;
    }
    const inst = el as ComponentElement;
    const c = await inst.getComponent();
    if (c.id !== expectedId && (await c.getName()) !== expectedName) {
      continue;
    }
    if ((await c.getSettings()).group !== expectedGroup) {
      continue;
    }
    try {
      await inst.remove();
    } catch (e) {
      console.warn("[beacon] remove component instance failed (non-fatal):", e);
    }
  }
}

/**
 * List-target instances on the page by **name + group identity only** — no `enterComponent` / `exitComponent`
 * surface check.
 *
 * The surface check ({@link listCmsSlotListTargetInstancesOnPage}) leaves the entered instance **selected**: Webflow
 * selects the component instance on `exitComponent`. Driving on-open gates or read-only inspection through it
 * contaminates the Designer selection and visibly flickers the canvas (entering/exiting each instance) — the
 * "Select on canvas" button then falsely reads as already selected even though the user selected nothing. Identity is
 * enough for presence/count and for reading instance props (`searchProps` reads from the page-level instance without
 * entering); precise collision filtering (the surface check) is only for mutation targeting, where a selection
 * change is acceptable.
 */
export async function listCmsSlotListTargetInstancesOnPageByName(
  dataList: string,
  listContainer: BlockElement,
  options?: ListCmsSlotListTargetInstancesOnPageOptions
): Promise<ComponentElement[]> {
  const listTarget = await getCmsSlotListTargetComponentOrNull(dataList, listContainer, options?.preferredDefinitionId);
  if (listTarget == null) {
    return [];
  }
  const expectedName = await listTarget.getName();
  const expectedGroup = (await listTarget.getSettings()).group;
  if (expectedGroup !== CMS_SLOT_UTILITIES_COMPONENT_GROUP) {
    return [];
  }

  const all = await webflow.getAllElements();
  const out: ComponentElement[] = [];
  for (const el of all) {
    if (el.type !== "ComponentInstance") {
      continue;
    }
    const inst = el as ComponentElement;
    if (await instanceMatchesRegisteredCmsSlotListTargetIdentity(inst, expectedName, expectedGroup)) {
      out.push(inst);
    }
  }
  return out;
}

/** Count of {@link listCmsSlotListTargetInstancesOnPageByName} — identity only, no surface check / selection change. */
export async function countCmsSlotListTargetInstancesOnPageByName(
  dataList: string,
  listContainer: BlockElement,
  options?: ListCmsSlotListTargetInstancesOnPageOptions
): Promise<number> {
  return (await listCmsSlotListTargetInstancesOnPageByName(dataList, listContainer, options)).length;
}

/**
 * True when a component instance on the current page matches the list-target by name/group.
 * Skips the mirror-surface check (no `enterComponent` / `exitComponent`) — for Composer list eligibility
 * and other read-only gating. Designer flows that need a precise match use
 * {@link listCmsSlotListTargetInstancesOnPage} instead.
 */
export async function hasCmsSlotListTargetInstanceOnPageByName(
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  const listTarget = await getCmsSlotListTargetComponentOrNull(dataList, listContainer);
  if (listTarget == null) {
    return false;
  }
  const expectedName = await listTarget.getName();
  const expectedGroup = (await listTarget.getSettings()).group;
  if (expectedGroup !== CMS_SLOT_UTILITIES_COMPONENT_GROUP) {
    return false;
  }

  const all = await webflow.getAllElements();
  for (const el of all) {
    if (el.type !== "ComponentInstance") {
      continue;
    }
    const inst = el as ComponentElement;
    const c = await inst.getComponent();
    if ((await c.getName()) !== expectedName) {
      continue;
    }
    if ((await c.getSettings()).group !== expectedGroup) {
      continue;
    }
    return true;
  }
  return false;
}
