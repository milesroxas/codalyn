/** Webflow throws when the Designer is on a component canvas (`openCanvas`) instead of a page. */
export function isMissingCurrentPageError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes("Missing current page");
  }
  return String(err).includes("Missing current page");
}

/** Returns the open page id, or `null` when the canvas is not a page (e.g. component definition canvas). */
export async function readCurrentPageIdOrNull(): Promise<string | null> {
  if (typeof webflow.getCurrentPage !== "function") {
    return null;
  }
  try {
    const page = await webflow.getCurrentPage();
    const id = page?.id;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch (err) {
    if (isMissingCurrentPageError(err)) {
      return null;
    }
    throw err;
  }
}

/**
 * Opens the Designer page canvas when it is not already active (including from a component definition canvas).
 * Returns the active page id after navigation, or `null` when the canvas is not a page.
 */
export async function openPageCanvas(pageId: string): Promise<string | null> {
  if (pageId.length === 0 || typeof webflow.openCanvas !== "function") {
    return readCurrentPageIdOrNull();
  }
  const current = await readCurrentPageIdOrNull();
  if (current === pageId) {
    return current;
  }
  await webflow.openCanvas({ pageId });
  return readCurrentPageIdOrNull();
}

/**
 * Ensures a page canvas is active before page-scoped Designer APIs (`enterComponent`, `getAllElements`, etc.).
 * When the user opened a component via `openCanvas`, restores the last known page with the same API.
 */
export async function ensurePageCanvas(pageIdHint: string | null | undefined): Promise<string | null> {
  const current = await readCurrentPageIdOrNull();
  if (current != null) {
    return current;
  }
  if (pageIdHint == null || pageIdHint.length === 0) {
    return null;
  }
  return openPageCanvas(pageIdHint);
}
