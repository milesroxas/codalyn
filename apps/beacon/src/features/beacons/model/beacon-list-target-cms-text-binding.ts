import { getBeaconListTargetTextPropId } from "@/features/beacons/model/beacon-list-target-text-field";
import { towerFetch } from "@/shared/lib/tower-client";

const LOG_PREFIX = "[beacon list CMS]";

/**
 * On the **hidden beacon list** block (one per `data-list`): `collectionId` + `fieldId` for the **CMS Plain Text
 * field owned by the list**. Render targets only **bind** to this; they do not create collection fields.
 */
export const BEACON_LIST_TARGET_CMS_COLLECTION_ID_ATTR = "data-beacon-cms-collection-id";

/** `fieldId` for {@link BEACON_LIST_TARGET_CMS_COLLECTION_ID_ATTR} (Data API; delete on beacon remove). */
export const BEACON_LIST_TARGET_CMS_FIELD_ID_ATTR = "data-beacon-cms-field-id";

/** Display name for the **beacon list** CMS Plain Text field (not the render-target component). */
export function beaconListCmsPlainTextFieldDisplayName(dataList: string): string {
  return `Beacon list target text · ${dataList}`;
}

/** @deprecated Use {@link beaconListCmsPlainTextFieldDisplayName}. */
export function beaconListTargetCmsPlainTextDisplayName(dataList: string): string {
  return beaconListCmsPlainTextFieldDisplayName(dataList);
}

/**
 * When the Designer is on a **CMS collection template** page, returns that collection’s id; otherwise `null`.
 */
export async function getCmsTemplateCollectionIdFromCurrentPage(): Promise<string | null> {
  if (typeof webflow.getCurrentPage !== "function") {
    return null;
  }
  const page = await webflow.getCurrentPage();
  if (page == null || typeof page.getCollectionId !== "function") {
    return null;
  }
  const id = await page.getCollectionId();
  return id != null && id.trim() !== "" ? id : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function parseCollectionFields(
  data: unknown
): Array<{ id?: string; type?: string; displayName?: string; slug?: string }> {
  if (!isRecord(data) || !Array.isArray(data.fields)) {
    return [];
  }
  const out: Array<{ id?: string; type?: string; displayName?: string; slug?: string }> = [];
  for (const f of data.fields) {
    if (!isRecord(f)) continue;
    out.push({
      id: typeof f.id === "string" ? f.id : undefined,
      type: typeof f.type === "string" ? f.type : undefined,
      displayName: typeof f.displayName === "string" ? f.displayName : undefined,
      slug: typeof f.slug === "string" ? f.slug : undefined,
    });
  }
  return out;
}

function isPlainTextFieldType(t: string | undefined): boolean {
  if (t == null) return false;
  return t.toLowerCase() === "plaintext";
}

/** Normalizes for comparison when Webflow normalizes middle dots or spacing in display names. */
function fieldDisplayNameLikelyForBeaconListTarget(displayName: string | undefined, dataList: string): boolean {
  if (displayName == null) return false;
  const want = beaconListCmsPlainTextFieldDisplayName(dataList);
  if (displayName === want) {
    return true;
  }
  const a = displayName.toLowerCase().replace(/\s+/g, " ").replace(/[·•]/g, "·");
  const b = want.toLowerCase().replace(/\s+/g, " ").replace(/[·•]/g, "·");
  return a === b || a.includes(dataList);
}

function findPlainTextFieldIdForDataList(
  fields: ReturnType<typeof parseCollectionFields>,
  dataList: string
): string | null {
  for (const f of fields) {
    if (!isPlainTextFieldType(f.type) || f.id == null) {
      continue;
    }
    if (fieldDisplayNameLikelyForBeaconListTarget(f.displayName, dataList)) {
      return f.id;
    }
  }
  return null;
}

function parseCreatedFieldId(data: unknown): string | null {
  if (!isRecord(data)) return null;
  return typeof data.id === "string" && data.id ? data.id : null;
}

/**
 * Data API: find or create the **beacon list** Plain Text field in a collection (see {@link beaconListCmsPlainTextFieldDisplayName}).
 * Call only from {@link ensureBeaconListCmsTextFieldOnList} — not from render-target placement.
 */
export async function ensureBeaconListTargetCmsPlainTextField(
  collectionId: string,
  dataList: string
): Promise<{ collectionId: string; fieldId: string } | null> {
  const displayName = beaconListCmsPlainTextFieldDisplayName(dataList);
  const getCollection = async (): Promise<unknown | null> => {
    const getRes = await towerFetch(`/api/v2/webflow/collections/${encodeURIComponent(collectionId)}`);
    if (!getRes.ok) {
      console.warn(LOG_PREFIX, "GET collection failed", getRes.status);
      return null;
    }
    try {
      return await getRes.json();
    } catch {
      return null;
    }
  };

  const resolveFromGetJson = (getJson: unknown): string | null => {
    const fields = parseCollectionFields(getJson);
    return findPlainTextFieldIdForDataList(fields, dataList);
  };

  let getJson = await getCollection();
  if (getJson == null) {
    return null;
  }
  const existingId = resolveFromGetJson(getJson);
  if (existingId != null) {
    return { collectionId, fieldId: existingId };
  }

  const postRes = await towerFetch(`/api/v2/webflow/collections/${encodeURIComponent(collectionId)}/fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      type: "PlainText",
      displayName,
      helpText: "Codalyn Beacon: CMS text for this beacon list; list targets bind their Text prop here.",
    }),
  });
  if (!postRes.ok) {
    if (postRes.status === 409) {
      getJson = await getCollection();
      if (getJson != null) {
        const idAfterConflict = resolveFromGetJson(getJson);
        if (idAfterConflict != null) {
          return { collectionId, fieldId: idAfterConflict };
        }
      }
    }
    console.warn(LOG_PREFIX, "POST field failed", postRes.status);
    return null;
  }
  let postJson: unknown;
  try {
    postJson = await postRes.json();
  } catch {
    return null;
  }
  const fieldId = parseCreatedFieldId(postJson);
  if (fieldId == null) {
    console.warn(LOG_PREFIX, "POST field: missing id in response");
    return null;
  }
  return { collectionId, fieldId };
}

/**
 * Reads {@link BEACON_LIST_TARGET_CMS_COLLECTION_ID_ATTR} from the hidden beacon list block.
 */
export async function getBeaconListTargetCmsCollectionIdFromListContainer(
  listContainer: BlockElement
): Promise<string | null> {
  const raw = await listContainer.getCustomAttribute(BEACON_LIST_TARGET_CMS_COLLECTION_ID_ATTR);
  if (raw == null || String(raw).trim() === "") {
    return null;
  }
  return String(raw).trim();
}

/**
 * Reads {@link BEACON_LIST_TARGET_CMS_FIELD_ID_ATTR} from the hidden beacon list block.
 */
export async function getBeaconListTargetCmsFieldIdFromListContainer(
  listContainer: BlockElement
): Promise<string | null> {
  const raw = await listContainer.getCustomAttribute(BEACON_LIST_TARGET_CMS_FIELD_ID_ATTR);
  if (raw == null || String(raw).trim() === "") {
    return null;
  }
  return String(raw).trim();
}

async function persistCmsListAttrsOnListBlock(
  listContainer: BlockElement,
  binding: { collectionId: string; fieldId: string },
  logOnFail: string
): Promise<boolean> {
  try {
    await listContainer.setCustomAttribute(BEACON_LIST_TARGET_CMS_COLLECTION_ID_ATTR, binding.collectionId);
    await listContainer.setCustomAttribute(BEACON_LIST_TARGET_CMS_FIELD_ID_ATTR, binding.fieldId);
    return true;
  } catch (e) {
    console.warn(LOG_PREFIX, logOnFail, e);
    return false;
  }
}

/** When the Designer is not on a collection page but `data-beacon-cms-collection-id` is already set, resolve field ids via Tower. */
async function tryEnsureCmsTextFieldFromListAttrCollection(
  listContainer: BlockElement,
  dataList: string,
  collectionIdFromListAttr: string
): Promise<{ collectionId: string; fieldId: string } | null> {
  const fromAttr = String(collectionIdFromListAttr).trim();
  if (fromAttr === "") {
    return null;
  }
  const repaired = await ensureBeaconListTargetCmsPlainTextField(fromAttr, dataList);
  if (repaired == null) {
    return null;
  }
  if (!(await persistCmsListAttrsOnListBlock(listContainer, repaired, "set cms id attrs (stored collection)"))) {
    return null;
  }
  return repaired;
}

/**
 * **Single place** that may create the CMS Plain Text field for a **beacon list** and persist
 * `data-beacon-cms-*` on the hidden list block. Uses stored attrs when they still match the **current**
 * collection template; if the page is a different collection (or first edit after copy), re-resolves
 * the field in that collection and updates attributes (Data API + Tower).
 */
export async function ensureBeaconListCmsTextFieldOnList(
  listContainer: BlockElement,
  dataList: string
): Promise<{ collectionId: string; fieldId: string } | null> {
  const currentPageCollectionId = await getCmsTemplateCollectionIdFromCurrentPage();
  const existingC = await getBeaconListTargetCmsCollectionIdFromListContainer(listContainer);
  const existingF = await getBeaconListTargetCmsFieldIdFromListContainer(listContainer);
  if (existingC != null && existingF != null) {
    const onCmsTemplate = currentPageCollectionId != null;
    const listMatchesThisTemplate = !onCmsTemplate || currentPageCollectionId === existingC;
    if (listMatchesThisTemplate) {
      return { collectionId: existingC, fieldId: existingF };
    }
  }

  if (currentPageCollectionId == null && existingC != null) {
    return tryEnsureCmsTextFieldFromListAttrCollection(listContainer, dataList, existingC);
  }

  const collectionId = currentPageCollectionId;
  if (collectionId == null) {
    return null;
  }
  const ensured = await ensureBeaconListTargetCmsPlainTextField(collectionId, dataList);
  if (ensured == null) {
    return null;
  }
  if (!(await persistCmsListAttrsOnListBlock(listContainer, ensured, "set cms id attrs on list block"))) {
    return null;
  }
  return ensured;
}

/**
 * Resolves the collection to use for CMS field cleanup: persisted attribute on the list block, else the
 * current page’s collection when the Designer is on a template.
 */
export async function resolveBeaconListTargetCmsCollectionIdForCleanup(
  listContainer: BlockElement
): Promise<string | null> {
  const fromAttr = await getBeaconListTargetCmsCollectionIdFromListContainer(listContainer);
  if (fromAttr != null) {
    return fromAttr;
  }
  return getCmsTemplateCollectionIdFromCurrentPage();
}

/**
 * Best-effort: removes the **PlainText** field for this beacon list. Prefer `fieldId` (from
 * {@link BEACON_LIST_TARGET_CMS_FIELD_ID_ATTR}) and `DELETE .../fields/{fieldId}`; otherwise resolves by display
 * name from a collection GET. No-op when the field is missing or Tower / API fails (logged).
 */
export async function tryDeleteBeaconListTargetCmsPlainTextField(
  collectionId: string,
  dataList: string,
  fieldId?: string | null
): Promise<void> {
  const fromAttr = fieldId != null && String(fieldId).trim() !== "" ? String(fieldId).trim() : null;
  if (fromAttr != null) {
    const delById = await towerFetch(
      `/api/v2/webflow/collections/${encodeURIComponent(collectionId)}/fields/${encodeURIComponent(fromAttr)}`,
      { method: "DELETE", headers: { Accept: "application/json" } }
    );
    if (delById.ok || delById.status === 404) {
      return;
    }
    console.warn(LOG_PREFIX, "DELETE field by id failed; falling back to name lookup", delById.status);
  }

  const getRes = await towerFetch(`/api/v2/webflow/collections/${encodeURIComponent(collectionId)}`);
  if (!getRes.ok) {
    console.warn(LOG_PREFIX, "GET collection (delete field) failed", getRes.status);
    return;
  }
  let getJson: unknown;
  try {
    getJson = await getRes.json();
  } catch {
    return;
  }
  const resolvedId = findPlainTextFieldIdForDataList(parseCollectionFields(getJson), dataList);
  if (resolvedId == null) {
    return;
  }
  const delRes = await towerFetch(
    `/api/v2/webflow/collections/${encodeURIComponent(collectionId)}/fields/${encodeURIComponent(resolvedId)}`,
    { method: "DELETE", headers: { Accept: "application/json" } }
  );
  if (!delRes.ok && delRes.status !== 404) {
    console.warn(LOG_PREFIX, "DELETE field failed", delRes.status);
  }
}

function cmsBindingMatches(value: unknown, expected: { collectionId: string; fieldId: string }): boolean {
  if (!isRecord(value) || value.sourceType !== "cms") {
    return false;
  }
  return value.collectionId === expected.collectionId && value.fieldId === expected.fieldId;
}

/**
 * Binds a **render target** instance’s **Text** prop to the **beacon list’s** CMS field (`collectionId` + `fieldId`).
 * Uses `searchProps` for the pre-check so binding matches the full `InstanceProp` shape (getProps summaries omit detail).
 */
export async function tryBindBeaconListTargetInstanceTextToCms(
  instance: ComponentElement,
  def: Component,
  binding: { collectionId: string; fieldId: string }
): Promise<void> {
  const propId = await getBeaconListTargetTextPropId(def);
  if (propId == null) {
    return;
  }
  try {
    const full = await instance.searchProps();
    const p = full.find((x) => x.propId === propId);
    if (p != null && cmsBindingMatches(p.value, binding)) {
      return;
    }
  } catch (e) {
    console.warn(LOG_PREFIX, "searchProps (pre-bind)", e);
  }

  const input: CmsBindingInput = {
    sourceType: "cms",
    collectionId: binding.collectionId,
    fieldId: binding.fieldId,
  };
  try {
    if (typeof webflow.setSelectedElement === "function") {
      await webflow.setSelectedElement(instance);
    }
  } catch {
    /* selection is optional */
  }
  try {
    await instance.setProps([{ propId, value: input }]);
    if (typeof webflow.setSelectedElement === "function") {
      await webflow.setSelectedElement(instance);
    }
  } catch (e) {
    console.warn(LOG_PREFIX, "setProps CMS bind", e);
  }
}

function componentInstanceKey(el: ComponentElement): string {
  return `${el.id.component}:${el.id.element}`;
}

/**
 * Merges `priorityInstances` first (e.g. a node just returned from `append`), then the rest, deduping by id so a
 * newly placed instance is always included even if the page scan has not yet listed it.
 */
function mergeListTargetInstancesForCmsBinding(
  priority: readonly ComponentElement[] | undefined,
  fromPage: readonly ComponentElement[]
): ComponentElement[] {
  const seen = new Set<string>();
  const out: ComponentElement[] = [];
  for (const el of [...(priority ?? []), ...fromPage]) {
    const k = componentInstanceKey(el);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(el);
  }
  return out;
}

/**
 * Binds each **list render target** instance’s Text prop to the **beacon list’s** CMS field (see
 * {@link ensureBeaconListCmsTextFieldOnList}). Does not create a separate collection field per render target.
 * Pass `resolvedBinding` when you already called {@link ensureBeaconListCmsTextFieldOnList} (avoids duplicate work).
 */
export async function bindBeaconListTargetInstancesToListCmsText(options: {
  dataList: string;
  listContainer: BlockElement;
  def: Component;
  instances: ComponentElement[];
  /** Placed or focused instance — always merged first so bind runs even if the page scan lags. */
  priorityInstances?: readonly ComponentElement[];
  /** From a prior `ensure` — required after collection/field attrs change or list target still points at an old field. */
  resolvedBinding?: { collectionId: string; fieldId: string } | null;
}): Promise<void> {
  const binding =
    options.resolvedBinding ?? (await ensureBeaconListCmsTextFieldOnList(options.listContainer, options.dataList));
  if (binding == null) {
    return;
  }
  const toBind = mergeListTargetInstancesForCmsBinding(options.priorityInstances, options.instances);
  for (const inst of toBind) {
    await tryBindBeaconListTargetInstanceTextToCms(inst, options.def, binding);
  }
  const refocus = options.priorityInstances?.find(Boolean);
  if (refocus != null && typeof webflow.setSelectedElement === "function") {
    try {
      await webflow.setSelectedElement(refocus);
    } catch {
      /* selection is optional */
    }
  }
}
