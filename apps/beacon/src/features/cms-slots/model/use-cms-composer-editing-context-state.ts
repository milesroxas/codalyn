import { useEffect, useState } from "react";
import {
  type CmsComposerEditingContextResolved,
  resolveCmsComposerEditingContext,
} from "@/features/cms-slots/model/cms-slot-composer-editing-context";
import { useCmsCollectionTemplatePage } from "@/shared/lib/use-cms-collection-template-page";

export type CmsComposerEditingContextViewModel =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "static_page" }
  | { phase: "no_tower" }
  | { phase: "collection_unavailable" }
  | { phase: "ready"; collectionName: string; entryTitle: string | null };

function toViewModel(resolved: CmsComposerEditingContextResolved): CmsComposerEditingContextViewModel {
  switch (resolved.kind) {
    case "static_page":
      return { phase: "static_page" };
    case "no_tower":
      return { phase: "no_tower" };
    case "collection_unavailable":
      return { phase: "collection_unavailable" };
    case "ready":
      return {
        phase: "ready",
        collectionName: resolved.collectionName,
        entryTitle: resolved.entryTitle,
      };
  }
}

export function useCmsComposerEditingContextState(options: {
  enabled: boolean;
  currentCmsItemId: string | null;
}): CmsComposerEditingContextViewModel {
  const { enabled, currentCmsItemId } = options;
  const { ready: templatePageReady, isCmsCollectionTemplatePage } = useCmsCollectionTemplatePage();
  const [viewModel, setViewModel] = useState<CmsComposerEditingContextViewModel>({ phase: "idle" });

  useEffect(() => {
    if (!enabled) {
      setViewModel({ phase: "idle" });
      return undefined;
    }

    if (!templatePageReady) {
      setViewModel({ phase: "loading" });
      return undefined;
    }

    if (!isCmsCollectionTemplatePage) {
      setViewModel({ phase: "static_page" });
      return undefined;
    }

    let cancelled = false;
    setViewModel({ phase: "loading" });

    void (async () => {
      try {
        const resolved = await resolveCmsComposerEditingContext({ currentCmsItemId });
        if (!cancelled) {
          setViewModel(toViewModel(resolved));
        }
      } catch {
        if (!cancelled) {
          setViewModel({ phase: "collection_unavailable" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, currentCmsItemId, isCmsCollectionTemplatePage, templatePageReady]);

  return viewModel;
}
