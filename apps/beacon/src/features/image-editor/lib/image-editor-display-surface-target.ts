import type { ImagePageTarget, SelectedImageTargetHint } from "@/features/image-editor/lib/scan-image-targets-on-page";

export function targetFromSelectionHint(hint: SelectedImageTargetHint): ImagePageTarget | null {
  if (hint.kind === "image" || hint.kind === "component") {
    return hint.target;
  }
  return null;
}

/** Live canvas selection wins for display; fall back to an explicit list/commit pick. */
export function resolveDisplayedSurfaceTarget(
  selectionHint: SelectedImageTargetHint,
  committedTarget: ImagePageTarget | null
): ImagePageTarget | null {
  return targetFromSelectionHint(selectionHint) ?? committedTarget;
}
