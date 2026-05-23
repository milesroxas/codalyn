import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";

function readElementId(element: AnyElement): string | null {
  const elementId = (element.id as { element?: unknown }).element;
  return typeof elementId === "string" && elementId.length > 0 ? elementId : null;
}

/** Stable identity for canvas targets so effects do not re-run on fresh hint objects. */
export function pageTargetStableKey(target: ImagePageTarget | null): string | null {
  if (target == null) {
    return null;
  }
  const elementId = readElementId(target.element);
  if (elementId == null) {
    return null;
  }
  return `${target.kind}:${elementId}:${target.imagePropId ?? ""}`;
}
