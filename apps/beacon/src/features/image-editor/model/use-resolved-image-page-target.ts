import type { ResolvedUploadTarget } from "@codalyn/webflow-kit";
import { useEffect, useState } from "react";
import { pageTargetStableKey } from "@/features/image-editor/lib/image-editor-page-target-key";
import { mapSelectedTargetToResolvedUploadTarget } from "@/features/image-editor/lib/image-editor-resolved-target";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";

export function useResolvedImagePageTarget(input: {
  enabled: boolean;
  siteId: string | null;
  pageId: string | null;
  pageTarget: ImagePageTarget | null;
  resolveTaggedDimensions?: boolean;
}): Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }> | null {
  const { enabled, siteId, pageId, pageTarget, resolveTaggedDimensions: shouldResolveTaggedDimensions = true } = input;
  const pageTargetKey = pageTargetStableKey(pageTarget);
  const [resolvedTarget, setResolvedTarget] = useState<Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }> | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    if (!enabled || siteId == null || pageId == null || pageTarget == null || pageTargetKey == null) {
      setResolvedTarget(null);
      return () => {
        cancelled = true;
      };
    }
    void mapSelectedTargetToResolvedUploadTarget({
      siteId,
      pageId,
      autoPageTarget: pageTarget,
      selectedElement: null,
      selectedComponentImagePropId: pageTarget.kind === "component" ? (pageTarget.imagePropId ?? null) : null,
      elementCmsBinding: "none",
      shouldResolveTaggedDimensions,
    }).then((nextTarget) => {
      if (cancelled) {
        return;
      }
      if (nextTarget == null || nextTarget.kind === "cms-ambiguous") {
        setResolvedTarget(null);
        return;
      }
      setResolvedTarget(nextTarget);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, pageId, pageTarget, pageTargetKey, shouldResolveTaggedDimensions, siteId]);

  return resolvedTarget;
}
