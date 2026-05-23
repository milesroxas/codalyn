import type { BeaconPresetInstanceLocation } from "@codalyn/webflow-kit";

async function readPageName(page: Page): Promise<string> {
  if (typeof page.getName !== "function") {
    return "Page";
  }
  const name = await page.getName();
  return name && name.trim().length > 0 ? name : "Page";
}

async function readPageKind(page: Page): Promise<"static" | "cms"> {
  if (typeof page.getKind !== "function") {
    return "static";
  }
  const kind = await page.getKind();
  return kind === "cms" ? "cms" : "static";
}

async function readCollectionId(page: Page): Promise<string | undefined> {
  if (typeof page.getCollectionId !== "function") {
    return undefined;
  }
  const id = await page.getCollectionId();
  return id != null && id.trim().length > 0 ? id : undefined;
}

/** Reads Designer page metadata for the active canvas when it matches `expectedPageId`. */
export async function readPresetInstanceLocationForPage(
  expectedPageId: string
): Promise<BeaconPresetInstanceLocation | null> {
  const page = await webflow.getCurrentPage();
  if (page.id !== expectedPageId) {
    return null;
  }
  const pageKind = await readPageKind(page);
  const location: BeaconPresetInstanceLocation = {
    pageId: page.id,
    pageName: await readPageName(page),
    pageKind,
  };
  if (pageKind === "cms") {
    const collectionId = await readCollectionId(page);
    if (collectionId != null) {
      location.collectionId = collectionId;
    }
  }
  return location;
}
