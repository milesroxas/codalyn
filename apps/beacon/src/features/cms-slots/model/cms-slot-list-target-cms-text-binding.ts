import { getCmsSlotListTargetTextProp } from "@/features/cms-slots/model/cms-slot-list-target-text-field";
import { findCmsSlotListsOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";
import { towerFetch } from "@/shared/lib/tower-client";
import { webflowDesignerErrorCauseTag } from "@/shared/lib/webflow-designer-error";

const LOG_PREFIX = "[CMS slot CMS]";

/** Pre-rename Webflow Plain Text field display name; still matched when resolving existing fields. */
const LEGACY_CMS_SLOT_LIST_PLAIN_TEXT_FIELD_PREFIX = "Beacon list target text · ";
const MAX_EXIT_COMPONENT_STEPS = 4;
const FIELD_VISIBILITY_ATTEMPTS = 10;
const FIELD_VISIBILITY_DELAY_MS = 400;

/** Designer ↔︎ Data API lag after creating or selecting a CMS field; separate from Tower visibility polling. */
const CMS_BIND_ATTEMPTS = 12;
const CMS_BIND_RETRY_DELAY_MS = 200;
/** After `setProps`, `searchProps()` may lag reflecting the CMS binding — poll before treating bind as failed. */
const CMS_BIND_POLL_ATTEMPTS = 24;
const CMS_BIND_POLL_MS = 75;

/** Hidden CMS slot block: collection id of the CMS Plain Text field this slot binds to. */
export const CMS_SLOT_LIST_TARGET_CMS_COLLECTION_ID_ATTR = "data-beacon-cms-collection-id";

/** Hidden CMS slot block: field id companion to {@link CMS_SLOT_LIST_TARGET_CMS_COLLECTION_ID_ATTR}. */
export const CMS_SLOT_LIST_TARGET_CMS_FIELD_ID_ATTR = "data-beacon-cms-field-id";

export type CmsSlotListCmsBinding = {
  collectionId: string;
  fieldId: string;
};

export type CmsSlotListCmsTextFieldEnsureResult = {
  binding: CmsSlotListCmsBinding;
  fieldWasCreated: boolean;
};

export function cmsSlotListCmsPlainTextFieldDisplayName(dataList: string): string {
  return `CMS slot target text · ${dataList}`;
}

function legacyCmsSlotListCmsPlainTextFieldDisplayName(dataList: string): string {
  return `${LEGACY_CMS_SLOT_LIST_PLAIN_TEXT_FIELD_PREFIX}${dataList}`;
}

/**
 * On a CMS collection template page returns that collection’s id; otherwise `null`. The Designer only resolves CMS
 * bindable sources for the collection whose template the user is currently editing — `null` here means no CMS bind
 * is possible right now.
 */
export async function getCmsTemplateCollectionIdFromCurrentPage(): Promise<string | null> {
  if (typeof webflow.getCurrentPage !== "function") {
    return null;
  }
  const page = await webflow.getCurrentPage();
  if (page == null) {
    return null;
  }
  if (typeof page.getKind === "function") {
    const kind = await page.getKind();
    if (kind !== "cms") {
      return null;
    }
  }
  if (typeof page.getCollectionId !== "function") {
    return null;
  }
  const id = await page.getCollectionId();
  return id != null && id.trim() !== "" ? id : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

type ParsedField = { id?: string; type?: string; displayName?: string; slug?: string };

/** Webflow Data API variants: `PlainText`, hyphenated or spaced forms in GET responses. */
function isPlainTextFieldType(type: unknown): boolean {
  if (typeof type !== "string") return false;
  const normalized = type
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return normalized === "plaintext" || normalized === "text";
}

/** Stored attrs must reference an actual Plain Text field — otherwise Designer rejects CMS binding (“CMS field not found”). */
function fieldPlainTextById(fields: readonly ParsedField[] | null | undefined, fieldId: string): ParsedField | null {
  if (fields == null) return null;
  const f = fields.find((x) => x.id === fieldId);
  return f != null && isPlainTextFieldType(f.type) ? f : null;
}

function parseCollectionFields(data: unknown): ParsedField[] {
  if (!isRecord(data) || !Array.isArray(data.fields)) {
    return [];
  }
  const out: ParsedField[] = [];
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

function findBeaconListTargetField(fields: readonly ParsedField[], dataList: string): ParsedField | null {
  const wantNames = [
    cmsSlotListCmsPlainTextFieldDisplayName(dataList),
    legacyCmsSlotListCmsPlainTextFieldDisplayName(dataList),
  ];
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[·•]/g, "·");
  const wantNorms = new Set(wantNames.map(norm));
  for (const f of fields) {
    if (f.id == null || !isPlainTextFieldType(f.type) || f.displayName == null) {
      continue;
    }
    if (wantNames.includes(f.displayName) || wantNorms.has(norm(f.displayName))) {
      return f;
    }
  }
  return null;
}

async function readCollectionFields(collectionId: string): Promise<ParsedField[] | null> {
  const res = await towerFetch(`/api/v2/webflow/collections/${encodeURIComponent(collectionId)}`);
  if (!res.ok) {
    console.warn(LOG_PREFIX, "GET collection failed", res.status);
    return null;
  }
  try {
    return parseCollectionFields(await res.json());
  } catch {
    return null;
  }
}

async function sleepMs(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForFieldVisibility(collectionId: string, fieldId: string): Promise<boolean> {
  for (let attempt = 1; attempt <= FIELD_VISIBILITY_ATTEMPTS; attempt += 1) {
    const fields = await readCollectionFields(collectionId);
    if (fieldPlainTextById(fields, fieldId) != null) {
      return true;
    }
    if (attempt < FIELD_VISIBILITY_ATTEMPTS) {
      await sleepMs(FIELD_VISIBILITY_DELAY_MS);
    }
  }
  return false;
}

async function findExistingBeaconListField(collectionId: string, dataList: string): Promise<string | null> {
  const fields = await readCollectionFields(collectionId);
  if (fields == null) {
    return null;
  }
  return findBeaconListTargetField(fields, dataList)?.id ?? null;
}

type PostCmsPlainTextFieldResult = { fieldId: string; newlyCreated: boolean };

async function postNewCmsPlainTextField(
  collectionId: string,
  dataList: string
): Promise<PostCmsPlainTextFieldResult | null> {
  const res = await towerFetch(`/api/v2/webflow/collections/${encodeURIComponent(collectionId)}/fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      type: "PlainText",
      displayName: cmsSlotListCmsPlainTextFieldDisplayName(dataList),
      helpText: "Codalyn Beacon: CMS text for this CMS slot; list targets bind their Text prop here.",
    }),
  });
  if (res.status === 409) {
    const existing = await findExistingBeaconListField(collectionId, dataList);
    if (existing != null) {
      return { fieldId: existing, newlyCreated: false };
    }
    console.warn(LOG_PREFIX, "POST field 409 but could not resolve an existing Plain Text field");
    return null;
  }
  if (!res.ok) {
    console.warn(LOG_PREFIX, "POST field failed", res.status);
    return null;
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  const nested = isRecord(body) && isRecord(body.field) && typeof body.field.id === "string" ? body.field.id : null;
  const top = isRecord(body) && typeof body.id === "string" && body.id ? body.id : null;
  const newId = top ?? nested;
  if (newId == null) {
    console.warn(LOG_PREFIX, "POST field: missing id in response");
    return null;
  }
  if (await waitForFieldVisibility(collectionId, newId)) {
    return { fieldId: newId, newlyCreated: true };
  }
  const byName = await findExistingBeaconListField(collectionId, dataList);
  if (byName != null) {
    return { fieldId: byName, newlyCreated: false };
  }
  console.warn(LOG_PREFIX, "POST field: could not verify Plain Text field on collection after create");
  return null;
}

/** Confirms the binding still exists on the collection (Data API GET), for UI prompts and retries. */
export async function verifyCmsSlotListTargetPlainTextField(binding: CmsSlotListCmsBinding): Promise<boolean> {
  return waitForFieldVisibility(binding.collectionId, binding.fieldId);
}

/**
 * Data API: find or create the per-list Plain Text CMS field. List render targets bind their `Text` prop to this
 * field (one field per CMS slot, shared across all render-target instances).
 */
async function ensureCmsPlainTextField(
  collectionId: string,
  dataList: string
): Promise<(CmsSlotListCmsBinding & { fieldWasCreated: boolean }) | null> {
  const existing = await findExistingBeaconListField(collectionId, dataList);
  if (existing != null) {
    return { collectionId, fieldId: existing, fieldWasCreated: false };
  }
  const created = await postNewCmsPlainTextField(collectionId, dataList);
  if (created == null) {
    return null;
  }
  return { collectionId, fieldId: created.fieldId, fieldWasCreated: created.newlyCreated };
}

export async function getCmsSlotListTargetCmsCollectionIdFromListContainer(
  listContainer: BlockElement
): Promise<string | null> {
  const raw = await listContainer.getCustomAttribute(CMS_SLOT_LIST_TARGET_CMS_COLLECTION_ID_ATTR);
  return raw != null && String(raw).trim() !== "" ? String(raw).trim() : null;
}

export async function getCmsSlotListTargetCmsFieldIdFromListContainer(
  listContainer: BlockElement
): Promise<string | null> {
  const raw = await listContainer.getCustomAttribute(CMS_SLOT_LIST_TARGET_CMS_FIELD_ID_ATTR);
  return raw != null && String(raw).trim() !== "" ? String(raw).trim() : null;
}

async function persistCmsAttrsOnListBlock(listContainer: BlockElement, binding: CmsSlotListCmsBinding): Promise<void> {
  await listContainer.setCustomAttribute(CMS_SLOT_LIST_TARGET_CMS_COLLECTION_ID_ATTR, binding.collectionId);
  await listContainer.setCustomAttribute(CMS_SLOT_LIST_TARGET_CMS_FIELD_ID_ATTR, binding.fieldId);
}

function sameBlockElement(a: BlockElement, b: BlockElement): boolean {
  return a.id.component === b.id.component && a.id.element === b.id.element;
}

/** When off a CMS template page, reuse the collection id from another CMS slot on the same page. */
async function inferCmsCollectionIdFromSiblingBeaconLists(excludeContainer: BlockElement): Promise<string | null> {
  const lists = await findCmsSlotListsOnPage();
  for (const { container } of lists) {
    if (sameBlockElement(container, excludeContainer)) {
      continue;
    }
    const collectionId = await getCmsSlotListTargetCmsCollectionIdFromListContainer(container);
    if (collectionId != null) {
      return collectionId;
    }
  }
  return null;
}

/**
 * Resolves the CMS binding for this list (call **before** registering or placing a list-target component on a
 * collection template):
 * - On a CMS template page: ensures the field exists in **that** collection and persists ids on the list block.
 * - Off-template: reuses another CMS slot’s collection id on the same page, then ensures the field there.
 * - Off-template with stored attrs only: re-validates the stored field still exists in the stored collection.
 * - Otherwise: `null` (no CMS bind possible right now).
 *
 * After creating a field, Webflow’s Designer may not expose it for binding until the user switches to CMS and back
 * to Designer — use the CMS field link prompt rather than automatic page pivots.
 */
export async function ensureCmsSlotListCmsTextFieldOnList(
  listContainer: BlockElement,
  dataList: string
): Promise<CmsSlotListCmsTextFieldEnsureResult | null> {
  const pageCollection = await getCmsTemplateCollectionIdFromCurrentPage();
  const storedCollection = await getCmsSlotListTargetCmsCollectionIdFromListContainer(listContainer);
  const storedField = await getCmsSlotListTargetCmsFieldIdFromListContainer(listContainer);
  const collectionIdForEnsure = pageCollection ?? (await inferCmsCollectionIdFromSiblingBeaconLists(listContainer));

  if (collectionIdForEnsure != null) {
    if (storedCollection === collectionIdForEnsure && storedField != null) {
      const fields = await readCollectionFields(collectionIdForEnsure);
      if (fieldPlainTextById(fields, storedField) != null) {
        return {
          binding: { collectionId: collectionIdForEnsure, fieldId: storedField },
          fieldWasCreated: false,
        };
      }
    }
    const ensured = await ensureCmsPlainTextField(collectionIdForEnsure, dataList);
    if (ensured == null) {
      return null;
    }
    await persistCmsAttrsOnListBlock(listContainer, ensured);
    return {
      binding: { collectionId: ensured.collectionId, fieldId: ensured.fieldId },
      fieldWasCreated: ensured.fieldWasCreated,
    };
  }

  if (storedCollection != null && storedField != null) {
    const fields = await readCollectionFields(storedCollection);
    if (fieldPlainTextById(fields, storedField) != null) {
      return {
        binding: { collectionId: storedCollection, fieldId: storedField },
        fieldWasCreated: false,
      };
    }
  }

  return null;
}

export async function resolveCmsSlotListTargetCmsCollectionIdForCleanup(
  listContainer: BlockElement
): Promise<string | null> {
  const fromAttr = await getCmsSlotListTargetCmsCollectionIdFromListContainer(listContainer);
  return fromAttr ?? (await getCmsTemplateCollectionIdFromCurrentPage());
}

/**
 * Best-effort delete of the per-list Plain Text field. Prefer `fieldId` (from the list block); fall back to
 * resolving by display name. No-op when the field is already gone or Tower / API fails (logged).
 */
export async function tryDeleteCmsSlotListTargetCmsPlainTextField(
  collectionId: string,
  dataList: string,
  fieldId?: string | null
): Promise<void> {
  const direct = fieldId != null && String(fieldId).trim() !== "" ? String(fieldId).trim() : null;
  if (direct != null) {
    const res = await towerFetch(
      `/api/v2/webflow/collections/${encodeURIComponent(collectionId)}/fields/${encodeURIComponent(direct)}`,
      { method: "DELETE", headers: { Accept: "application/json" } }
    );
    if (res.ok || res.status === 404) {
      return;
    }
    console.warn(LOG_PREFIX, "DELETE field by id failed; falling back to name lookup", res.status);
  }
  const fields = await readCollectionFields(collectionId);
  const resolved = fields != null ? (findBeaconListTargetField(fields, dataList)?.id ?? null) : null;
  if (resolved == null) {
    return;
  }
  const res = await towerFetch(
    `/api/v2/webflow/collections/${encodeURIComponent(collectionId)}/fields/${encodeURIComponent(resolved)}`,
    { method: "DELETE", headers: { Accept: "application/json" } }
  );
  if (!res.ok && res.status !== 404) {
    console.warn(LOG_PREFIX, "DELETE field failed", res.status);
  }
}

async function exitToPageCanvas(): Promise<void> {
  if (typeof webflow.getCurrentComponent !== "function" || typeof webflow.exitComponent !== "function") {
    return;
  }
  for (let step = 0; step < MAX_EXIT_COMPONENT_STEPS; step += 1) {
    const current = await webflow.getCurrentComponent().catch(() => null);
    if (current == null) {
      return;
    }
    await webflow.exitComponent().catch(() => undefined);
  }
}

type CmsBindingValue = {
  sourceType: "cms";
  collectionId: string;
  fieldId: string;
};

function isCmsBindingValue(value: unknown): value is CmsBindingValue {
  if (value == null || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    row.sourceType === "cms" &&
    typeof row.collectionId === "string" &&
    typeof row.fieldId === "string" &&
    row.collectionId.trim() !== "" &&
    row.fieldId.trim() !== ""
  );
}

function matchesCmsBinding(value: unknown, expected: CmsSlotListCmsBinding): boolean {
  if (!isCmsBindingValue(value)) {
    return false;
  }
  return value.collectionId === expected.collectionId && value.fieldId === expected.fieldId;
}

/** Concatenate nested Designer error messages (`cause`, etc.) — wording varies by Webflow release / locale. */
function extractDesignerErrorText(err: unknown): string {
  const seen = new Set<unknown>();
  const parts: string[] = [];
  const walk = (e: unknown): void => {
    if (typeof e === "string") {
      parts.push(e);
      return;
    }
    if (e == null || typeof e !== "object") {
      return;
    }
    if (seen.has(e)) {
      return;
    }
    seen.add(e);
    const o = e as Record<string, unknown>;
    if (typeof o.message === "string") {
      parts.push(o.message);
    }
    if ("cause" in o) {
      walk(o.cause);
    }
    if (typeof o.details === "string") {
      parts.push(o.details);
    }
  };
  walk(err);
  return parts.join("\n").toLowerCase();
}

/** True when repeating `setProps` may succeed — wording/tags vary (“CMS field not found”, “field not found”, nested causes). */
function isTransientBeaconListCmsBindFailure(err: unknown): boolean {
  const tag = webflowDesignerErrorCauseTag(err);
  if (tag === "ResourceMissing") {
    return true;
  }
  const m = extractDesignerErrorText(err);
  if (!m.trim()) {
    return tag === "InvalidRequest";
  }
  if (/cms\s+field/i.test(m) && /not\s+found|could\s+not\s+find|unknown|missing|invalid/i.test(m)) {
    return true;
  }
  if (/field.*not\s+found|not\s+found.*field/i.test(m)) {
    return true;
  }
  if (/(cannot|unable\s+to)\s+(find|resolve|load)/i.test(m) && /field|cms|collection/i.test(m)) {
    return true;
  }
  // Designer sometimes surfaces stale-binding issues as InvalidRequest until CMS schema catches up.
  return tag === "InvalidRequest" && /cms|field|collection|bind/i.test(m);
}

async function yieldDesignerBeforeCmsBind(): Promise<void> {
  await sleepMs(0);
  if (typeof requestAnimationFrame !== "function") {
    return;
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

async function verifyCmsBindingApplied(
  instance: ComponentElement,
  propId: string,
  binding: CmsSlotListCmsBinding
): Promise<void> {
  const rows = await instance.searchProps();
  const bound = rows.find((row) => row.propId === propId);
  if (bound != null && matchesCmsBinding(bound.value, binding)) {
    return;
  }

  const diagnostic = {
    instanceId: instance.id,
    propId,
    expected: { sourceType: "cms", collectionId: binding.collectionId, fieldId: binding.fieldId },
    observedValue: bound?.value ?? null,
    searchablePropIds: rows.map((row) => row.propId),
  };
  throw new Error(`List target Text CMS binding verification failed after setProps: ${JSON.stringify(diagnostic)}`);
}

/** Poll after `setProps`; wrong CMS ids fail fast via {@link verifyCmsBindingApplied}. Returns whether binding matched. */
async function pollUntilListTargetCmsBindingMatches(
  instance: ComponentElement,
  propId: string,
  binding: CmsSlotListCmsBinding
): Promise<boolean> {
  for (let poll = 1; poll <= CMS_BIND_POLL_ATTEMPTS; poll += 1) {
    const rows = await instance.searchProps();
    const bound = rows.find((row) => row.propId === propId);
    if (bound != null && matchesCmsBinding(bound.value, binding)) {
      return true;
    }
    // Wrong CMS ids won’t heal by polling — fail immediately so tests don’t spin on intentional mismatches.
    if (bound != null && isCmsBindingValue(bound.value)) {
      await verifyCmsBindingApplied(instance, propId, binding);
    }
    if (poll < CMS_BIND_POLL_ATTEMPTS) {
      await sleepMs(CMS_BIND_POLL_MS);
    }
  }
  return false;
}

async function applyBeaconListTargetCmsBindingLoop(
  instance: ComponentElement,
  propId: string,
  binding: CmsSlotListCmsBinding,
  cmsBindPayload: {
    propId: string;
    value: { sourceType: "cms"; collectionId: string; fieldId: string };
  }
): Promise<void> {
  for (let outer = 1; outer <= CMS_BIND_ATTEMPTS; outer += 1) {
    try {
      await instance.setProps([cmsBindPayload]);
    } catch (e) {
      const retry = outer < CMS_BIND_ATTEMPTS && isTransientBeaconListCmsBindFailure(e);
      if (!retry) {
        throw e;
      }
      await sleepMs(CMS_BIND_RETRY_DELAY_MS);
      continue;
    }

    const matched = await pollUntilListTargetCmsBindingMatches(instance, propId, binding);
    if (matched) {
      return;
    }

    if (outer < CMS_BIND_ATTEMPTS) {
      await sleepMs(CMS_BIND_RETRY_DELAY_MS);
      continue;
    }

    await verifyCmsBindingApplied(instance, propId, binding);
  }
}

/**
 * Binds a render-target instance’s `Text` prop to the per-list CMS field. Canonical Webflow flow:
 * 1. Exit any open component context (CMS bindings only resolve on the page canvas).
 * 2. Resolve the prop id + valueType from the instance’s definition.
 * 3. Call `setProps([{ propId, value: { sourceType: "cms", collectionId, fieldId } }])` with the slim
 *    `CmsBindingInput` shape.
 * 4. Verify once via `searchProps()` that the prop now reflects the expected CMS binding.
 *
 * Throws when the prop can’t be resolved or post-set verification fails so callers can surface actionable diagnostics.
 */
export async function tryBindCmsSlotListTargetInstanceTextToCms(
  instance: ComponentElement,
  def: Component,
  binding: CmsSlotListCmsBinding
): Promise<void> {
  await exitToPageCanvas();

  let instDef: Component | undefined;
  try {
    instDef = await instance.getComponent();
  } catch {
    /* fall back to the definition handle the caller passed in */
  }
  const prop = await getCmsSlotListTargetTextProp(instDef ?? def);
  if (prop == null) {
    throw new Error("List target Text prop is missing, so CMS binding could not be applied.");
  }

  if (typeof webflow.setSelectedElement === "function") {
    try {
      await webflow.setSelectedElement(instance);
    } catch {
      /* selection is optional; binding works without it */
    }
  }

  await yieldDesignerBeforeCmsBind();

  const cmsBindPayload = {
    propId: prop.id,
    value: { sourceType: "cms" as const, collectionId: binding.collectionId, fieldId: binding.fieldId },
  };

  await applyBeaconListTargetCmsBindingLoop(instance, prop.id, binding, cmsBindPayload);
}

/**
 * Binds every list-target instance’s Text prop to the per-list CMS field. Pass `resolvedBinding` when the caller
 * already ran {@link ensureCmsSlotListCmsTextFieldOnList}; pass `null` to skip; omit to ensure inside.
 */
export async function bindCmsSlotListTargetInstancesToListCmsText(options: {
  dataList: string;
  listContainer: BlockElement;
  def: Component;
  instances: readonly ComponentElement[];
  /** Placed or focused instance — bound first so a brand-new node is wired before the page-scan results. */
  priorityInstances?: readonly ComponentElement[];
  /** From a prior `ensure` call. Pass `null` to skip when the caller already knows there’s no field. */
  resolvedBinding?: CmsSlotListCmsBinding | null;
}): Promise<void> {
  let binding: CmsSlotListCmsBinding | null;
  if (options.resolvedBinding !== undefined) {
    binding = options.resolvedBinding;
  } else {
    binding = (await ensureCmsSlotListCmsTextFieldOnList(options.listContainer, options.dataList))?.binding ?? null;
  }
  if (binding == null) {
    return;
  }

  const seen = new Set<string>();
  const ordered: ComponentElement[] = [];
  for (const el of [...(options.priorityInstances ?? []), ...options.instances]) {
    const key = `${el.id.component}:${el.id.element}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(el);
  }

  for (const inst of ordered) {
    await tryBindCmsSlotListTargetInstanceTextToCms(inst, options.def, binding);
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
