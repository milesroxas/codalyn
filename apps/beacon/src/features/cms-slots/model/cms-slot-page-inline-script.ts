import SparkMD5 from "spark-md5";
import { CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME } from "@/features/cms-slots/model/cms-slot-list-target-slot-style";
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

/**
 * Minified IIFE for the Beacon runtime source uploaded as a Webflow Asset.
 * Live-site debug: set `window.CODALYN_BEACON_DEBUG = true` (before load) or
 * `localStorage.setItem("codalyn-beacon-debug", "1")` then reload — watch console for `[codalyn-beacon]`.
 */
export function getCmsSlotPageInlineScriptSource(): string {
  return `(function(){
function bDbg(){try{return(typeof globalThis!=="undefined"&&!!globalThis.CODALYN_BEACON_DEBUG)||(typeof localStorage!=="undefined"&&localStorage.getItem("codalyn-beacon-debug")==="1")}catch(e){return false}}
function bLog(){if(!bDbg())return;console.log.apply(console,["[codalyn-beacon]"].concat([].slice.call(arguments)))}
function listKey(el){var t=String(el.getAttribute("data-list")||"").toLowerCase();return t&&t.indexOf("beacon-")===0?t:null}
function isSource(el){return String(el.getAttribute("data-target")||"").toLowerCase()==="beacons"&&String(el.getAttribute("data-beacon-target")||"").toLowerCase()!=="list"&&listKey(el)!=null}
function applyValue(el,v){v=String(v==null?"":v);var tag=String(el.tagName||"").toUpperCase();if(tag==="IMG"||tag==="SOURCE"){el.setAttribute("src",v);el.removeAttribute&&el.removeAttribute("srcset");return}if(tag==="A"){el.setAttribute("href",v);return}if(tag==="IFRAME"||tag==="EMBED"){el.setAttribute("src",v);return}if(tag==="INPUT"){var type=String(el.type||"").toLowerCase();if(type==="checkbox"||type==="radio"){el.checked=!!(v&&v!=="0"&&v!=="false"&&v.toLowerCase()!=="off")}else{el.value=v}return}if(tag==="TEXTAREA"||tag==="SELECT"){el.value=v;return}el.textContent=v}
function bBeaconNormHeadingTag(v){v=String(v==null?"":v).trim().toLowerCase();var m=v.match(/^h([1-6])$/);if(m)return"H"+m[1];if(/^[1-6]$/.test(v))return"H"+v;return""}
function bBeaconResolveHeadingTagEl(el,v){var want=bBeaconNormHeadingTag(v);if(!want)return el;var cur=String(el.tagName||"").toUpperCase();var head=/^H[1-6]$/.test(cur),wrap=cur==="DIV"||cur==="SPAN";if(!head&&!wrap)return el;if(head&&cur===want)return el;var doc=el.ownerDocument,nw=doc.createElement(want),a,i;while(el.firstChild)nw.appendChild(el.firstChild);for(i=el.attributes.length-1;i>=0;i--){a=el.attributes[i];nw.setAttribute(a.name,a.value)}if(el.parentNode){el.parentNode.replaceChild(nw,el);return nw}return el}
function pickP(ps,k){if(!k||!ps||typeof ps!=="object")return;var a=String(k);if(Object.prototype.hasOwnProperty.call(ps,a))return ps[a];var al=a.toLowerCase();for(var x in ps)if(Object.prototype.hasOwnProperty.call(ps,x)&&x.toLowerCase()===al)return ps[x]}
function bPropEmpty(v){if(v==null)return true;return String(v).trim()===""}
function bPropSetHidden(n,h){if(h){n.setAttribute("hidden","");n.setAttribute("aria-hidden","true")}else{n.removeAttribute("hidden");n.removeAttribute("aria-hidden")}}
function bListTargetReveal(target){target.classList.remove("${CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME}");target.style.removeProperty("visibility")}
function applyProps(target,payload){var vn=payload?+payload.v:NaN;if(!payload||!isFinite(vn)||vn<2)return;var pc=payload.p;if(!Array.isArray(pc))return;var rows=target.children,i,j,row,props,nodes,node,rawP,segs,si,seg,pv,ra,rh,anyV,d=bDbg(),totA=0,totH=0,nLen=rows.length<pc.length?rows.length:pc.length;for(i=0;i<nLen;i++){row=rows[i];props=pc[i];if(!row||props===null||typeof props!=="object"){if(d)bLog("row missing",i);continue}nodes=row.querySelectorAll("[data-codalyn-beacon-prop]");ra=0;rh=0;for(j=0;j<nodes.length;j++){node=nodes[j];rawP=node.getAttribute("data-codalyn-beacon-prop")||"";if(!rawP)continue;segs=String(rawP).split("|");anyV=false;for(si=0;si<segs.length;si++){seg=segs[si].trim();if(!seg)continue;pv=pickP(props,seg);if(bPropEmpty(pv))continue;anyV=true;if(bBeaconNormHeadingTag(String(pv))){node=bBeaconResolveHeadingTagEl(node,String(pv));continue}applyValue(node,String(pv))}if(!anyV){bPropSetHidden(node,true);rh++;if(d)bLog("no payload for attr",i,rawP,"keys",Object.keys(props));continue}bPropSetHidden(node,false);ra++}totA+=ra;totH+=rh;if(d)bLog("row",i,"nodes",nodes.length,"set",ra,"hidden",rh)}if(d)bLog("applyProps",totA,"set",totH,"hidden nodes")}
function reapply(target,payload,done){bLog("reapply 1/3 sync");applyProps(target,payload);setTimeout(function(){bLog("reapply 2/3 +0ms");applyProps(target,payload);setTimeout(function(){bLog("reapply 3/3 +100ms");applyProps(target,payload);if(typeof done==="function")done()},100)},0)}
function run(){
bLog("run",document.readyState);
var sourcesByList={},sources=document.querySelectorAll("[data-target=beacons][data-list]");
for(var i=0;i<sources.length;i++){var source=sources[i];if(isSource(source)){var key=listKey(source);if(key)sourcesByList[key]=source}}
bLog("hidden list keys",Object.keys(sourcesByList));
var targets=document.querySelectorAll("[data-beacon-target][data-list]");
bLog("list target elements",targets.length);
for(var t=0;t<targets.length;t++){
var target=targets[t],targetKey=listKey(target);
if(!targetKey||String(target.getAttribute("data-beacon-target")||"").toLowerCase()!=="list")continue;
var sourceNode=sourcesByList[targetKey];
if(!sourceNode){for(i=0;i<sources.length;i++){source=sources[i];if(isSource(source)&&listKey(source)===targetKey){sourceNode=source;break}}}
if(!sourceNode){bLog("skip (no source)",targetKey);continue}
target.style.visibility="hidden";
var raw=String(target.textContent||"").trim();
bLog("list",targetKey,"sourceChildren",sourceNode.children.length,"rawChars",raw.length,"rawStart",raw.slice(0,200));
target.textContent="";
var payload=null,ok=false,indices=null,v=0,pe=null;
try{payload=JSON.parse(raw);var vv=+payload.v;ok=!!(payload&&(vv===1||vv===2)&&Array.isArray(payload.i));if(ok){indices=payload.i;v=vv}}catch(e){ok=false;pe=String((e&&e.message)||e)}
bLog("parse",ok,pe?{err:pe}:null,"v",v,"vPayload",payload?payload.v:null,"i",indices?indices.length:0,"p",payload&&payload.p?payload.p.length:0);
var children=sourceNode.children,cloned=0;
if(ok){for(var u=0;u<indices.length;u++){var idx=+indices[u];if(idx===idx&&idx>=0&&idx%1===0&&idx<children.length){target.appendChild(children[idx].cloneNode(true));cloned++}}}else{for(var u=0;u<children.length;u++)target.appendChild(children[u].cloneNode(true))}
bLog("cloned rows",ok?"byIndex":"allChildren",ok?cloned:target.children.length,"targetChildren",target.children.length);
if(v>=2&&ok&&payload&&Array.isArray(payload.p))reapply(target,payload,function(){bListTargetReveal(target)});
else{bLog("skip reapply (need v>=2, ok, p[])",v,ok,Array.isArray(payload&&payload.p));bListTargetReveal(target)}}
bLog("run done")
}
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
  version: string
): Promise<{ id: string; version: string }> {
  const res = await towerFetch(`/api/v2/webflow/sites/${encodeURIComponent(siteId)}/registered_scripts/hosted`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      hostedLocation,
      integrityHash,
      version,
      displayName: REGISTER_DISPLAY_NAME,
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

async function registerHostedRuntimeScript(
  siteId: string,
  sourceCode: string,
  version: string
): Promise<{ id: string; version: string }> {
  const runtimeHash = hashCmsSlotRuntimeSource(sourceCode);
  const fileName = `codalyn-beacon-runtime-${runtimeHash}.js`;
  const asset = await createRuntimeAsset(siteId, fileName, sourceCode);
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
  return registerHostedScript(siteId, hostedLocation, await sourceSRIHash(sourceCode), version);
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

/**
 * Uploads the Beacon runtime to Webflow Assets, registers it as a hosted script, and applies it to the current page
 * footer custom code. Requires Tower + Webflow OAuth with `assets:write`, `custom_code:read`, and
 * `custom_code:write`. Re-publish the site for changes to affect the live site.
 */
export async function syncCmsSlotPageInlineScript(): Promise<void> {
  if (!getTowerOrigin()) {
    throw new Error("Tower is not configured (VITE_TOWER_ORIGIN). Cannot sync page custom code.");
  }

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

/**
 * Removes the Codalyn beacon **footer** custom code from the current page (Tower + Data API). No-op if Tower is
 * not configured or the page has no matching script.
 */
export async function removeCmsSlotPageRuntimeFromPage(): Promise<void> {
  if (!getTowerOrigin()) {
    return;
  }

  const pageId = (await webflow.getCurrentPage()).id as string;
  const existing = await getPageCustomScripts(pageId);
  const next = withoutCmsSlotMarkedScripts(existing);
  if (next.length === existing.length) {
    return;
  }
  await putPageCustomScripts(pageId, next);
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
