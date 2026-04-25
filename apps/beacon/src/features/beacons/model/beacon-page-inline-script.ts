import { getTowerOrigin, towerFetch } from "@/shared/lib/tower-client";

/** Matches `attributes` on the applied page script so we can replace it on sync. */
export const BEACON_PAGE_SCRIPT_MARKER_ATTR = "data-codalyn-beacon";
export const BEACON_PAGE_SCRIPT_MARKER_VALUE = "runtime";

/** Fingerprint of {@link getBeaconPageInlineScriptSource} so we can detect drift vs the page footer script. */
export const BEACON_PAGE_SCRIPT_HASH_ATTR = "data-codalyn-beacon-src-hash";

/** 32-bit FNV-1a → 8 hex chars (stable across browsers for the same source string). */
export function hashBeaconRuntimeSource(source: string): string {
  let h = 2166136261;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const REGISTER_DISPLAY_NAME = "CodalynBeaconRuntime";

/**
 * Minified IIFE (&lt;2000 chars) for Webflow inline script registration (`sourceCode` is raw JS, no &lt;script&gt; tag).
 */
export function getBeaconPageInlineScriptSource(): string {
  // List target Text = CMS “Beacon list target text” for this item; that string is the payload (same JSON
  // Composer writes per entry). Read `i` = indices into hidden `beacon_list` children, in order. If
  // missing/invalid, clone all source children in DOM order.
  return '(function(){function a(e){var t=e.getAttribute("data-list");return t&&0===t.indexOf("beacon-")?t:null}function b(w,e){if(e.parentElement!==w)return!1;if("beacons"!==e.getAttribute("data-target"))return!1;if("list"===e.getAttribute("data-beacon-target"))return!1;return null!=a(e)}function c(){var w=document.querySelector(\'[data-beacon-wrapper="beacons-wrapper"]\');if(!w)return;for(var t={},n=0;n<w.children.length;n++){var e=w.children[n];if(b(w,e)){var r=a(e);r&&(t[r]=e)}}for(var o=document.querySelectorAll(\'[data-beacon-target="list"][data-list]\'),d=0;d<o.length;d++){var i=o[d],l=a(i);if(l){var s=t[l];if(s){var f=(i.textContent||"").trim();for(;i.firstChild;)i.removeChild(i.firstChild);var p=null,g=!1;try{var h=JSON.parse(f);h&&1===h.v&&"[object Array]"===Object.prototype.toString.call(h.i)&&(p=h.i,g=!0)}catch(x){}var y=s.children;if(g)for(var u=0;u<p.length;u++){var m=+p[u];m===m&&0<=m&&m%1==0&&m<y.length&&i.appendChild(y[m].cloneNode(!0))}else for(u=0;u<y.length;u++)i.appendChild(y[u].cloneNode(!0))}}}}"loading"===document.readyState?document.addEventListener("DOMContentLoaded",c):c()})();';
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
  const j = await readJson<{ message?: string; error?: string; hint?: string }>(res);
  if (typeof j?.message === "string" && j.message.length > 0) {
    msg = j.message;
  } else if (typeof j?.error === "string" && j.error.length > 0) {
    msg = j.error;
  } else if (typeof j?.hint === "string" && j.hint.length > 0) {
    msg = j.hint;
  }
  throw new Error(msg);
}

async function registerInlineScript(
  siteId: string,
  sourceCode: string,
  version: string
): Promise<{ id: string; version: string }> {
  const res = await towerFetch(`/api/v2/webflow/sites/${encodeURIComponent(siteId)}/registered_scripts/inline`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sourceCode,
      version,
      displayName: REGISTER_DISPLAY_NAME,
      canCopy: true,
    }),
  });
  await assertTowerOk(res, "Register inline script");
  const data = await readJson<{ id?: string; version?: string }>(res);
  if (typeof data?.id !== "string" || typeof data?.version !== "string") {
    throw new Error("Register inline script: unexpected response.");
  }
  return { id: data.id, version: data.version };
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

function withoutBeaconMarkedScripts(scripts: PageCustomScript[]): PageCustomScript[] {
  return scripts.filter(
    (s) => scriptAttrCI(s.attributes, BEACON_PAGE_SCRIPT_MARKER_ATTR) !== BEACON_PAGE_SCRIPT_MARKER_VALUE
  );
}

/**
 * Registers the beacon list-cloning runtime as Webflow **inline** custom code and applies it to the **current Designer
 * page** (footer). Requires Tower + Webflow OAuth with `custom_code:read` and `custom_code:write`. Re-publish the site
 * for changes to affect the live site.
 */
export async function syncBeaconPageInlineScript(): Promise<void> {
  if (!getTowerOrigin()) {
    throw new Error("Tower is not configured (VITE_TOWER_ORIGIN). Cannot sync page custom code.");
  }

  const sourceCode = getBeaconPageInlineScriptSource();
  if (sourceCode.length > 2000) {
    throw new Error("Beacon runtime exceeds Webflow inline script size limit.");
  }

  const siteId = (await webflow.getSiteInfo()).siteId;
  const pageId = (await webflow.getCurrentPage()).id as string;

  const registered = await registerInlineScript(siteId, sourceCode, inlineScriptVersion());
  const existing = await getPageCustomScripts(pageId);
  const merged: PageCustomScript[] = [
    ...withoutBeaconMarkedScripts(existing),
    {
      id: registered.id,
      location: "footer",
      version: registered.version,
      attributes: {
        [BEACON_PAGE_SCRIPT_MARKER_ATTR]: BEACON_PAGE_SCRIPT_MARKER_VALUE,
        [BEACON_PAGE_SCRIPT_HASH_ATTR]: hashBeaconRuntimeSource(sourceCode),
      },
    },
  ];

  await putPageCustomScripts(pageId, merged);
}

/**
 * Removes the Codalyn beacon **footer** custom code from the current page (Tower + Data API). No-op if Tower is
 * not configured or the page has no matching script.
 */
export async function removeBeaconPageRuntimeFromPage(): Promise<void> {
  if (!getTowerOrigin()) {
    return;
  }

  const pageId = (await webflow.getCurrentPage()).id as string;
  const existing = await getPageCustomScripts(pageId);
  const next = withoutBeaconMarkedScripts(existing);
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

/**
 * `true` when the current page’s footer includes the Codalyn beacon runtime and its hash matches the extension build.
 * Composer only lists beacons when this is satisfied so live/preview match the expected cloning script.
 */
export async function getBeaconPageRuntimeSyncStatus(): Promise<{ synced: boolean; reason?: string }> {
  if (!getTowerOrigin()) {
    return { synced: false, reason: "Tower is not configured." };
  }

  const expectedHash = hashBeaconRuntimeSource(getBeaconPageInlineScriptSource());

  try {
    const pageId = (await webflow.getCurrentPage()).id as string;
    const existing = await getPageCustomScripts(pageId);
    const beacon = existing.find(
      (s) =>
        scriptLocation(s) === "footer" &&
        scriptAttrCI(s.attributes, BEACON_PAGE_SCRIPT_MARKER_ATTR) === BEACON_PAGE_SCRIPT_MARKER_VALUE
    );
    if (beacon == null) {
      return {
        synced: false,
        reason: "No beacon script in footer — sync from Engine.",
      };
    }
    const applied = scriptAttrCI(beacon.attributes, BEACON_PAGE_SCRIPT_HASH_ATTR);
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
