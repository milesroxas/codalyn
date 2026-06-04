import { webflowElementIdKey, webflowTreeNodeKey } from "@/features/image-editor/lib/webflow-element-id-key";

export type WebflowStructureChildSource = {
  getChildren?: () => Promise<AnyElement[] | null>;
};

export async function readWebflowElementChildren(node: unknown): Promise<AnyElement[]> {
  if (node == null || typeof node !== "object") {
    return [];
  }
  const source = node as WebflowStructureChildSource;
  if (typeof source.getChildren !== "function") {
    return [];
  }
  const children = await source.getChildren();
  return children ?? [];
}

/** Public children plus each slot’s children for a component instance. */
async function enqueueWebflowStructureChildren(node: AnyElement, queue: AnyElement[]): Promise<void> {
  for (const child of await readWebflowElementChildren(node)) {
    queue.push(child);
  }
  if (node.type !== "ComponentInstance") {
    return;
  }
  const instance = node as ComponentElement;
  const slots = await instance.getSlots().catch(() => [] as Awaited<ReturnType<ComponentElement["getSlots"]>>);
  for (const slot of slots) {
    for (const child of await readWebflowElementChildren(slot as unknown as WebflowStructureChildSource)) {
      queue.push(child);
    }
  }
}

export type WebflowStructureBfsVisitResult = "continue" | "stop";

export async function walkWebflowStructureBfs(
  startNodes: readonly AnyElement[],
  visit: (node: AnyElement) => Promise<WebflowStructureBfsVisitResult>
): Promise<void> {
  const seen = new Set<string>();
  const queue = [...startNodes];
  while (queue.length > 0) {
    const node = queue.shift() as AnyElement;
    const key = webflowElementIdKey(node);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const result = await visit(node);
    if (result === "stop") {
      return;
    }
    await enqueueWebflowStructureChildren(node, queue);
  }
}

async function readWebflowPageStructureStart(): Promise<AnyElement | null> {
  const all = await webflow.getAllElements();
  return (
    all.find((e) => e.type === "Body") ??
    (await (webflow as { getRootElement?: () => Promise<AnyElement | null> }).getRootElement?.().catch(() => null)) ??
    null
  );
}

async function visitWebflowStructureNodeCanvasOrder(
  el: AnyElement,
  seen: Set<string>,
  out: AnyElement[]
): Promise<void> {
  const key = webflowTreeNodeKey(el);
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  out.push(el);

  for (const child of await readWebflowElementChildren(el)) {
    await visitWebflowStructureNodeCanvasOrder(child, seen, out);
  }
  if (el.type !== "ComponentInstance") {
    return;
  }
  const slots = await (el as ComponentElement)
    .getSlots()
    .catch(() => [] as Awaited<ReturnType<ComponentElement["getSlots"]>>);
  for (const slot of slots) {
    for (const child of await readWebflowElementChildren(slot as unknown as WebflowStructureChildSource)) {
      await visitWebflowStructureNodeCanvasOrder(child, seen, out);
    }
  }
}

async function visitComponentInstanceInteriorCanvasOrder(
  inst: ComponentElement,
  seen: Set<string>,
  out: AnyElement[]
): Promise<void> {
  for (const child of await readWebflowElementChildren(inst)) {
    await visitWebflowStructureNodeCanvasOrder(child, seen, out);
  }
  const slots = await inst.getSlots().catch(() => [] as Awaited<ReturnType<ComponentElement["getSlots"]>>);
  for (const slot of slots) {
    for (const child of await readWebflowElementChildren(slot as unknown as WebflowStructureChildSource)) {
      await visitWebflowStructureNodeCanvasOrder(child, seen, out);
    }
  }
}

/**
 * Every page node in **canvas / DOM order** (depth-first preorder from `Body`), including
 * nested component instances and **slot** content — same reachability as BFS collection,
 * but ordered top-to-bottom as in the Designer navigator.
 */
export async function collectWebflowStructureNodesInCanvasOrder(): Promise<AnyElement[]> {
  const all = await webflow.getAllElements();
  const start = await readWebflowPageStructureStart();
  if (start == null) {
    return [];
  }

  const seen = new Set<string>();
  const out: AnyElement[] = [];
  await visitWebflowStructureNodeCanvasOrder(start, seen, out);

  for (const el of all) {
    if (el.type === "ComponentInstance") {
      await visitComponentInstanceInteriorCanvasOrder(el as ComponentElement, seen, out);
    }
  }

  return out;
}
