import { serializeBeaconListRuntimePayload } from "@/features/beacons/model/beacon-list-runtime-payload";
import { towerFetch } from "@/shared/lib/tower-client";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

async function readTowerErrorDetail(res: Response): Promise<string> {
  const raw = (await res.text()).trim();
  if (!raw) {
    return res.statusText || `HTTP ${res.status}`;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const msg =
      typeof parsed.message === "string" ? parsed.message : typeof parsed.error === "string" ? parsed.error : null;
    if (msg) {
      return msg;
    }
  } catch {
    // use raw
  }
  return raw.slice(0, 500);
}

async function resolveCmsFieldSlug(collectionId: string, fieldId: string): Promise<string> {
  const collectionRes = await towerFetch(`/api/v2/webflow/collections/${encodeURIComponent(collectionId)}`);
  if (!collectionRes.ok) {
    const detail = await readTowerErrorDetail(collectionRes);
    throw new Error(`Could not read CMS collection fields (${collectionRes.status}): ${detail}`);
  }
  const data: unknown = await collectionRes.json();
  const fields = isRecord(data) && Array.isArray(data.fields) ? data.fields : null;
  if (!fields) {
    throw new Error("CMS collection response was missing fields.");
  }
  for (const field of fields) {
    if (!isRecord(field) || field.id !== fieldId) {
      continue;
    }
    if (typeof field.slug === "string" && field.slug.trim()) {
      return field.slug;
    }
    break;
  }
  throw new Error("Could not resolve the beacon list CMS field slug.");
}

/**
 * Read the current **staged** CMS item; `fieldData[slug]` is the per-entry beacon list text JSON.
 */
export async function fetchBeaconListCmsTextForItem(options: {
  collectionId: string;
  fieldId: string;
  cmsItemId: string;
}): Promise<string | null> {
  const slug = await resolveCmsFieldSlug(options.collectionId, options.fieldId);
  const path = `/api/v2/webflow/collections/${encodeURIComponent(options.collectionId)}/items/${encodeURIComponent(options.cmsItemId)}`;
  const res = await towerFetch(path, { method: "GET", headers: { Accept: "application/json" } });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  if (!isRecord(data)) {
    return null;
  }
  const fieldData = data.fieldData;
  if (!isRecord(fieldData)) {
    return null;
  }
  const v = fieldData[slug];
  if (v == null) {
    return null;
  }
  if (typeof v === "string") {
    return v;
  }
  return String(v);
}

type PatchKind = "staged" | "live";

/**
 * Data API: Webflow v2 updates **per item** with `PATCH` + body `{ items: [ { id, fieldData } ] }` (not a lone
 * `fieldData` on `/items/{id}/live`). Staged = CMS/Designer; live = published site (what the list target renders
 * and the footer **runtime** reads as text for `{"v":1,"i":[…]}`).
 * @see https://developers.webflow.com/data/reference/cms/collection-items/staged-items/update-items
 * @see https://developers.webflow.com/data/reference/cms/collection-items/live-items/update-items-live
 */
async function patchBeaconListCmsTextFieldData(options: {
  collectionId: string;
  cmsItemId: string;
  fieldSlug: string;
  text: string;
  kind: PatchKind;
}): Promise<void> {
  const { collectionId, cmsItemId, fieldSlug, text, kind } = options;
  const tail = kind === "live" ? "items/live" : "items";
  const path = `/api/v2/webflow/collections/${encodeURIComponent(collectionId)}/${tail}?skipInvalidFiles=true`;
  const res = await towerFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      items: [
        {
          id: cmsItemId,
          fieldData: {
            [fieldSlug]: text,
          },
        },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await readTowerErrorDetail(res);
    throw new Error(`Could not update CMS list text (${kind}, ${res.status}): ${detail}`);
  }
}

/**
 * Persists the runtime JSON to the **Beacon list target text** field created for this list
 * (see `beaconListCmsPlainTextFieldDisplayName` + list target CMS bind). **One array entry** in the
 * v2 `items` payload = **one** collection entry. List targets read this field; the page inline script
 * uses the rendered value on the list target root to pick clone order.
 */
export async function saveBeaconListRuntimePayloadToCmsItem(options: {
  collectionId: string;
  fieldId: string;
  cmsItemId: string;
  /** Ordered indices into the hidden beacon list block’s `children` (what the site runtime will clone by index). */
  hiddenListIndices: readonly number[];
}): Promise<void> {
  if (!options.cmsItemId.trim()) {
    throw new Error("Missing CMS item id.");
  }
  const fieldSlug = await resolveCmsFieldSlug(options.collectionId, options.fieldId);
  const text = serializeBeaconListRuntimePayload([...options.hiddenListIndices]);
  const id = options.cmsItemId.trim();
  const cid = options.collectionId;
  await patchBeaconListCmsTextFieldData({ collectionId: cid, cmsItemId: id, fieldSlug, text, kind: "staged" });
  await patchBeaconListCmsTextFieldData({ collectionId: cid, cmsItemId: id, fieldSlug, text, kind: "live" });
}
