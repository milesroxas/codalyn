/**
 * Data loaders for the Composer link picker. Each loader fetches at an integration boundary (Webflow Designer API
 * for pages, Tower's Webflow Data API proxy for CMS collections / items), normalizes the response into the plain
 * option records from {@link "@/features/cms-slots/model/cms-slot-link-targets"}, and resolves every target to a
 * site-relative path. Invalid / partial rows are dropped, never partially applied (CLAUDE.md boundary rules).
 */

import {
  buildPageBasePath,
  isLinkablePageKind,
  joinCollectionItemPath,
  type LinkPickerCollection,
  type LinkPickerEntry,
  type LinkPickerPage,
  normalizeRelativePath,
} from "@/features/cms-slots/model/cms-slot-link-targets";
import { towerFetch } from "@/shared/lib/tower-client";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object";
}

function readString(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 ? t : null;
  }
  return null;
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

async function readTowerJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** All linkable site pages with their site-relative publish paths (Designer API). */
export async function loadLinkPickerPages(): Promise<LinkPickerPage[]> {
  const items = await webflow.getAllPagesAndFolders();
  const out: LinkPickerPage[] = [];
  for (const item of items ?? []) {
    if (item.type !== "Page") {
      continue;
    }
    if (await item.isDraft()) {
      continue;
    }
    const kind = await item.getKind();
    if (!isLinkablePageKind(kind)) {
      continue;
    }
    const path = normalizeRelativePath(await item.getPublishPath());
    if (path == null) {
      continue;
    }
    out.push({ id: item.id, name: (await item.getName()).trim() || path, path });
  }
  return sortByName(out);
}

/** Id of the page the designer is currently on, or null when unavailable (Designer API). */
export async function loadCurrentPageId(): Promise<string | null> {
  if (typeof webflow.getCurrentPage !== "function") {
    return null;
  }
  const page = await webflow.getCurrentPage();
  return readString(page?.id);
}

/** The page's slug plus its ancestor folder slugs (outermost first) — the preview-independent base path inputs. */
async function readPageSlugChain(page: Page): Promise<{ pageSlug: string | null; folderSlugs: string[] }> {
  const folderSlugs: string[] = [];
  let parent = await page.getParent();
  // Walk to the root, prepending each folder so the outermost ends up first; guard against any unexpected cycle.
  for (let guard = 0; parent != null && guard < 50; guard++) {
    folderSlugs.unshift(readString(await parent.getSlug()) ?? "");
    parent = await parent.getParent();
  }
  return { pageSlug: readString(await page.getSlug()), folderSlugs };
}

/**
 * Maps each Webflow CMS collection id to its template page's site-relative detail-page prefix. The prefix is rebuilt
 * from the collection page's own slug + folder ancestry rather than `getPublishPath()`, which resolves against the
 * item the Designer is currently previewing and so is unstable across collections (see {@link buildPageBasePath}).
 */
async function loadCollectionTemplatePaths(): Promise<Map<string, string>> {
  const items = await webflow.getAllPagesAndFolders();
  const byCollection = new Map<string, string>();
  for (const item of items ?? []) {
    if (item.type !== "Page") {
      continue;
    }
    if ((await item.getKind()) !== "cms") {
      continue;
    }
    const collectionId = readString(await item.getCollectionId());
    if (collectionId == null || byCollection.has(collectionId)) {
      continue;
    }
    const { pageSlug, folderSlugs } = await readPageSlugChain(item);
    byCollection.set(collectionId, buildPageBasePath(pageSlug, folderSlugs));
  }
  return byCollection;
}

type RawCollection = { id?: unknown; displayName?: unknown; singularName?: unknown; slug?: unknown };

function collectionName(raw: RawCollection): string | null {
  return readString(raw.displayName) ?? readString(raw.singularName) ?? readString(raw.slug);
}

/** CMS collections that have a detail/template page, so their entries resolve to real relative URLs. */
export async function loadLinkPickerCollections(): Promise<LinkPickerCollection[]> {
  const site = await webflow.getSiteInfo();
  const siteId = readString(site?.siteId);
  if (siteId == null) {
    return [];
  }
  const [templatePaths, res] = await Promise.all([
    loadCollectionTemplatePaths(),
    towerFetch(`/api/v2/webflow/sites/${encodeURIComponent(siteId)}/collections`, {
      headers: { Accept: "application/json" },
    }),
  ]);
  if (!res.ok) {
    throw new Error(`Could not load CMS collections (${res.status}).`);
  }
  const body = await readTowerJson(res);
  const rawList = isRecord(body) && Array.isArray(body.collections) ? body.collections : [];
  const out: LinkPickerCollection[] = [];
  for (const raw of rawList) {
    if (!isRecord(raw)) {
      continue;
    }
    const id = readString(raw.id);
    const name = collectionName(raw);
    const templatePath = id != null ? templatePaths.get(id) : undefined;
    if (id == null || name == null || templatePath == null) {
      continue;
    }
    out.push({ id, name, templatePath });
  }
  return sortByName(out);
}

type RawItem = { id?: unknown; slug?: unknown; fieldData?: unknown };

function itemSlug(raw: RawItem): string | null {
  if (isRecord(raw.fieldData)) {
    const fromField = readString(raw.fieldData.slug);
    if (fromField != null) {
      return fromField;
    }
  }
  return readString(raw.slug);
}

function itemName(raw: RawItem, fallback: string): string {
  if (isRecord(raw.fieldData)) {
    const name = readString(raw.fieldData.name);
    if (name != null) {
      return name;
    }
  }
  return fallback;
}

const ITEMS_PAGE_SIZE = 100;

/** Normalizes one raw Data-API item into an entry option, or null when it has no id or resolvable path. */
function toLinkPickerEntry(raw: unknown, templatePath: string): LinkPickerEntry | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = readString(raw.id);
  const slug = itemSlug(raw);
  const path = joinCollectionItemPath(templatePath, slug);
  if (id == null || path == null) {
    return null;
  }
  return { id, name: itemName(raw, slug ?? path), path };
}

/** Fetches one page of collection items; returns the normalized entries plus the reported total (if any). */
async function fetchEntriesPage(
  collectionId: string,
  templatePath: string,
  offset: number
): Promise<{ entries: LinkPickerEntry[]; received: number; total: number | null }> {
  const res = await towerFetch(
    `/api/v2/webflow/collections/${encodeURIComponent(collectionId)}/items?limit=${ITEMS_PAGE_SIZE}&offset=${offset}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) {
    throw new Error(`Could not load CMS entries (${res.status}).`);
  }
  const body = await readTowerJson(res);
  const rawItems = isRecord(body) && Array.isArray(body.items) ? body.items : [];
  const entries = rawItems
    .map((raw) => toLinkPickerEntry(raw, templatePath))
    .filter((e): e is LinkPickerEntry => e != null);
  const total = isRecord(body) && isRecord(body.pagination) ? readNumber(body.pagination.total) : null;
  return { entries, received: rawItems.length, total };
}

/** All entries of a collection, each resolved to its site-relative detail-page path. Paginates the Data API. */
export async function loadLinkPickerEntries(collectionId: string, templatePath: string): Promise<LinkPickerEntry[]> {
  const out: LinkPickerEntry[] = [];
  let offset = 0;
  for (;;) {
    const { entries, received, total } = await fetchEntriesPage(collectionId, templatePath, offset);
    out.push(...entries);
    offset += received;
    if (received === 0 || (total != null && offset >= total)) {
      break;
    }
  }
  return sortByName(out);
}

function readNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
