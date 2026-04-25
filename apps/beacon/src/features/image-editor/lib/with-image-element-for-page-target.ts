import { findImageElementForComponentInstanceProp } from "@/features/image-editor/lib/find-image-element-for-component-instance-prop";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { searchComponentInstanceImageProps } from "@/features/image-editor/lib/search-component-instance-image-props";

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
    /* best effort — exit may fail if nothing is entered */
  }
}

export async function resolveComponentImagePropId(
  instance: ComponentElement,
  hintedPropId: string | undefined
): Promise<string | null> {
  if (hintedPropId != null && hintedPropId !== "") {
    return hintedPropId;
  }
  const props = await searchComponentInstanceImageProps(instance);
  return props[0]?.propId ?? null;
}

type WithImageForPageTargetOptions<T> = {
  /** When `enterComponent` throws, return this instead of calling `fn(null)` (e.g. infer’s `enteredComponent: false`). */
  onComponentEnterFailed?: () => T;
};

/**
 * Resolves the canvas `Image` for an {@link ImagePageTarget}: direct element, or
 * the bound image **inside a component** (enters component, then exits in `finally`).
 */
export async function withImageElementForPageTarget<T>(
  t: ImagePageTarget,
  fn: (image: ImageElement | null) => Promise<T>,
  options?: WithImageForPageTargetOptions<T>
): Promise<T> {
  if (t.kind === "image") {
    return fn(t.element as ImageElement);
  }
  if (t.kind !== "component") {
    return fn(null);
  }
  const instance = t.element as ComponentElement;
  const propId = await resolveComponentImagePropId(instance, t.imagePropId);
  if (propId == null) {
    return fn(null);
  }
  await exitCurrentComponentIfAny();
  let entered = false;
  try {
    await webflow.enterComponent(instance);
    entered = true;
  } catch {
    if (options?.onComponentEnterFailed) {
      return options.onComponentEnterFailed();
    }
    return fn(null);
  }
  try {
    const image = await findImageElementForComponentInstanceProp(instance, propId);
    return await fn(image);
  } finally {
    if (entered) {
      await webflow.exitComponent().catch(() => {
        /* best effort */
      });
    }
  }
}
