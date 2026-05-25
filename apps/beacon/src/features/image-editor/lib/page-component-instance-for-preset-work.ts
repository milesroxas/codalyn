import { readComponentDefinitionIdForInstance } from "@/features/image-editor/lib/read-component-definition-id";
import { collectAllPageElementsForImageScan } from "@/features/image-editor/lib/scan-image-targets-on-page";
import {
  type ComponentDefinitionScope,
  exitCurrentComponentIfAny,
  preparePageCanvasForWork,
  withComponentDefinitionScope,
} from "@/shared/lib/component-definition-scope";

export async function findComponentInstanceByDefinitionIdOnPage(
  componentDefinitionId: string
): Promise<ComponentElement | null> {
  const all = await collectAllPageElementsForImageScan();
  for (const el of all) {
    if (el.type !== "ComponentInstance") {
      continue;
    }
    const inst = el as ComponentElement;
    const definitionId = await readComponentDefinitionIdForInstance(inst);
    if (definitionId === componentDefinitionId) {
      return inst;
    }
  }
  return null;
}

async function readPageBodyOrThrow(): Promise<AnyElement> {
  const all = await webflow.getAllElements();
  const body = all.find((e) => e.type === "Body");
  if (body == null) {
    throw new Error("Could not find a Body element on this page.");
  }
  return body;
}

export async function appendComponentDefinitionToPageBody(componentDefinitionId: string): Promise<ComponentElement> {
  const definition = await webflow.getComponent(componentDefinitionId);
  const body = await readPageBodyOrThrow();
  const append = (body as { append?: (component: Component) => Promise<ComponentElement> }).append;
  if (typeof append !== "function") {
    throw new Error("Could not place this component on the page body.");
  }
  return append.call(body, definition);
}

export async function ensureComponentInstanceOnPage(input: {
  componentDefinitionId: string;
  pageIdHint?: string | null;
  /** When provided, skips find/place and uses this page instance directly. */
  instance?: ComponentElement | null;
}): Promise<{ instance: ComponentElement; temporary: boolean }> {
  await preparePageCanvasForWork(input.pageIdHint ?? null);

  let instance = input.instance ?? null;
  if (instance == null) {
    instance = await findComponentInstanceByDefinitionIdOnPage(input.componentDefinitionId);
  }
  if (instance != null) {
    return { instance, temporary: false };
  }

  return {
    instance: await appendComponentDefinitionToPageBody(input.componentDefinitionId),
    temporary: true,
  };
}

export async function removeTemporaryPageComponentInstance(instance: ComponentElement): Promise<void> {
  await exitCurrentComponentIfAny();
  await instance.remove().catch(() => undefined);
}

type WithPageComponentInstanceForDefinitionWorkInput<T> = {
  componentDefinitionId: string;
  pageIdHint?: string | null;
  /** When provided, skips find/place and uses this page instance directly. */
  instance?: ComponentElement | null;
  fn: (scope: ComponentDefinitionScope) => Promise<T>;
};

/**
 * Ensures a page instance exists for definition work: reuses a matching instance on the current page,
 * or temporarily appends one to the page body and removes it in `finally`.
 *
 * Caller must run inside {@link runExclusiveDesignerOp} when overlapping Designer mutations are possible.
 */
export async function withPageComponentInstanceForDefinitionWork<T>(
  input: WithPageComponentInstanceForDefinitionWorkInput<T>
): Promise<T> {
  const { componentDefinitionId, pageIdHint, fn } = input;
  const { instance, temporary } = await ensureComponentInstanceOnPage({
    componentDefinitionId,
    pageIdHint,
    instance: input.instance ?? null,
  });

  try {
    return await withComponentDefinitionScope(instance, fn, { pageIdHint });
  } finally {
    if (temporary) {
      await removeTemporaryPageComponentInstance(instance);
    }
  }
}
