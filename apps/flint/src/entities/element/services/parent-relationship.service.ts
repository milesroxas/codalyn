import type { WebflowElement } from "@/entities/element/model/element.types";
import { toElementKey } from "../lib/id";

function elementTypeLabel(element: WebflowElement): string {
  return (element as any)?.type || "(empty/slot)";
}

function isSlotLike(element: WebflowElement): boolean {
  const t = elementTypeLabel(element);
  return !t || t === "(empty/slot)";
}

async function mapChildrenFromParent(
  element: WebflowElement,
  parentId: string,
  elementIdSet: Set<string>,
  parentIdByChildId: Record<string, string | null>,
  discoveredElements: WebflowElement[]
): Promise<void> {
  if (typeof (element as any).getChildren !== "function") {
    if (isSlotLike(element)) {
      console.log(`[ParentRelationshipService] Slot ${parentId} has NO getChildren method`);
    }
    return;
  }

  try {
    const children = await (element as any).getChildren();
    const isSlot = isSlotLike(element);

    if (isSlot) {
      console.log(
        `[ParentRelationshipService] Slot ${parentId} getChildren returned:`,
        Array.isArray(children) ? children.length : children
      );
    }

    if (!Array.isArray(children)) {
      return;
    }

    for (const child of children) {
      const childId = toElementKey(child);
      const childType = elementTypeLabel(child);
      parentIdByChildId[childId] = parentId;

      if (isSlot) {
        console.log(`[ParentRelationshipService] Slot child found: ${childId} (type: ${childType})`);
      }

      if (!elementIdSet.has(childId)) {
        elementIdSet.add(childId);
        discoveredElements.push(child);
        console.log(`[ParentRelationshipService] Discovered new element: ${childId} (type: ${childType})`);
      }
    }
  } catch (error) {
    console.warn(`[ParentRelationshipService] getChildren error for element ${parentId}:`, error);
  }
}

function logElementsDebug(elements: WebflowElement[]): void {
  console.log(`[ParentRelationshipService] Processing ${elements.length} elements:`);
  for (const el of elements) {
    const elType = (el as any)?.type || "(empty/slot)";
    console.log(`  - ${toElementKey(el)}: ${elType}`);
  }
}

function logFinalMap(parentIdByChildId: Record<string, string | null>, discoveredCount: number): void {
  console.log(`[ParentRelationshipService] Final parent-child map:`);
  for (const [childId, parentId] of Object.entries(parentIdByChildId)) {
    if (parentId) {
      console.log(`  ${childId} -> parent: ${parentId}`);
    }
  }
  console.log(`[ParentRelationshipService] Total discovered: ${discoveredCount}`);
}

export interface ParentChildMapResult {
  parentIdByChildId: Record<string, string | null>;
  discoveredElements: WebflowElement[];
}

export interface ParentRelationshipService {
  buildParentChildMap: (elements: WebflowElement[]) => Promise<Record<string, string | null>>;
  buildParentChildMapWithDiscovery: (elements: WebflowElement[]) => Promise<ParentChildMapResult>;
}

/**
 * Creates a service to build parent-child relationships using Webflow's getChildren() API
 * This addresses the limitation that elements don't have a reliable getParent() method
 */
export function createParentRelationshipService(): ParentRelationshipService {
  async function buildParentChildMapWithDiscovery(
    elements: WebflowElement[],
    existingMap: Record<string, string | null> = {}
  ): Promise<ParentChildMapResult> {
    const parentIdByChildId: Record<string, string | null> = { ...existingMap };
    const elementIdSet = new Set(elements.map((element) => toElementKey(element)));
    const discoveredElements: WebflowElement[] = [];

    // Initialize elements with null parent ONLY if not already in the map
    for (const element of elements) {
      const key = toElementKey(element);
      if (!(key in parentIdByChildId)) {
        parentIdByChildId[key] = null;
      }
    }

    logElementsDebug(elements);

    // Build parent-child relationships by traversing from each element using getChildren()
    // Also discover children that weren't in the original elements set (e.g., slot children)
    for (const element of elements) {
      const parentId = toElementKey(element);
      if (isSlotLike(element)) {
        console.log(`[ParentRelationshipService] Processing slot element: ${parentId}`);
      }
      await mapChildrenFromParent(element, parentId, elementIdSet, parentIdByChildId, discoveredElements);
    }

    // Recursively process discovered elements to find their children too
    if (discoveredElements.length > 0) {
      // Pass the current map so discovered elements keep their parent relationships
      const nested = await buildParentChildMapWithDiscovery(discoveredElements, parentIdByChildId);
      // Merge nested discoveries (nested map already includes current map)
      Object.assign(parentIdByChildId, nested.parentIdByChildId);
      discoveredElements.push(...nested.discoveredElements);
    }

    logFinalMap(parentIdByChildId, discoveredElements.length);

    return { parentIdByChildId, discoveredElements };
  }

  // Legacy method for backwards compatibility
  async function buildParentChildMap(elements: WebflowElement[]): Promise<Record<string, string | null>> {
    const result = await buildParentChildMapWithDiscovery(elements);
    return result.parentIdByChildId;
  }

  return {
    buildParentChildMap,
    buildParentChildMapWithDiscovery,
  } as const;
}

export type ParentRelationshipServiceType = ReturnType<typeof createParentRelationshipService>;
