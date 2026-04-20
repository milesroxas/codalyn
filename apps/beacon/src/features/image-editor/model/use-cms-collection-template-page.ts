import { useEffect, useState } from "react";

/**
 * True when the Designer canvas is a CMS collection template (dynamic collection page).
 * @see Page.getKind() in `@webflow/designer-extension-typings` (`'cms'`).
 */
export function useCmsCollectionTemplatePage(): boolean {
  const [isCmsTemplate, setIsCmsTemplate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function applyPage(page: Page) {
      const kind = await page.getKind();
      if (!cancelled) {
        setIsCmsTemplate(kind === "cms");
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

  return isCmsTemplate;
}
