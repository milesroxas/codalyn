import SparkMD5 from "spark-md5";
import { beaconPropDebugRuntimeSource } from "@/features/cms-slots/model/cms-slot-beacon-debug";
import {
  beaconPropApplyValueRuntimeSource,
  beaconPropEmptyRuntimeSource,
  beaconPropPickRuntimeSource,
  beaconPropVisibilityRuntimeSource,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import { cmsSlotListTargetDesignerPlaceholderRuntimeRemovalSource } from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";
import {
  CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME,
  cmsSlotListTargetRuntimeLayoutRevealSource,
  ensureCmsSlotListTargetLayoutStyle,
} from "@/features/cms-slots/model/cms-slot-list-target-slot-style";
import { getTowerOrigin, towerFetch } from "@/shared/lib/tower-client";

/** Matches `attributes` on the applied page script so we can replace it on sync. */
export const CMS_SLOT_PAGE_SCRIPT_MARKER_ATTR = "data-codalyn-beacon";
export const CMS_SLOT_PAGE_SCRIPT_MARKER_VALUE = "runtime";

/** Fingerprint of {@link getCmsSlotPageInlineScriptSource} so we can detect drift vs the page footer script. */
export const CMS_SLOT_PAGE_SCRIPT_HASH_ATTR = "data-codalyn-beacon-src-hash";

/** 32-bit FNV-1a → 8 hex chars (stable across browsers for the same source string). */
export function hashCmsSlotRuntimeSource(source: string): string {
  let h = 2166136261;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const REGISTER_DISPLAY_NAME = "CodalynBeaconRuntime";

/** Uploaded JS files for the hosted beacon runtime (`registerHostedRuntimeScript`). */
export const CMS_SLOT_RUNTIME_ASSET_FILE_PREFIX = "codalyn-beacon-runtime-";

const LOG_PREFIX = "[codalyn-beacon-runtime-cleanup]";

/**
 * Minified IIFE for the Beacon runtime source uploaded as a Webflow Asset.
 */
export function getCmsSlotPageInlineScriptSource(): string {
  return `(function(){
function listKey(el){var t=String(el.getAttribute("data-list")||"").toLowerCase();return t&&t.indexOf("beacon-")===0?t:null}
function isSource(el){return String(el.getAttribute("data-target")||"").toLowerCase()==="beacons"&&String(el.getAttribute("data-beacon-target")||"").toLowerCase()!=="list"&&listKey(el)!=null}
${beaconPropDebugRuntimeSource()}
${beaconPropApplyValueRuntimeSource()}
function bBeaconNormHeadingTag(v){v=String(v==null?"":v).trim().toLowerCase();var m=v.match(/^h([1-6])$/);if(m)return"H"+m[1];if(/^[1-6]$/.test(v))return"H"+v;return""}
function bBeaconResolveHeadingTagEl(el,v){var want=bBeaconNormHeadingTag(v);if(!want)return el;var cur=String(el.tagName||"").toUpperCase();var head=/^H[1-6]$/.test(cur),wrap=cur==="DIV"||cur==="SPAN";if(!head&&!wrap)return el;if(head&&cur===want)return el;var doc=el.ownerDocument,nw=doc.createElement(want),a,i;while(el.firstChild)nw.appendChild(el.firstChild);for(i=el.attributes.length-1;i>=0;i--){a=el.attributes[i];nw.setAttribute(a.name,a.value)}if(el.parentNode){el.parentNode.replaceChild(nw,el);return nw}return el}
${beaconPropPickRuntimeSource()}
${beaconPropEmptyRuntimeSource()}
${beaconPropVisibilityRuntimeSource()}
function bListTargetReveal(target){target.classList.remove("${CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME}");${cmsSlotListTargetDesignerPlaceholderRuntimeRemovalSource()}${cmsSlotListTargetRuntimeLayoutRevealSource()}target.style.removeProperty("visibility");target.removeAttribute("aria-label")}
function applyProps(target,payload){var vn=payload?+payload.v:NaN;if(!payload||!isFinite(vn)||vn<3)return;var pc=payload.p;if(!Array.isArray(pc))return;var rows=target.children,i,j,k,row,props,nodes,cands,node,rawP,isCond,segs,si,seg,pv,anyV,totA=0,totH=0,nLen=rows.length<pc.length?rows.length:pc.length;for(i=0;i<nLen;i++){row=rows[i];props=pc[i];if(!row||props===null||typeof props!=="object"){continue}nodes=row.querySelectorAll("[data-cb-c]");cands=[];if(row.getAttribute&&(row.getAttribute("data-cb-c")||"")!=="")cands.push(row);for(k=0;k<nodes.length;k++)cands.push(nodes[k]);for(j=0;j<cands.length;j++){node=cands[j];rawP=node.getAttribute("data-cb-c")||"";if(!rawP)continue;isCond=node.getAttribute("data-cb-v")==="1";segs=String(rawP).split("|");anyV=false;for(si=0;si<segs.length;si++){seg=segs[si].trim();if(!seg)continue;pv=pickP(props,seg);if(bPropEmpty(pv))continue;anyV=true;if(bBeaconNormHeadingTag(String(pv))){node=bBeaconResolveHeadingTagEl(node,String(pv));continue}if(bLooksLikeImageUrl(String(pv)))bLog("apply image",seg,String(pv).slice(0,80));applyValue(node,String(pv))}if(anyV){bPropReveal(node,row);totA++;continue}if(isCond){bPropClearPublishPlaceholder(node);bPropConceal(node,row);bLog("conceal empty conditional",rawP);totH++}}}bLog("applyProps",{rows:nLen,applied:totA,concealed:totH});bDbgBump("applied",totA);bDbgBump("concealed",totH)}
function reapply(target,payload,done){applyProps(target,payload);setTimeout(function(){applyProps(target,payload);setTimeout(function(){applyProps(target,payload);if(typeof done==="function")done()},100)},0)}
function run(){
var sourcesByList={},sources=document.querySelectorAll("[data-target=beacons][data-list]");
for(var i=0;i<sources.length;i++){var source=sources[i];if(isSource(source)){var key=listKey(source);if(key)sourcesByList[key]=source}}
var lk=0,srcKeys=[];for(var sk in sourcesByList)if(Object.prototype.hasOwnProperty.call(sourcesByList,sk)){lk++;srcKeys.push(sk)}bDbgBump("lists",lk);
var targets=document.querySelectorAll("[data-beacon-target][data-list]");
bLog("runtime start",{sourceEls:sources.length,sourceLists:srcKeys,targetEls:targets.length});
for(var t=0;t<targets.length;t++){
var target=targets[t],targetKey=listKey(target);
if(!targetKey||String(target.getAttribute("data-beacon-target")||"").toLowerCase()!=="list"){bLog("skip target: not a list target",{key:targetKey,role:String(target.getAttribute("data-beacon-target")||"")});continue}
var sourceNode=sourcesByList[targetKey];
if(!sourceNode){for(i=0;i<sources.length;i++){source=sources[i];if(isSource(source)&&listKey(source)===targetKey){sourceNode=source;break}}}
if(!sourceNode){bLog("skip target: no source list found",{key:targetKey,available:srcKeys});continue}
bDbgBump("targets",1);
target.style.visibility="hidden";
var raw=String(target.textContent||"").trim();
target.textContent="";
var payload=null,ok=false,indices=null,v=0;
try{payload=JSON.parse(raw);var vv=+payload.v;ok=!!(payload&&vv===3&&Array.isArray(payload.i));if(ok){indices=payload.i;v=vv}}catch(e){ok=false}
var children=sourceNode.children,cloned=0;
if(ok){for(var u=0;u<indices.length;u++){var idx=+indices[u];if(idx===idx&&idx>=0&&idx%1===0&&idx<children.length){target.appendChild(children[idx].cloneNode(true));cloned++}}}else{for(var u=0;u<children.length;u++){target.appendChild(children[u].cloneNode(true));cloned++}}
bDbgBump("cloned",cloned);bLog("clone list",{list:targetKey,cloned:cloned,parsed:ok,sourceChildren:children.length,indices:ok&&indices?indices.length:null,rawLen:raw.length});
if(ok&&payload&&Array.isArray(payload.p))reapply(target,payload,function(){bListTargetReveal(target)});
else{bListTargetReveal(target)}}
}
bDbgBindKeys();
if(document.readyState==="loading")addEventListener("DOMContentLoaded",run);else run();
})();`;
}

function inlineScriptVersion(): string {
  const base = String(__APP_VERSION__ ?? "0.0.1")
    .split("+")[0]
    .replace(/[^0-9.]/g, "")
    .replace(/^\.+|\.+$/g, "");
  const safeBase = base.length > 0 ? base : "0.0.1";
  return `${safeBase}+beacon.${Date.now()}`;
}

type PageCustomScript = {
  id: string;
  location: "header" | "footer" | string;
  version: string;
  attributes?: Record<string, string>;
};

/** Webflow sometimes returns different casing for `location` / `attributes` keys. */
function scriptLocation(s: PageCustomScript): string {
  return String(s.location ?? "").toLowerCase();
}

function scriptAttrCI(attrs: Record<string, string> | undefined, name: string): string | undefined {
  if (!attrs) return undefined;
  const want = name.toLowerCase();
  for (const [k, v] of Object.entries(attrs)) {
    if (k.toLowerCase() === want) return v;
  }
  return undefined;
}

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function assertTowerOk(res: Response, action: string): Promise<void> {
  if (res.ok) {
    return;
  }
  let msg = `${action} failed (${res.status})`;
  const j = await readJson<{
    message?: string;
    error?: string;
    hint?: string;
    code?: string;
    details?: unknown;
  }>(res);
  if (typeof j?.message === "string" && j.message.length > 0) {
    msg = j.message;
  } else if (typeof j?.error === "string" && j.error.length > 0) {
    msg = j.error;
  } else if (typeof j?.hint === "string" && j.hint.length > 0) {
    msg = j.hint;
  }
  const scopeContext = `${msg} ${String(j?.code ?? "")} ${JSON.stringify(j?.details ?? "")}`.toLowerCase();
  if (
    scopeContext.includes("missing_scope") ||
    scopeContext.includes("missing scopes") ||
    scopeContext.includes("missing_scopes") ||
    scopeContext.includes("assets:write") ||
    scopeContext.includes("custom_code:write")
  ) {
    msg += " Reconnect Webflow in Tower so the OAuth token includes assets:write and custom_code:write.";
  }
  throw new Error(msg);
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return btoa(out);
}

function sourceToBytes(sourceCode: string): Uint8Array {
  return new TextEncoder().encode(sourceCode);
}

function sourceToBlob(sourceCode: string): Blob {
  return new Blob([sourceCode], { type: "application/javascript; charset=utf-8" });
}

function sourceMd5Hex(sourceCode: string): string {
  const bytes = sourceToBytes(sourceCode);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return SparkMD5.ArrayBuffer.hash(copy.buffer);
}

async function sourceSRIHash(sourceCode: string): Promise<string> {
  const bytes = sourceToBytes(sourceCode);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-384", copy.buffer);
  return `sha384-${arrayBufferToBase64(new Uint8Array(digest))}`;
}

type CreatedWebflowAsset = {
  uploadDetails?: Record<string, string>;
  uploadUrl?: string;
  hostedUrl?: string;
  assetUrl?: string;
};

async function createRuntimeAsset(siteId: string, fileName: string, sourceCode: string): Promise<CreatedWebflowAsset> {
  const res = await towerFetch(`/api/v2/webflow/sites/${encodeURIComponent(siteId)}/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      fileName,
      fileHash: sourceMd5Hex(sourceCode),
    }),
  });
  await assertTowerOk(res, "Create runtime asset");
  const data = await readJson<CreatedWebflowAsset>(res);
  if (!data || typeof data.uploadUrl !== "string" || !data.uploadDetails || typeof data.uploadDetails !== "object") {
    throw new Error("Create runtime asset: unexpected response.");
  }
  return data;
}

async function uploadRuntimeAsset(
  uploadUrl: string,
  uploadDetails: Record<string, string>,
  sourceCode: string
): Promise<void> {
  const form = new FormData();
  for (const [k, v] of Object.entries(uploadDetails)) {
    form.append(k, String(v));
  }
  form.append("file", sourceToBlob(sourceCode), "runtime.js");
  const res = await fetch(uploadUrl, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Upload runtime asset failed (${res.status})`);
  }
}

async function registerHostedScript(
  siteId: string,
  hostedLocation: string,
  integrityHash: string,
  version: string,
  displayName: string
): Promise<{ id: string; version: string }> {
  const res = await towerFetch(`/api/v2/webflow/sites/${encodeURIComponent(siteId)}/registered_scripts/hosted`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      hostedLocation,
      integrityHash,
      version,
      displayName,
      canCopy: true,
    }),
  });
  await assertTowerOk(res, "Register hosted script");
  const data = await readJson<{ id?: string; version?: string }>(res);
  if (typeof data?.id !== "string" || typeof data?.version !== "string") {
    throw new Error("Register hosted script: unexpected response.");
  }
  return { id: data.id, version: data.version };
}

async function registerHostedAssetScript(
  siteId: string,
  sourceCode: string,
  version: string,
  options: { fileName: string; displayName: string }
): Promise<{ id: string; version: string }> {
  const asset = await createRuntimeAsset(siteId, options.fileName, sourceCode);
  const uploadUrl = typeof asset.uploadUrl === "string" ? asset.uploadUrl : "";
  const uploadDetails = asset.uploadDetails;
  if (uploadUrl.length === 0 || uploadDetails == null) {
    throw new Error("Create runtime asset: missing upload payload.");
  }
  await uploadRuntimeAsset(uploadUrl, uploadDetails, sourceCode);
  const hostedLocation = asset.hostedUrl ?? asset.assetUrl;
  if (typeof hostedLocation !== "string" || hostedLocation.length === 0) {
    throw new Error("Create runtime asset: missing hosted URL.");
  }
  return registerHostedScript(siteId, hostedLocation, await sourceSRIHash(sourceCode), version, options.displayName);
}

async function registerHostedRuntimeScript(
  siteId: string,
  sourceCode: string,
  version: string
): Promise<{ id: string; version: string }> {
  const runtimeHash = hashCmsSlotRuntimeSource(sourceCode);
  return registerHostedAssetScript(siteId, sourceCode, version, {
    fileName: `codalyn-beacon-runtime-${runtimeHash}.js`,
    displayName: REGISTER_DISPLAY_NAME,
  });
}

async function getPageCustomScripts(pageId: string): Promise<PageCustomScript[]> {
  const res = await towerFetch(`/api/v2/webflow/pages/${encodeURIComponent(pageId)}/custom_code`);
  /** First-time pages have no custom-code resource yet; Webflow returns 404 with "Custom code block not found". */
  if (res.status === 404) {
    return [];
  }
  await assertTowerOk(res, "Get page custom code");
  const data = await readJson<{ scripts?: PageCustomScript[] }>(res);
  return Array.isArray(data?.scripts) ? data.scripts : [];
}

function isRetryableCustomCodeNotReady(res: Response, message: string): boolean {
  if (res.status === 404) {
    return true;
  }
  return /custom code block not found|resource not found/i.test(message);
}

async function putPageCustomScripts(pageId: string, scripts: PageCustomScript[]): Promise<void> {
  const body = JSON.stringify({ scripts });
  const maxAttempts = 5;
  let lastMessage = "Update page custom code failed";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 350 * attempt));
    }
    const res = await towerFetch(`/api/v2/webflow/pages/${encodeURIComponent(pageId)}/custom_code`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
    });
    if (res.ok) {
      return;
    }
    const j = await readJson<{ message?: string }>(res);
    lastMessage = typeof j?.message === "string" && j.message.length > 0 ? j.message : `${lastMessage} (${res.status})`;
    if (isRetryableCustomCodeNotReady(res, lastMessage) && attempt < maxAttempts - 1) {
      continue;
    }
    throw new Error(lastMessage);
  }
}

function withoutCmsSlotMarkedScripts(scripts: PageCustomScript[]): PageCustomScript[] {
  return scripts.filter(
    (s) => scriptAttrCI(s.attributes, CMS_SLOT_PAGE_SCRIPT_MARKER_ATTR) !== CMS_SLOT_PAGE_SCRIPT_MARKER_VALUE
  );
}

type PaginatedList = { limit: number; offset: number; total: number };

type SiteAssetRow = {
  id: string;
  hostedUrl: string;
  originalFileName: string;
};

type RegisteredScriptRow = {
  id: string;
  displayName?: string;
  hostedLocation?: string;
};

export function isBeaconRuntimeAssetFileName(fileName: string): boolean {
  return fileName.startsWith(CMS_SLOT_RUNTIME_ASSET_FILE_PREFIX) && fileName.endsWith(".js");
}

export function normalizeHostedAssetUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.href.replace(/\/$/, "");
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

export function selectBeaconRuntimeAssetIdsToPurge(options: {
  assets: SiteAssetRow[];
  appliedHostedUrls: Iterable<string>;
}): string[] {
  const applied = new Set([...options.appliedHostedUrls].map(normalizeHostedAssetUrl));
  return options.assets
    .filter((asset) => isBeaconRuntimeAssetFileName(asset.originalFileName))
    .filter((asset) => !applied.has(normalizeHostedAssetUrl(asset.hostedUrl)))
    .map((asset) => asset.id);
}

async function fetchAllPaginated<T>(
  pathBase: string,
  pick: (body: Record<string, unknown>) => { items: T[]; pagination?: PaginatedList }
): Promise<T[]> {
  const limit = 100;
  let offset = 0;
  const all: T[] = [];

  for (;;) {
    const sep = pathBase.includes("?") ? "&" : "?";
    const res = await towerFetch(`${pathBase}${sep}limit=${limit}&offset=${offset}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Paginated fetch failed (${res.status})`);
    }
    const body = (await readJson<Record<string, unknown>>(res)) ?? {};
    const { items, pagination } = pick(body);
    all.push(...items);
    const total = pagination?.total ?? items.length;
    offset += items.length;
    if (items.length === 0 || offset >= total) {
      break;
    }
  }

  return all;
}

async function getSiteCustomScripts(siteId: string): Promise<PageCustomScript[]> {
  const res = await towerFetch(`/api/v2/webflow/sites/${encodeURIComponent(siteId)}/custom_code`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) {
    return [];
  }
  await assertTowerOk(res, "Get site custom code");
  const data = await readJson<{ scripts?: PageCustomScript[] }>(res);
  return Array.isArray(data?.scripts) ? data.scripts : [];
}

async function listAllSitePageIds(siteId: string): Promise<string[]> {
  const pages = await fetchAllPaginated<{ id?: string }>(
    `/api/v2/webflow/sites/${encodeURIComponent(siteId)}/pages`,
    (body) => ({
      items: Array.isArray(body.pages) ? (body.pages as { id?: string }[]) : [],
      pagination: body.pagination as PaginatedList | undefined,
    })
  );
  return pages.map((page) => page.id).filter((id): id is string => typeof id === "string" && id.length > 0);
}

async function listBeaconRuntimeAssets(siteId: string): Promise<SiteAssetRow[]> {
  const assets = await fetchAllPaginated<SiteAssetRow>(
    `/api/v2/webflow/sites/${encodeURIComponent(siteId)}/assets`,
    (body) => ({
      items: Array.isArray(body.assets) ? (body.assets as SiteAssetRow[]) : [],
      pagination: body.pagination as PaginatedList | undefined,
    })
  );
  return assets.filter(
    (asset) =>
      typeof asset.id === "string" &&
      typeof asset.hostedUrl === "string" &&
      typeof asset.originalFileName === "string" &&
      isBeaconRuntimeAssetFileName(asset.originalFileName)
  );
}

async function listRegisteredBeaconRuntimeScripts(siteId: string): Promise<RegisteredScriptRow[]> {
  const scripts = await fetchAllPaginated<RegisteredScriptRow>(
    `/api/v2/webflow/sites/${encodeURIComponent(siteId)}/registered_scripts`,
    (body) => ({
      items: Array.isArray(body.registeredScripts) ? (body.registeredScripts as RegisteredScriptRow[]) : [],
      pagination: body.pagination as PaginatedList | undefined,
    })
  );
  return scripts.filter((script) => script.displayName === REGISTER_DISPLAY_NAME);
}

function collectScriptIds(scripts: PageCustomScript[] | undefined, out: Set<string>): void {
  for (const script of scripts ?? []) {
    if (typeof script.id === "string" && script.id.length > 0) {
      out.add(script.id);
    }
  }
}

async function collectAppliedCustomCodeScriptIds(siteId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  collectScriptIds(await getSiteCustomScripts(siteId), ids);

  const pageIds = await listAllSitePageIds(siteId);
  const batchSize = 5;
  for (let i = 0; i < pageIds.length; i += batchSize) {
    const batch = pageIds.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (pageId) => {
        try {
          collectScriptIds(await getPageCustomScripts(pageId), ids);
        } catch (err) {
          console.warn(LOG_PREFIX, "Could not read page custom code", pageId, err);
        }
      })
    );
  }

  return ids;
}

function collectAppliedHostedUrls(
  appliedScriptIds: Set<string>,
  registeredScripts: RegisteredScriptRow[]
): Set<string> {
  const out = new Set<string>();
  for (const script of registeredScripts) {
    if (!appliedScriptIds.has(script.id)) {
      continue;
    }
    if (typeof script.hostedLocation !== "string" || script.hostedLocation.length === 0) {
      continue;
    }
    out.add(normalizeHostedAssetUrl(script.hostedLocation));
  }
  return out;
}

async function deleteSiteAsset(assetId: string): Promise<boolean> {
  const res = await towerFetch(`/api/v2/webflow/assets/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  return res.ok || res.status === 404;
}

/**
 * Best-effort delete of beacon runtime JS assets that are no longer referenced by site or page custom code.
 * Also clears stale assets left behind by prior syncs on the same page.
 */
async function purgeUnreferencedBeaconRuntimeAssets(siteId: string): Promise<void> {
  try {
    const [appliedScriptIds, registeredScripts, assets] = await Promise.all([
      collectAppliedCustomCodeScriptIds(siteId),
      listRegisteredBeaconRuntimeScripts(siteId),
      listBeaconRuntimeAssets(siteId),
    ]);
    const appliedHostedUrls = collectAppliedHostedUrls(appliedScriptIds, registeredScripts);
    const assetIds = selectBeaconRuntimeAssetIdsToPurge({ assets, appliedHostedUrls });
    for (const assetId of assetIds) {
      const ok = await deleteSiteAsset(assetId);
      if (!ok) {
        console.warn(LOG_PREFIX, "DELETE asset failed", assetId);
      }
    }
  } catch (err) {
    console.warn(LOG_PREFIX, "Runtime asset cleanup failed", err);
  }
}

/**
 * Uploads the Beacon runtime to Webflow Assets, registers it as a hosted script, and applies it to the current page
 * footer custom code. Requires Tower + Webflow OAuth with `assets:write`, `custom_code:read`, and
 * `custom_code:write`. Re-publish the site for changes to affect the live site.
 */
export async function syncCmsSlotPageInlineScript(): Promise<void> {
  if (!getTowerOrigin()) {
    throw new Error("Tower is not configured (VITE_TOWER_ORIGIN). Cannot sync page custom code.");
  }

  await ensureCmsSlotListTargetLayoutStyle();

  const sourceCode = getCmsSlotPageInlineScriptSource();

  const siteId = (await webflow.getSiteInfo()).siteId;
  const pageId = (await webflow.getCurrentPage()).id as string;

  const registered = await registerHostedRuntimeScript(siteId, sourceCode, inlineScriptVersion());
  const existing = await getPageCustomScripts(pageId);
  const merged: PageCustomScript[] = [
    ...withoutCmsSlotMarkedScripts(existing),
    {
      id: registered.id,
      location: "footer",
      version: registered.version,
      attributes: {
        [CMS_SLOT_PAGE_SCRIPT_MARKER_ATTR]: CMS_SLOT_PAGE_SCRIPT_MARKER_VALUE,
        [CMS_SLOT_PAGE_SCRIPT_HASH_ATTR]: hashCmsSlotRuntimeSource(sourceCode),
      },
    },
  ];

  await putPageCustomScripts(pageId, merged);
}

export type CmsSlotPageRuntimeRemovalResult =
  | { status: "removed" }
  | { status: "not_found" }
  | { status: "skipped_no_tower" }
  | { status: "failed"; reason: string };

/**
 * Removes the Codalyn beacon **footer** custom code from the current page (Tower + Data API) and deletes unreferenced
 * `codalyn-beacon-runtime-*.js` assets from the site. No-op if Tower is not configured or the page has no matching
 * script.
 */
export async function removeCmsSlotPageRuntimeFromPage(): Promise<CmsSlotPageRuntimeRemovalResult> {
  if (!getTowerOrigin()) {
    return { status: "skipped_no_tower" };
  }

  try {
    const siteId = (await webflow.getSiteInfo()).siteId;
    const pageId = (await webflow.getCurrentPage()).id as string;
    const existing = await getPageCustomScripts(pageId);
    const next = withoutCmsSlotMarkedScripts(existing);
    if (next.length === existing.length) {
      return { status: "not_found" };
    }
    await putPageCustomScripts(pageId, next);
    await purgeUnreferencedBeaconRuntimeAssets(siteId);
    return { status: "removed" };
  } catch (err) {
    return { status: "failed", reason: formatRuntimeStatusError(err) };
  }
}

function formatRuntimeStatusError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return "Could not verify page script.";
}

export type CmsSlotPageRuntimeSyncStatus = { synced: boolean; reason?: string };

/**
 * `true` when the current page’s footer includes the Codalyn beacon runtime and its hash matches the extension build.
 * Composer only lists beacons when this is satisfied so live/preview match the expected cloning script.
 */
export async function getCmsSlotPageRuntimeSyncStatus(): Promise<CmsSlotPageRuntimeSyncStatus> {
  if (!getTowerOrigin()) {
    return { synced: false, reason: "Tower is not configured." };
  }

  const expectedHash = hashCmsSlotRuntimeSource(getCmsSlotPageInlineScriptSource());

  try {
    const pageId = (await webflow.getCurrentPage()).id as string;
    const existing = await getPageCustomScripts(pageId);
    const beacon = existing.find(
      (s) =>
        scriptLocation(s) === "footer" &&
        scriptAttrCI(s.attributes, CMS_SLOT_PAGE_SCRIPT_MARKER_ATTR) === CMS_SLOT_PAGE_SCRIPT_MARKER_VALUE
    );
    if (beacon == null) {
      return {
        synced: false,
        reason: "No beacon script in footer — sync from Engine.",
      };
    }
    const applied = scriptAttrCI(beacon.attributes, CMS_SLOT_PAGE_SCRIPT_HASH_ATTR);
    if (applied !== expectedHash) {
      return {
        synced: false,
        reason: "Beacon script out of date — sync from Engine.",
      };
    }
    return { synced: true };
  } catch (e) {
    return { synced: false, reason: formatRuntimeStatusError(e) };
  }
}
