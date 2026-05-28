import { getCmsTemplateCollectionIdFromCurrentPage } from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { readStringLikeValue } from "@/shared/lib/read-string-like-value";
import { getTowerOrigin, towerFetch } from "@/shared/lib/tower-client";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function parseCmsCollectionDisplayName(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }
  return readStringLikeValue(payload.displayName);
}

export function extractCmsItemFieldData(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) {
    return null;
  }
  if (isRecord(payload.fieldData)) {
    return payload.fieldData;
  }
  if (isRecord(payload.item) && isRecord(payload.item.fieldData)) {
    return payload.item.fieldData;
  }
  return null;
}

/** Webflow CMS items expose the entry display name in `fieldData.name` (slug `name`). */
export function parseCmsItemEntryTitle(payload: unknown): string | null {
  const fieldData = extractCmsItemFieldData(payload);
  if (fieldData == null) {
    return null;
  }
  return readStringLikeValue(fieldData.name);
}

async function fetchCmsCollectionDisplayName(collectionId: string): Promise<string | null> {
  const res = await towerFetch(`/api/v2/webflow/collections/${encodeURIComponent(collectionId)}`);
  if (!res.ok) {
    return null;
  }
  try {
    return parseCmsCollectionDisplayName(await res.json());
  } catch {
    return null;
  }
}

async function fetchCmsItemEntryTitle(collectionId: string, cmsItemId: string): Promise<string | null> {
  const path = `/api/v2/webflow/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(cmsItemId)}`;
  const res = await towerFetch(path, { method: "GET", headers: { Accept: "application/json" } });
  if (!res.ok) {
    return null;
  }
  try {
    return parseCmsItemEntryTitle(await res.json());
  } catch {
    return null;
  }
}

export type CmsComposerEditingContextResolved =
  | { kind: "static_page" }
  | { kind: "no_tower"; collectionId: string }
  | { kind: "collection_unavailable"; collectionId: string }
  | {
      kind: "ready";
      collectionId: string;
      collectionName: string;
      entryTitle: string | null;
    };

export async function resolveCmsComposerEditingContext(input: {
  currentCmsItemId: string | null;
}): Promise<CmsComposerEditingContextResolved> {
  const collectionId = await getCmsTemplateCollectionIdFromCurrentPage();
  if (collectionId == null) {
    return { kind: "static_page" };
  }

  if (getTowerOrigin().trim() === "") {
    return { kind: "no_tower", collectionId };
  }

  const collectionName = await fetchCmsCollectionDisplayName(collectionId);
  if (collectionName == null) {
    return { kind: "collection_unavailable", collectionId };
  }

  let entryTitle: string | null = null;
  if (input.currentCmsItemId != null) {
    entryTitle = await fetchCmsItemEntryTitle(collectionId, input.currentCmsItemId);
  }

  return {
    kind: "ready",
    collectionId,
    collectionName,
    entryTitle,
  };
}
