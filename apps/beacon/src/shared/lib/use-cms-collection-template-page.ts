import { createContext, createElement, type ReactNode, useContext, useEffect, useState } from "react";

export type CmsCollectionTemplatePageState = {
  /** False until the current Designer page kind has been read at least once. */
  ready: boolean;
  /** True when the Designer canvas is a CMS collection template (dynamic collection page). */
  isCmsCollectionTemplatePage: boolean;
};

const defaultState: CmsCollectionTemplatePageState = {
  ready: false,
  isCmsCollectionTemplatePage: false,
};

const CmsCollectionTemplatePageContext = createContext<CmsCollectionTemplatePageState>(defaultState);

function useCmsCollectionTemplatePageState(): CmsCollectionTemplatePageState {
  const [state, setState] = useState<CmsCollectionTemplatePageState>(defaultState);

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

export function CmsCollectionTemplatePageProvider(props: { children: ReactNode }) {
  const state = useCmsCollectionTemplatePageState();
  return createElement(CmsCollectionTemplatePageContext.Provider, { value: state }, props.children);
}

/**
 * Tracks whether the active Designer page is a CMS collection template.
 * @see Page.getKind() in `@webflow/designer-extension-typings` (`'cms'`).
 */
export function useCmsCollectionTemplatePage(): CmsCollectionTemplatePageState {
  return useContext(CmsCollectionTemplatePageContext);
}
