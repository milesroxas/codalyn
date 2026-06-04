import { serializeCmsSlotListRuntimePayload } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import {
  getCmsSlotListTargetCmsCollectionIdFromListContainer,
  getCmsSlotListTargetCmsFieldIdFromListContainer,
  getCmsTemplateCollectionIdFromCurrentPage,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { listCmsSlotListTargetInstancesOnPage } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import { getCmsSlotListTargetTextPropId } from "@/features/cms-slots/model/cms-slot-list-target-text-field";
import { getCmsSlotListTargetComponentOrNull } from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { getTowerOrigin, towerFetch } from "@/shared/lib/tower-client";

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
  throw new Error("Could not resolve the CMS slot CMS field slug.");
}

/**
 * Read the current **staged** CMS item; `fieldData[slug]` is the per-entry CMS slot text JSON.
 */
export async function fetchCmsSlotListCmsTextForItem(options: {
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

/**
 * Reads the JSON string the footer runtime consumes from the list target **Text** prop on non–collection-template
 * pages (same surface {@link setCmsSlotListTargetInstancesStaticRuntimeText} writes).
 */
async function readCmsSlotListStaticListTargetRuntimeText(options: {
  dataList: string;
  listContainer: BlockElement;
  preferredDefinitionId: string | null;
}): Promise<string | null> {
  const def = await getCmsSlotListTargetComponentOrNull(
    options.dataList,
    options.listContainer,
    options.preferredDefinitionId
  );
  if (def == null) {
    return null;
  }
  const instances = await listCmsSlotListTargetInstancesOnPage(options.dataList, options.listContainer, {
    preferredDefinitionId: options.preferredDefinitionId,
  });
  if (instances.length === 0) {
    return null;
  }
  let instDef: Component | undefined;
  try {
    instDef = await instances[0].getComponent();
  } catch {
    /* use definition only */
  }
  const propId = await getCmsSlotListTargetTextPropId(instDef ?? def);
  if (propId == null) {
    return null;
  }
  const rows = await instances[0].searchProps();
  const row = rows.find((r) => r.propId === propId);
  const v = row?.value;
  if (typeof v === "string") {
    return v;
  }
  return null;
}

/**
 * Runtime JSON string for the active publishing context: CMS item field on a collection template, otherwise list
 * target Text on a static page. Matches where Composer reads layout (see {@link resolveComposerTargetOrder}).
 */
export async function readCmsSlotListRuntimePayloadText(options: {
  listContainer: BlockElement;
  dataList: string;
  preferredDefinitionId: string | null;
  currentCmsItemId: string | null;
}): Promise<string | null> {
  const pageCollection = await getCmsTemplateCollectionIdFromCurrentPage();
  if (pageCollection != null) {
    if (getTowerOrigin().trim() === "" || options.currentCmsItemId == null) {
      return null;
    }
    const fromList = await getCmsSlotListTargetCmsCollectionIdFromListContainer(options.listContainer);
    const fieldId = await getCmsSlotListTargetCmsFieldIdFromListContainer(options.listContainer);
    if (fieldId == null) {
      return null;
    }
    const collectionId = fromList ?? pageCollection;
    return fetchCmsSlotListCmsTextForItem({
      collectionId,
      fieldId,
      cmsItemId: options.currentCmsItemId,
    });
  }
  return readCmsSlotListStaticListTargetRuntimeText({
    dataList: options.dataList,
    listContainer: options.listContainer,
    preferredDefinitionId: options.preferredDefinitionId,
  });
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
 * Persists the runtime JSON to the **CMS slot target text** field created for this slot
 * (see `cmsSlotListCmsPlainTextFieldDisplayName` + list target Text prop CMS bind). Staged + **live** patches so
 * the **published** page sees the same payload the list target Text renders. One CMS item id ⇒ one v2
 * `{v,i,p}`; `p` holds every Composer prop value (including `""`) for that entry — see
 * {@link serializeCmsSlotListRuntimePayload}.
 */
export async function saveCmsSlotListRuntimePayloadToCmsItem(options: {
  collectionId: string;
  fieldId: string;
  cmsItemId: string;
  /** Ordered indices into the hidden CMS slot block’s `children` (what the site runtime will clone by index). */
  hiddenListIndices: readonly number[];
  /** One entry per `hiddenListIndices` item; per-row `propId` → string (Engine-exposed props from Composer). */
  propValueRows?: readonly Readonly<Record<string, string>>[] | null;
  /** Parallel Composer slot display names (`n` in persisted JSON); length must match `hiddenListIndices`. */
  slotLabels?: readonly string[] | null;
}): Promise<void> {
  if (!options.cmsItemId.trim()) {
    throw new Error("Missing CMS item id.");
  }
  const fieldSlug = await resolveCmsFieldSlug(options.collectionId, options.fieldId);
  const text = serializeCmsSlotListRuntimePayload(
    [...options.hiddenListIndices],
    options.propValueRows,
    options.slotLabels
  );
  const id = options.cmsItemId.trim();
  const cid = options.collectionId;
  await patchBeaconListCmsTextFieldData({ collectionId: cid, cmsItemId: id, fieldSlug, text, kind: "staged" });
  await patchBeaconListCmsTextFieldData({ collectionId: cid, cmsItemId: id, fieldSlug, text, kind: "live" });
}

/**
 * On **static** (non–collection-template) pages the list target Text is not fed by a CMS item. The published footer
 * runtime reads JSON from that Text — this writes the same v2 string as
 * {@link saveCmsSlotListRuntimePayloadToCmsItem} so live matches Composer.
 */
export async function setCmsSlotListTargetInstancesStaticRuntimeText(options: {
  dataList: string;
  listContainer: BlockElement;
  preferredDefinitionId: string | null;
  text: string;
}): Promise<void> {
  const def = await getCmsSlotListTargetComponentOrNull(
    options.dataList,
    options.listContainer,
    options.preferredDefinitionId
  );
  if (def == null) {
    return;
  }
  const instances = await listCmsSlotListTargetInstancesOnPage(options.dataList, options.listContainer, {
    preferredDefinitionId: options.preferredDefinitionId,
  });
  let instDef: Component | undefined;
  try {
    instDef = instances.length > 0 ? await instances[0].getComponent() : undefined;
  } catch {
    /* use definition lookup only */
  }
  const propId = await getCmsSlotListTargetTextPropId(instDef ?? def);
  if (propId == null) {
    return;
  }
  for (const inst of instances) {
    try {
      await inst.setProps([{ propId, value: options.text }]);
    } catch (e) {
      console.warn("[beacon] set list target static runtime text (non-fatal)", e);
    }
  }
}
