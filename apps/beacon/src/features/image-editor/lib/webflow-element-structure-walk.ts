import { webflowElementIdKey } from "@/features/image-editor/lib/webflow-element-id-key";

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
export async function enqueueWebflowStructureChildren(node: AnyElement, queue: AnyElement[]): Promise<void> {
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
