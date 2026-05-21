import { useEffect } from "react";

import { prefetchCmsSlotsPageInstall } from "@/features/cms-slots/model/cms-slots-page-install-cache";
import { useCmsCollectionTemplatePage } from "@/shared/lib/use-cms-collection-template-page";

/** Warms CMS Slots install state while the user is on a collection template page. */
export function CmsSlotsPageInstallPrefetch() {
  const { ready, isCmsCollectionTemplatePage } = useCmsCollectionTemplatePage();

  useEffect(() => {
    if (!ready || !isCmsCollectionTemplatePage) {
      return;
    }
    void prefetchCmsSlotsPageInstall();
  }, [ready, isCmsCollectionTemplatePage]);

  return null;
}
