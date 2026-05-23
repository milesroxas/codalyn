import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";
import { ensurePageCanvas } from "@/shared/lib/webflow-page-canvas-context";

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

export type ComponentDefinitionScope = {
  instance: ComponentElement;
  definition: Component;
  definitionRoot: AnyElement | null;
};

type WithComponentDefinitionOptions<T> = {
  /** Restores page canvas when the user opened a component definition via `openCanvas`. */
  pageIdHint?: string | null;
  onEnterFailed?: () => T | Promise<T>;
};

/**
 * Opens a component definition canvas (`openCanvas`), runs `fn`, then returns to `pageIdHint` when provided.
 */
export async function withOpenComponentDefinitionCanvas<T>(
  componentDefinitionId: string,
  fn: (scope: { definition: Component; definitionRoot: AnyElement | null }) => Promise<T>,
  options?: { pageIdHint?: string | null }
): Promise<T> {
  return runExclusiveDesignerOp(async () => {
    await exitUntilPageForComponentEnter(options?.pageIdHint);
    const definition = await webflow.getComponent(componentDefinitionId);
    await webflow.openCanvas(definition);
    try {
      const definitionRoot = await definition.getRootElement().catch(() => null);
      return await fn({ definition, definitionRoot });
    } finally {
      const pageIdHint = options?.pageIdHint;
      if (pageIdHint != null && pageIdHint.length > 0 && typeof webflow.openCanvas === "function") {
        await webflow.openCanvas({ pageId: pageIdHint }).catch(() => undefined);
      }
    }
  });
}
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
