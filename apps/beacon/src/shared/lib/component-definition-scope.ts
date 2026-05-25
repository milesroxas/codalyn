import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";
import { ensurePageCanvas, openPageCanvas } from "@/shared/lib/webflow-page-canvas-context";

/** Max nested component edit depth / exit unwind attempts for Designer scope helpers. */
export const MAX_DESIGNER_COMPONENT_NESTING = 8;

export async function exitCurrentComponentIfAny(): Promise<void> {
  try {
    const getCurrent = (webflow as { getCurrentComponent?: () => Promise<unknown> }).getCurrentComponent;
    if (typeof getCurrent !== "function") {
      return;
    }
    const cur = await getCurrent.call(webflow).catch(() => null);
    if (cur != null) {
      await webflow.exitComponent();
    }
  } catch {
    /* exit may fail when nothing is entered */
  }
}

/**
 * Unwind nested component edit scopes until the page canvas is active so `enterComponent(instance)` is reliable.
 */
export async function exitUntilPageForComponentEnter(pageIdHint?: string | null): Promise<void> {
  for (let step = 0; step < MAX_DESIGNER_COMPONENT_NESTING; step += 1) {
    await exitCurrentComponentIfAny();
    const getCurrent = (webflow as { getCurrentComponent?: () => Promise<unknown> }).getCurrentComponent;
    if (typeof getCurrent !== "function") {
      break;
    }
    if ((await getCurrent.call(webflow).catch(() => null)) == null) {
      break;
    }
  }
  await ensurePageCanvas(pageIdHint ?? null);
}

/**
 * Unwind component edit scopes, then open `pageId` when the caller needs a specific page canvas.
 */
export async function preparePageCanvasForWork(pageId: string | null | undefined): Promise<void> {
  await exitUntilPageForComponentEnter(pageId ?? null);
  if (pageId != null && pageId.length > 0) {
    await openPageCanvas(pageId);
  }
}

export type ComponentDefinitionScope = {
  instance: ComponentElement;
  definition: Component;
  definitionRoot: AnyElement | null;
};

type WithComponentDefinitionOptions<T> = {
  pageIdHint?: string | null;
  onEnterFailed?: () => T | Promise<T>;
};

/**
 * Enters a component definition, resolves its root element, runs `fn`, then exits in `finally`.
 */
export async function withComponentDefinitionScope<T>(
  instance: ComponentElement,
  fn: (scope: ComponentDefinitionScope) => Promise<T>,
  options?: WithComponentDefinitionOptions<T>
): Promise<T> {
  return runExclusiveDesignerOp(async () => {
    await exitUntilPageForComponentEnter(options?.pageIdHint);
    let entered = false;
    try {
      await webflow.enterComponent(instance);
      entered = true;
    } catch {
      if (options?.onEnterFailed) {
        return options.onEnterFailed();
      }
      throw new Error("Could not open this component for editing.");
    }
    try {
      const definition = await webflow.getCurrentComponent();
      if (definition == null) {
        throw new Error("Select this component on the page and try again.");
      }
      const definitionRoot = await definition.getRootElement().catch(() => null);
      return await fn({ instance, definition, definitionRoot });
    } finally {
      if (entered) {
        await webflow.exitComponent().catch(() => undefined);
      }
    }
  });
}
