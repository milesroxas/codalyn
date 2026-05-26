/** Webflow Designer canvas host pattern: https://{shortName}.design.webflow.com */
const WEBFLOW_DESIGNER_HOST_SUFFIX = ".design.webflow.com";

export type WebflowDesignerDeepLinkInput = {
  shortName: string | null | undefined;
  appClientId: string | null | undefined;
};

export type WebflowDesignerOpenLinks = {
  shortName: string | null;
  /** Opens the Designer with Beacon when the app is installed on the site. */
  openWithAppUrl: string | null;
  /** Opens the Designer canvas without forcing the extension (fallback). */
  openDesignerUrl: string | null;
};

export function normalizeWebflowSiteShortName(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0) {
    return null;
  }
  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function buildWebflowDesignerCanvasUrl(shortName: string | null | undefined): string | null {
  const normalized = normalizeWebflowSiteShortName(shortName);
  if (normalized == null) {
    return null;
  }
  return `https://${normalized}${WEBFLOW_DESIGNER_HOST_SUFFIX}`;
}

/**
 * Deep link documented by Webflow: opens the Designer with the extension when installed on the site.
 * @see https://developers.webflow.com/apps/deep-linking
 */
export function buildWebflowDesignerAppDeepLink(input: WebflowDesignerDeepLinkInput): string | null {
  const canvasUrl = buildWebflowDesignerCanvasUrl(input.shortName);
  const clientId = input.appClientId?.trim();
  if (canvasUrl == null || !clientId) {
    return null;
  }
  const url = new URL(canvasUrl);
  url.searchParams.set("app", clientId);
  return url.toString();
}

export function resolveWebflowDesignerOpenLinks(input: WebflowDesignerDeepLinkInput): WebflowDesignerOpenLinks {
  const shortName = normalizeWebflowSiteShortName(input.shortName);
  return {
    shortName,
    openWithAppUrl: buildWebflowDesignerAppDeepLink(input),
    openDesignerUrl: buildWebflowDesignerCanvasUrl(shortName),
  };
}
