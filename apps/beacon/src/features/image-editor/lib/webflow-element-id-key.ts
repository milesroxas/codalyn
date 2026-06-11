/** Stable id for `Map` keys when associating a Webflow `AnyElement` with its parent. */
export function webflowElementIdKey(el: AnyElement): string {
  return `${el.id.component}|${el.id.element}`;
}

function stableWebflowIdFallbackKey(id: object): string {
  const record = id as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of keys) {
    normalized[key] = record[key];
  }
  return JSON.stringify(normalized);
}

/**
 * Map key for parent-graph walks (elements + **slot instances**). Uses explicit id fields
 * so lookups match `linkAsChildOf` / `getChildren` **even when** different `id` object
 * references yield different `JSON.stringify` key order.
 */
export function webflowTreeNodeKey(node: { id: object }): string {
  const id = node.id as {
    component?: string;
    element?: string;
    slot?: string;
  };
  if (typeof id.component === "string" && typeof id.element === "string") {
    if (typeof id.slot === "string") {
      return `${id.component}|${id.element}|${id.slot}`;
    }
    return `${id.component}|${id.element}`;
  }
  return stableWebflowIdFallbackKey(node.id);
}
