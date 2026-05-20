import { useEffect, useState } from "react";

export type CmsCollectionTemplatePageState = {
  /** False until the current Designer page kind has been read at least once. */
  ready: boolean;
  /** True when the Designer canvas is a CMS collection template (dynamic collection page). */
  isCmsCollectionTemplatePage: boolean;
};

/**
 * Tracks whether the active Designer page is a CMS collection template.
 * @see Page.getKind() in `@webflow/designer-extension-typings` (`'cms'`).
 */
export function useCmsCollectionTemplatePage(): CmsCollectionTemplatePageState {
  const [state, setState] = useState<CmsCollectionTemplatePageState>({
    ready: false,
    isCmsCollectionTemplatePage: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function applyPage(page: Page) {
      const kind = await page.getKind();
      if (!cancelled) {
        setState({
          ready: true,
          isCmsCollectionTemplatePage: kind === "cms",
        });
      }
    }

    void webflow.getCurrentPage().then((page) => void applyPage(page));

    const unsub = webflow.subscribe("currentpage", (page) => {
      void applyPage(page);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return state;
}
