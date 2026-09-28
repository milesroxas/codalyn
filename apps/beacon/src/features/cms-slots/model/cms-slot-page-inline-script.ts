import SparkMD5 from "spark-md5";
import {
  beaconPropDebugRuntimeSource,
  beaconPropDebugStubSource,
} from "@/features/cms-slots/model/cms-slot-beacon-debug";
import {
  beaconPropApplyValueRuntimeSource,
  beaconPropEmptyRuntimeSource,
  beaconPropPickRuntimeSource,
  beaconPropVisibilityRuntimeSource,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import {
  CMS_SLOT_LIST_TARGET_CANVAS_LABEL_ATTR,
  cmsSlotListTargetDesignerPlaceholderRuntimeRemovalSource,
} from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";
import {
  CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME,
  cmsSlotListTargetRuntimeLayoutRevealSource,
  ensureCmsSlotListTargetLayoutStyle,
} from "@/features/cms-slots/model/cms-slot-list-target-slot-style";
import { extensionFetch, grantWebflowAssetUpload, isWebflowAssetUploadUrlShape } from "@/shared/lib/extension-egress";
import { readStringLikeValue } from "@/shared/lib/read-string-like-value";
import { getTowerOrigin, towerFetchWithRetry } from "@/shared/lib/tower-client";
import { isWebflowHostedAssetUrl, readWebflowHostedAssetUrl } from "@/shared/lib/webflow-hosted-asset-url";

/**
 * Legacy page-entry markers. Builds before 2026-09-26 applied the runtime with two `data-*` `attributes`, which Webflow
 * rendered onto the published `<script>` tag after `crossorigin="anonymous"` — the one shape difference between our
 * tag and Webflow's own pinned scripts on the page, and the last app-side variable behind App Review Preflight's
 * "Script integrity is missing or wrong" item (compliance record R8.16–R8.23). The applied entry now carries only
 * `{ id, location, version }`; the runtime identifies itself through its registered-script id and the `+beacon.<hash>`
 * build tag inside its registered version. These constants remain solely to recognize entries applied by older builds
 * so a sync can migrate them in place (a PUT with no attributes — no new asset, no new registration).
 */
const CMS_SLOT_PAGE_SCRIPT_LEGACY_MARKER_ATTR = "data-codalyn-beacon";
const CMS_SLOT_PAGE_SCRIPT_LEGACY_MARKER_VALUE = "runtime";
const CMS_SLOT_PAGE_SCRIPT_LEGACY_HASH_ATTR = "data-codalyn-beacon-src-hash";

/**
 * Revision counter embedded in the runtime's header comment. Bump it whenever the format of the sibling source map
 * changes without the runtime text changing: the map is content-addressed by the runtime source hash and reused
 * across syncs (see {@link buildCmsSlotRuntimeSourceMap}), so a format change must move the hash. History:
 * revisions 2–3 were chosen so the SHA-256 SRI of the source alone contained no `/` or `+`, a hypothesis for App
 * Review Preflight's "Script integrity is missing or wrong" that R7b.19 ruled out. The served bytes now end with
 * the map pointer (a per-site asset URL), so the pin is fixed at sync time, not build time, and that constraint is
 * retired. Deterministic, so the FNV drift marker stays stable.
 */
export const CMS_SLOT_RUNTIME_REVISION = 4;

/** 32-bit FNV-1a → 8 hex chars (stable across browsers for the same source string). */
function hashCmsSlotRuntimeSource(source: string): string {
  let h = 2166136261;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const REGISTER_DISPLAY_NAME = "CodalynBeaconRuntime";

/** Uploaded JS files for the hosted beacon runtime (`registerHostedRuntimeScript`). */
const CMS_SLOT_RUNTIME_ASSET_FILE_PREFIX = "codalyn-beacon-runtime-";

const LOG_PREFIX = "[codalyn-beacon-runtime-cleanup]";

/**
 * Fail-open deadline for the published runtime. A list target is hidden (`visibility:hidden`) the moment the runtime
 * claims it, and is normally revealed at the end of the `reapply` chain (~100ms). If anything in between throws or
 * never completes, the customer's live page would show an empty hole to real visitors forever — the worst failure
 * this app can produce. Every claimed target therefore arms an unconditional reveal at this deadline: content that
 * is visible but unstyled always beats content that is invisible. `bListTargetReveal` is idempotent, so the safety
 * reveal firing after a successful reveal is a no-op.
 */
export const CMS_SLOT_RUNTIME_SAFETY_REVEAL_MS = 3000;

/** Indents every non-empty line of a runtime fragment so composed pieces sit at the nesting depth of their seam. */
function indentRuntimeBlock(source: string, spaces = 2): string {
  const pad = " ".repeat(spaces);
  return source.replace(/\n$/, "").replace(/^(?=.)/gm, pad);
}

/**
 * The Beacon published-site runtime, uploaded verbatim as a Webflow Asset and applied to pages through the Custom
 * Code API. It is **served exactly as authored here — readable, unminified, no build transform** — so the file a
 * reviewer or site owner downloads from the CDN is its own source: there is no separate source map to publish, and
 * the private bundle source maps carry these same modules. Formatting is Biome's (120 columns); the fragments
 * interpolated below are formatted the same way and indented to their seam. The runtime loads no other scripts,
 * sends no network requests, and touches no storage (pinned by cms-slot-page-inline-script.test.ts).
 */
export function getCmsSlotPageInlineScriptSource(): string {
  // Stable build identifier embedded in the runtime so the debug HUD can report which synced build is live.
  // Must stay deterministic (no timestamps) — the source hash is what drift detection compares against.
  const buildVersion = String(__APP_VERSION__ ?? "0.0.1");
  // The styled debug HUD (and its document-level hotkey) ships only on the development channel;
  // production AND preview get no-op stubs so no app-level keyboard shortcut or debug UI can ever
  // reach a customer's live site (Marketplace guidelines: no keyboard shortcuts to invoke app
  // functionality; reviewed runtime must match the shipped one). The source still embeds the
  // channel + version so a synced runtime is self-identifying via its hash.
  const debugSource =
    String(__BUILD_CHANNEL__) === "development" ? beaconPropDebugRuntimeSource() : beaconPropDebugStubSource();
  return `/*
 * Codalyn Beacon - published-site list runtime v${buildVersion}.
 * Runtime revision ${CMS_SLOT_RUNTIME_REVISION}.
 * Served exactly as authored (unminified, no build step), so this file is its own readable source.
 * Its last line points at an identity source map published beside it in this site's assets
 * (codalyn-beacon-runtime-<hash>.map.json; sourcesContent is this file minus that last line).
 * Authored in apps/beacon/src/features/cms-slots/model/cms-slot-page-inline-script.ts and the
 * cms-slot-beacon-*.ts / cms-slot-list-target-*.ts modules it composes. Loads no other scripts,
 * sends no network requests, and is pure ASCII (served without a charset).
 */
(function () {
  var __bRtSrc = (typeof document !== "undefined" && document.currentScript && document.currentScript.src) || "";
  function listKey(el) {
    var t = String(el.getAttribute("data-list") || "").toLowerCase();
    return t && t.indexOf("beacon-") === 0 ? t : null;
  }
  function isSource(el) {
    return (
      String(el.getAttribute("data-target") || "").toLowerCase() === "beacons" &&
      String(el.getAttribute("data-beacon-target") || "").toLowerCase() !== "list" &&
      listKey(el) != null
    );
  }
${indentRuntimeBlock(debugSource)}
${indentRuntimeBlock(beaconPropApplyValueRuntimeSource())}
  function bBeaconNormHeadingTag(v) {
    v = String(v == null ? "" : v)
      .trim()
      .toLowerCase();
    var m = v.match(/^h([1-6])$/);
    if (m) return "H" + m[1];
    if (/^[1-6]$/.test(v)) return "H" + v;
    return "";
  }
  function bBeaconResolveHeadingTagEl(el, v) {
    var want = bBeaconNormHeadingTag(v);
    if (!want) return el;
    var cur = String(el.tagName || "").toUpperCase();
    var head = /^H[1-6]$/.test(cur),
      wrap = cur === "DIV" || cur === "SPAN";
    if (!head && !wrap) return el;
    if (head && cur === want) return el;
    var doc = el.ownerDocument,
      nw = doc.createElement(want),
      a,
      i;
    while (el.firstChild) nw.appendChild(el.firstChild);
    for (i = el.attributes.length - 1; i >= 0; i--) {
      a = el.attributes[i];
      nw.setAttribute(a.name, a.value);
    }
    if (el.parentNode) {
      el.parentNode.replaceChild(nw, el);
      return nw;
    }
    return el;
  }
${indentRuntimeBlock(beaconPropPickRuntimeSource())}
${indentRuntimeBlock(beaconPropEmptyRuntimeSource())}
${indentRuntimeBlock(beaconPropVisibilityRuntimeSource())}
  function bListTargetReveal(target) {
    target.classList.remove("${CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME}");
${indentRuntimeBlock(cmsSlotListTargetDesignerPlaceholderRuntimeRemovalSource(), 4)}
${indentRuntimeBlock(cmsSlotListTargetRuntimeLayoutRevealSource(), 4)}
    target.style.removeProperty("visibility");
    target.removeAttribute("aria-label");
    target.removeAttribute("${CMS_SLOT_LIST_TARGET_CANVAS_LABEL_ATTR}");
  }
  function applyProps(target, payload) {
    var vn = payload ? +payload.v : NaN;
    if (!payload || !isFinite(vn) || vn < 3) return;
    var pc = payload.p;
    if (!Array.isArray(pc)) return;
    var rows = target.children,
      i,
      j,
      k,
      row,
      props,
      nodes,
      cands,
      node,
      rawP,
      isCond,
      segs,
      si,
      seg,
      pv,
      anyV,
      totA = 0,
      totH = 0,
      nLen = rows.length < pc.length ? rows.length : pc.length;
    for (i = 0; i < nLen; i++) {
      row = rows[i];
      props = pc[i];
      if (!row || props === null || typeof props !== "object") {
        continue;
      }
      nodes = row.querySelectorAll("[data-cb-c]");
      cands = [];
      if (row.getAttribute && (row.getAttribute("data-cb-c") || "") !== "") cands.push(row);
      for (k = 0; k < nodes.length; k++) cands.push(nodes[k]);
      for (j = 0; j < cands.length; j++) {
        node = cands[j];
        rawP = node.getAttribute("data-cb-c") || "";
        if (!rawP) continue;
        isCond = node.getAttribute("data-cb-v") === "1";
        segs = String(rawP).split("|");
        anyV = false;
        for (si = 0; si < segs.length; si++) {
          seg = segs[si].trim();
          if (!seg) continue;
          pv = pickP(props, seg);
          if (bPropEmpty(pv)) continue;
          anyV = true;
          if (bBeaconNormHeadingTag(String(pv))) {
            node = bBeaconResolveHeadingTagEl(node, String(pv));
            continue;
          }
          if (bLooksLikeImageUrl(String(pv))) bLog("apply image", seg, String(pv).slice(0, 80));
          applyValue(node, String(pv));
        }
        if (anyV) {
          bPropReveal(node, row);
          totA++;
          continue;
        }
        if (isCond) {
          bPropClearPublishPlaceholder(node);
          bPropConceal(node, row);
          bLog("conceal empty conditional", rawP);
          totH++;
        }
      }
    }
    bLog("applyProps", { rows: nLen, applied: totA, concealed: totH });
    bDbgBump("applied", totA);
    bDbgBump("concealed", totH);
  }
  function bSafeReveal(target) {
    if (!target) return;
    try {
      bListTargetReveal(target);
    } catch (e) {
      try {
        target.style.removeProperty("visibility");
      } catch (e2) {}
    }
  }
  function bArmSafetyReveal(target) {
    try {
      setTimeout(function () {
        bSafeReveal(target);
      }, ${CMS_SLOT_RUNTIME_SAFETY_REVEAL_MS});
    } catch (e) {
      bSafeReveal(target);
    }
  }
  function bRevealAllTargets() {
    try {
      var els = document.querySelectorAll("[data-beacon-target][data-list]"),
        i;
      for (i = 0; i < els.length; i++) bSafeReveal(els[i]);
    } catch (e) {}
  }
  function bTryApplyProps(target, payload) {
    try {
      applyProps(target, payload);
    } catch (e) {
      bLog("applyProps failed", e);
    }
  }
  function reapply(target, payload, done) {
    bTryApplyProps(target, payload);
    setTimeout(function () {
      bTryApplyProps(target, payload);
      setTimeout(function () {
        bTryApplyProps(target, payload);
        if (typeof done === "function") done(target);
      }, 100);
    }, 0);
  }
  function bRunTarget(target, sourcesByList, sources, srcKeys) {
    var targetKey = listKey(target),
      i,
      source;
    if (!targetKey || String(target.getAttribute("data-beacon-target") || "").toLowerCase() !== "list") {
      bLog("skip target: not a list target", {
        key: targetKey,
        role: String(target.getAttribute("data-beacon-target") || ""),
      });
      return;
    }
    if (target.getAttribute("data-cb-rendered") === "1") {
      bLog("skip target: already rendered", { key: targetKey });
      return;
    }
    var sourceNode = sourcesByList[targetKey];
    if (!sourceNode) {
      for (i = 0; i < sources.length; i++) {
        source = sources[i];
        if (isSource(source) && listKey(source) === targetKey) {
          sourceNode = source;
          break;
        }
      }
    }
    if (!sourceNode) {
      bLog("skip target: no source list found", { key: targetKey, available: srcKeys });
      return;
    }
    bDbgBump("targets", 1);
    target.style.visibility = "hidden";
    bArmSafetyReveal(target);
    var raw = String(target.textContent || "").trim();
    target.textContent = "";
    var payload = null,
      ok = false,
      indices = null;
    try {
      payload = JSON.parse(raw);
      var vv = +payload.v;
      ok = !!(payload && vv === 3 && Array.isArray(payload.i));
      if (ok) {
        indices = payload.i;
      }
    } catch (e) {
      ok = false;
    }
    var children = sourceNode.children,
      cloned = 0;
    if (ok) {
      for (var u = 0; u < indices.length; u++) {
        var idx = +indices[u];
        if (idx === idx && idx >= 0 && idx % 1 === 0 && idx < children.length) {
          target.appendChild(children[idx].cloneNode(true));
          cloned++;
        }
      }
    }
    target.setAttribute("data-cb-rendered", "1");
    bDbgBump("cloned", cloned);
    bLog("clone list", {
      list: targetKey,
      cloned: cloned,
      parsed: ok,
      sourceChildren: children.length,
      indices: ok && indices ? indices.length : null,
      rawLen: raw.length,
    });
    if (ok && payload && Array.isArray(payload.p)) reapply(target, payload, bSafeReveal);
    else {
      bSafeReveal(target);
    }
  }
  function run() {
    try {
      var sourcesByList = {},
        sources = document.querySelectorAll("[data-target=beacons][data-list]");
      for (var i = 0; i < sources.length; i++) {
        var source = sources[i];
        if (isSource(source)) {
          var key = listKey(source);
          if (key) sourcesByList[key] = source;
        }
      }
      var lk = 0,
        srcKeys = [];
      for (var sk in sourcesByList)
        if (Object.prototype.hasOwnProperty.call(sourcesByList, sk)) {
          lk++;
          srcKeys.push(sk);
        }
      bDbgBump("lists", lk);
      var targets = document.querySelectorAll("[data-beacon-target][data-list]");
      bLog("runtime start", { sourceEls: sources.length, sourceLists: srcKeys, targetEls: targets.length });
      // One bad target must never strand the rest of the page: each is isolated and revealed on failure.
      for (var t = 0; t < targets.length; t++) {
        var target = targets[t];
        try {
          bRunTarget(target, sourcesByList, sources, srcKeys);
        } catch (e) {
          bLog("target failed", e);
          bSafeReveal(target);
        }
      }
    } catch (e) {
      bLog("runtime failed", e);
      bRevealAllTargets();
    }
  }
  bDbgBindKeys();
  bDbgRuntimeInfo(${JSON.stringify(buildVersion)}, __bRtSrc);
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", run);
  else run();
})();
`;
}

function inlineScriptVersionBase(): string {
  const base = String(__APP_VERSION__ ?? "0.0.1")
    .split("+")[0]
    .replace(/[^0-9.]/g, "")
    .replace(/^\.+|\.+$/g, "");
  return base.length > 0 ? base : "0.0.1";
}

/**
 * Registered-script version for a runtime build: `<app semver>+beacon.<source hash>[.<n>]`. Webflow requires a unique
 * `displayName` + `version` per registration and never lets one be overwritten, so the version is derived from the
 * runtime *content* (the same FNV-1a hash the page marker carries) — a reviewer or operator can read which source a
 * registration holds — and only gains a numeric suffix when that exact content is registered again on the same site
 * (an explicit forced re-sync). Pure; exported for tests.
 */
export function cmsSlotRuntimeScriptVersion(input: {
  base: string;
  sourceHash: string;
  takenVersions: ReadonlySet<string>;
}): string {
  const candidate = `${input.base}+beacon.${input.sourceHash}`;
  if (!input.takenVersions.has(candidate)) {
    return candidate;
  }
  for (let n = 2; n < 10_000; n++) {
    const suffixed = `${candidate}.${n}`;
    if (!input.takenVersions.has(suffixed)) {
      return suffixed;
    }
  }
  // Pathological: thousands of identical registrations on one site. Fall back to a unique build tag.
  return `${candidate}.${Date.now()}`;
}

/**
 * The 8-hex runtime source hash a registered-script version carries (`<semver>+beacon.<hash>[.<n>]`, the inverse of
 * {@link cmsSlotRuntimeScriptVersion}), else null. Accepts the primitive and the wrapped `{ value }` shape; anything
 * that is not exactly that build tag (no tag, wrong length, non-hex) is null, never a partial read.
 */
export function readBeaconRuntimeHashFromVersion(raw: unknown): string | null {
  const version = readStringLikeValue(raw);
  if (version == null) {
    return null;
  }
  const m = /\+beacon\.([0-9a-f]{8})(?:\.\d+)?$/.exec(version);
  return m ? m[1] : null;
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

type TowerErrorBody = {
  message?: string;
  error?: string;
  hint?: string;
  code?: string;
  details?: unknown;
};

/** Human-readable message for a failed Tower/Webflow response; exported for tests. */
export function describeTowerFailure(status: number, body: TowerErrorBody | null, action: string): string {
  let msg = `${action} failed (${status})`;
  if (typeof body?.message === "string" && body.message.length > 0) {
    msg = body.message;
  } else if (typeof body?.error === "string" && body.error.length > 0) {
    msg = body.error;
  } else if (typeof body?.hint === "string" && body.hint.length > 0) {
    msg = body.hint;
  }
  const context = `${msg} ${String(body?.code ?? "")} ${JSON.stringify(body?.details ?? "")}`.toLowerCase();
  const scopeMissing =
    context.includes("missing_scope") ||
    context.includes("missing scopes") ||
    context.includes("missing_scopes") ||
    context.includes("assets:write") ||
    context.includes("custom_code:write");
  if (scopeMissing) {
    return `${msg} Reconnect Webflow in Tower so the OAuth token includes assets:write and custom_code:write.`;
  }
  // 401 from the proxy = the stored Webflow token was revoked (Tower prunes it) or the Tower session is
  // gone; 403 = the connection lacks permission (scope/site access). Both need a human to reconnect,
  // not a retry — say so explicitly instead of surfacing a raw upstream error.
  if (status === 401) {
    return `${msg} Webflow no longer accepts this workspace's connection. Reconnect Webflow in Tower, then try again.`;
  }
  if (status === 403) {
    return `${msg} Your Webflow connection does not permit this action on this site. Reconnect Webflow in Tower with the required scopes, or ask a workspace admin.`;
  }
  return msg;
}

async function assertTowerOk(res: Response, action: string): Promise<void> {
  if (res.ok) {
    return;
  }
  throw new Error(describeTowerFailure(res.status, await readJson<TowerErrorBody>(res), action));
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

const RUNTIME_JS_BLOB_TYPE = "application/javascript; charset=utf-8";
const RUNTIME_SOURCE_MAP_BLOB_TYPE = "application/json; charset=utf-8";

/** File names of the runtime JS asset and its sibling source map for a runtime source hash. */
export function cmsSlotRuntimeAssetFileNames(runtimeHash: string): { js: string; map: string } {
  const base = `${CMS_SLOT_RUNTIME_ASSET_FILE_PREFIX}${runtimeHash}`;
  return { js: `${base}.js`, map: `${base}${CMS_SLOT_RUNTIME_SOURCE_MAP_SUFFIX}` };
}

/**
 * The runtime text as served minus its source-map trailer: no trailing newline, so the served file with its last
 * line removed equals this byte for byte (that is what the source map's `sourcesContent` carries).
 */
export function cmsSlotRuntimeSourceBody(sourceCode: string): string {
  return sourceCode.replace(/\n+$/, "");
}

/**
 * Source map v3 for the hosted runtime. The runtime is authored source served without a build step, so the map is
 * an identity map: one segment per line, generated line N column 0 → source line N column 0 of the same text, with
 * `sourcesContent` carrying that text verbatim. It exists so a reviewer's tooling (App Review Preflight's
 * published-runtime test, "Runtime is not traceable to source") can open the executed bytes as source — which they
 * are. Deterministic for a given source, so the map is content-addressed by the runtime hash like the JS.
 * @see https://tc39.es/ecma426/ (Source Map format, `mappings` VLQ)
 */
export function buildCmsSlotRuntimeSourceMap(sourceBody: string, fileNames: { js: string; map: string }): string {
  const lineCount = sourceBody.split("\n").length;
  // "AAAA" = [generated col 0, source 0, source line 0, source col 0]; every later line "AACA" = [0, 0, +1, 0].
  const mappings = Array.from({ length: lineCount }, (_, i) => (i === 0 ? "AAAA" : "AACA")).join(";");
  return JSON.stringify({
    version: 3,
    file: fileNames.js,
    sources: [fileNames.js],
    sourcesContent: [sourceBody],
    names: [],
    mappings,
  });
}

/**
 * The source-map pragma for the *published-site runtime* file, kept in two halves and joined only when a trailer
 * is written. A contiguous pragma literal in the extension bundle is read by source-map tooling as the bundle's own
 * map pointer: App Review Preflight ("Generated code is not traceable to readable source") took the minified
 * `` `//# source…URL=`;function `` as a map named `` `;function `` and reported it missing. Same split Vite and
 * webpack use in their own sources for the same reason. The release build forbids the joined token in dist and zip.
 */
const SOURCE_MAP_PRAGMA_HALVES: readonly string[] = ["//# source", "MappingURL="];

function sourceMapTrailerLine(mapUrl: string): string {
  return SOURCE_MAP_PRAGMA_HALVES.concat(mapUrl).join("");
}

/**
 * Appends the source-map pointer as the runtime's last line. Nothing follows it — no trailing newline — so the served
 * bytes end with the map URL and a consumer that trims the body before hashing still reproduces the registered SRI.
 * Refuses a URL that is not a Webflow-hosted asset URL or that could break out of the comment line.
 */
export function withCmsSlotRuntimeSourceMapTrailer(sourceCode: string, mapUrl: string): string {
  if (!isWebflowHostedAssetUrl(mapUrl)) {
    throw new Error("Runtime source map URL is not a Webflow-hosted asset URL.");
  }
  return `${cmsSlotRuntimeSourceBody(sourceCode)}\n${sourceMapTrailerLine(mapUrl)}`;
}

function sourceMd5Hex(sourceCode: string): string {
  const bytes = sourceToBytes(sourceCode);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return SparkMD5.ArrayBuffer.hash(copy.buffer);
}

/**
 * SRI pin for the hosted runtime, over the exact bytes uploaded as the asset. SHA-256 is the algorithm Webflow
 * specifies for a hosted script's `integrityHash`, and the one App Review Preflight's published-runtime test
 * derives its pin from and expects to find in the page's `integrity` attribute.
 * @see https://developers.webflow.com/data/reference/custom-code/custom-code/register-hosted
 */
async function sourceSRIHash(sourceCode: string): Promise<string> {
  const bytes = sourceToBytes(sourceCode);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return `sha256-${arrayBufferToBase64(new Uint8Array(digest))}`;
}

type CreatedWebflowAsset = {
  uploadDetails?: Record<string, string>;
  uploadUrl?: string;
  hostedUrl?: string;
  assetUrl?: string;
};

async function createRuntimeAsset(siteId: string, fileName: string, sourceCode: string): Promise<CreatedWebflowAsset> {
  const res = await towerFetchWithRetry(`/api/v2/webflow/sites/${encodeURIComponent(siteId)}/assets`, {
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
  // Boundary: the exact `uploadUrl` Webflow returned becomes the one permitted upload destination for
  // the request that follows (egress policy grant; refused here, before any upload, if it is not the
  // documented S3 host + bucket). Nothing else the install flow computes can widen where bytes go.
  grantWebflowAssetUpload(data.uploadUrl);
  return data;
}

async function uploadRuntimeAsset(
  uploadUrl: string,
  uploadDetails: Record<string, string>,
  content: string,
  fileName: string,
  blobType: string
): Promise<void> {
  // The presigned upload is the one install-flow request that does not go through Tower's proxy.
  // `extensionFetch` enforces the grant (exact URL from the create-asset response, single use); this
  // early shape check keeps the install-flow error message specific and guarantees no FormData is
  // built for a destination outside the documented Webflow host + bucket.
  if (!isWebflowAssetUploadUrlShape(uploadUrl)) {
    throw new Error("Upload runtime asset: upload URL is not the documented Webflow upload endpoint.");
  }
  const form = new FormData();
  for (const [k, v] of Object.entries(uploadDetails)) {
    form.append(k, String(v));
  }
  form.append("file", new Blob([content], { type: blobType }), fileName);
  const res = await extensionFetch(uploadUrl, { method: "POST", body: form });
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
  // Boundary: the registered location is what every visitor's browser will load. Only a Webflow-hosted
  // HTTPS asset URL (no credentials, no non-default port) may be registered, whatever produced it.
  if (!isWebflowHostedAssetUrl(hostedLocation)) {
    throw new Error("Register hosted script: hosted location is not a Webflow-hosted HTTPS asset URL.");
  }
  const res = await towerFetchWithRetry(
    `/api/v2/webflow/sites/${encodeURIComponent(siteId)}/registered_scripts/hosted`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        hostedLocation,
        integrityHash,
        version,
        displayName,
        canCopy: true,
      }),
    }
  );
  await assertTowerOk(res, "Register hosted script");
  const data = await readJson<{ id?: string; version?: string }>(res);
  if (typeof data?.id !== "string" || typeof data?.version !== "string") {
    throw new Error("Register hosted script: unexpected response.");
  }
  return { id: data.id, version: data.version };
}

/** Create-asset (Tower proxy) + presigned upload (granted exact URL) for one site asset; returns its hosted URL. */
async function createAndUploadSiteAsset(
  siteId: string,
  fileName: string,
  content: string,
  blobType: string
): Promise<string> {
  const asset = await createRuntimeAsset(siteId, fileName, content);
  const uploadUrl = typeof asset.uploadUrl === "string" ? asset.uploadUrl : "";
  const uploadDetails = asset.uploadDetails;
  if (uploadUrl.length === 0 || uploadDetails == null) {
    throw new Error("Create runtime asset: missing upload payload.");
  }
  await uploadRuntimeAsset(uploadUrl, uploadDetails, content, fileName, blobType);
  // Boundary: the hosted location Webflow reports (`hostedUrl`, or the reference's `assetUrl` name) must be
  // an HTTPS URL on a Webflow asset origin with no credentials and no non-default port before anything is
  // registered from it or written into the runtime's source-map trailer (review round 9). A malformed value
  // fails the sync here rather than being registered as is.
  const hostedLocation = readWebflowHostedAssetUrl(asset.hostedUrl ?? asset.assetUrl);
  if (hostedLocation == null) {
    throw new Error("Create runtime asset: hosted URL is not a Webflow-hosted HTTPS asset URL.");
  }
  return hostedLocation;
}

/**
 * The site's existing source map for this runtime hash, if one is already uploaded. The map is content-addressed
 * (same hash ⇒ same bytes), so reusing it keeps a forced re-sync from minting a duplicate asset and keeps the
 * served JS — whose last line carries this URL — byte-identical across re-syncs of the same build. Best-effort: a
 * failed listing means a fresh upload, never a blocked sync.
 */
async function findExistingRuntimeSourceMap(siteId: string, mapFileName: string): Promise<string | null> {
  try {
    const assets = await listBeaconRuntimeAssets(siteId);
    const hit = assets.find(
      (asset) => asset.originalFileName === mapFileName && isWebflowHostedAssetUrl(asset.hostedUrl)
    );
    return hit ? hit.hostedUrl : null;
  } catch (e) {
    console.warn(LOG_PREFIX, "list runtime source maps failed (non-fatal); uploading a fresh map", e);
    return null;
  }
}

/**
 * Hosted URL of the runtime's source map, reused or uploaded. Best-effort: the runtime works without a map, so a
 * failed map upload (e.g. Webflow refusing the file type) logs and yields null — the JS is then served without a
 * trailer, and `scripts/webflow-runtime-pin.mjs` reports the missing pointer instead of the install failing.
 */
async function ensureRuntimeSourceMapAsset(
  siteId: string,
  fileNames: { js: string; map: string },
  sourceBody: string
): Promise<string | null> {
  try {
    const existing = await findExistingRuntimeSourceMap(siteId, fileNames.map);
    if (existing != null) {
      return existing;
    }
    const map = buildCmsSlotRuntimeSourceMap(sourceBody, fileNames);
    return await createAndUploadSiteAsset(siteId, fileNames.map, map, RUNTIME_SOURCE_MAP_BLOB_TYPE);
  } catch (e) {
    console.warn(LOG_PREFIX, "runtime source map upload failed (non-fatal); runtime ships without a map pointer", e);
    return null;
  }
}

/**
 * Uploads the runtime's source map, then the runtime JS whose last line points at it, and registers the JS as a
 * hosted script with the SHA-256 SRI of exactly the uploaded bytes.
 */
async function registerHostedRuntimeScript(
  siteId: string,
  sourceCode: string,
  version: string
): Promise<{ id: string; version: string; hostedLocation: string; sourceMapLocation: string | null }> {
  const runtimeHash = hashCmsSlotRuntimeSource(sourceCode);
  const fileNames = cmsSlotRuntimeAssetFileNames(runtimeHash);
  const sourceBody = cmsSlotRuntimeSourceBody(sourceCode);
  const sourceMapLocation = await ensureRuntimeSourceMapAsset(siteId, fileNames, sourceBody);
  const servedSource =
    sourceMapLocation == null ? sourceBody : withCmsSlotRuntimeSourceMapTrailer(sourceBody, sourceMapLocation);
  const hostedLocation = await createAndUploadSiteAsset(siteId, fileNames.js, servedSource, RUNTIME_JS_BLOB_TYPE);
  const registered = await registerHostedScript(
    siteId,
    hostedLocation,
    await sourceSRIHash(servedSource),
    version,
    REGISTER_DISPLAY_NAME
  );
  return { ...registered, hostedLocation, sourceMapLocation };
}

async function getPageCustomScripts(pageId: string): Promise<PageCustomScript[]> {
  const res = await towerFetchWithRetry(`/api/v2/webflow/pages/${encodeURIComponent(pageId)}/custom_code`);
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
    const res = await towerFetchWithRetry(`/api/v2/webflow/pages/${encodeURIComponent(pageId)}/custom_code`, {
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

const NO_REGISTERED_BEACON_SCRIPT_IDS: ReadonlySet<string> = new Set<string>();

function hasLegacyBeaconMarker(s: PageCustomScript): boolean {
  return (
    scriptAttrCI(s.attributes, CMS_SLOT_PAGE_SCRIPT_LEGACY_MARKER_ATTR) === CMS_SLOT_PAGE_SCRIPT_LEGACY_MARKER_VALUE
  );
}

/** True when a page entry carries any `attributes` at all — the applied runtime must carry none (see the legacy note). */
function hasAnyAttributes(s: PageCustomScript): boolean {
  const attrs = s.attributes;
  return attrs != null && typeof attrs === "object" && Object.keys(attrs).length > 0;
}

/**
 * True when a page custom-code entry is one of ours — by registered-script id (stable identifier, preferred), by the
 * `+beacon.<hash>` build tag in its registered version, or by the legacy marker attribute older builds applied.
 */
function isBeaconRuntimeScript(s: PageCustomScript, registeredBeaconScriptIds: ReadonlySet<string>): boolean {
  return (
    registeredBeaconScriptIds.has(s.id) ||
    readBeaconRuntimeHashFromVersion(s.version) != null ||
    hasLegacyBeaconMarker(s)
  );
}

/**
 * The runtime build an applied page entry points at, as an 8-hex source hash: the site registry's record for the entry's
 * id (its `hostedLocation` file name — ground truth for what the id serves), then the `+beacon.<hash>` tag in the entry's
 * version, then the legacy `data-codalyn-beacon-src-hash` attribute. Null when none is readable.
 */
function readAppliedBeaconRuntimeHash(
  s: PageCustomScript,
  registeredBeaconRuntimeHashesById: ReadonlyMap<string, string> | undefined
): string | null {
  return (
    registeredBeaconRuntimeHashesById?.get(s.id) ??
    readBeaconRuntimeHashFromVersion(s.version) ??
    readStringLikeValue(scriptAttrCI(s.attributes, CMS_SLOT_PAGE_SCRIPT_LEGACY_HASH_ATTR))
  );
}

/**
 * Removes every beacon runtime script from a page's custom code — by registered `CodalynBeaconRuntime` id, by the
 * `+beacon.<hash>` version tag **and** by the legacy marker attribute. The id cross-reference catches stale runtimes
 * applied before either scheme, which otherwise survive every sync and run alongside the new runtime, stomping each
 * other's DOM mutations on the published page.
 */
export function withoutAnyBeaconRuntimeScripts(
  scripts: PageCustomScript[],
  registeredBeaconScriptIds: ReadonlySet<string>
): PageCustomScript[] {
  return scripts.filter((s) => !isBeaconRuntimeScript(s, registeredBeaconScriptIds));
}

/**
 * The same page list with every beacon runtime entry reduced to `{ id, location: "footer", version }` and every other
 * script untouched, in place. This is the `reapply` migration for pages synced by builds that still wrote the legacy
 * `data-*` attributes: one PUT, no upload, no registration, so the hosted URL, bytes and SRI pin stay exactly as they
 * are. Pure and exported for tests.
 */
export function withoutBeaconRuntimeAttributes(
  scripts: PageCustomScript[],
  registeredBeaconScriptIds: ReadonlySet<string>
): PageCustomScript[] {
  return scripts.map((s) =>
    isBeaconRuntimeScript(s, registeredBeaconScriptIds) ? { id: s.id, location: "footer", version: s.version } : s
  );
}

/**
 * Page custom-code list after applying the beacon runtime: drop every prior beacon runtime script, then append exactly
 * one fresh footer entry. Pure and exported so the **exactly-one-runtime invariant** is unit-testable — its violation
 * (two runtimes co-existing on a published page) was the root cause of the CMS-slot render bug, where the stale and
 * current runtimes stomped each other's DOM mutations.
 */
export function mergePageScriptsWithBeaconRuntime(
  existing: PageCustomScript[],
  beaconScript: PageCustomScript,
  registeredBeaconScriptIds: ReadonlySet<string>
): PageCustomScript[] {
  return [...withoutAnyBeaconRuntimeScripts(existing, registeredBeaconScriptIds), beaconScript];
}

export type CmsSlotRuntimeSyncDecision = { action: "skip" | "register" | "reapply"; reason: string };

/**
 * Decides whether a sync must upload + register a new hosted script, can no-op, or only needs to re-PUT the page's
 * custom code (`reapply`: the applied runtime is this build but its entry still carries the legacy `data-*` attributes).
 *
 * Webflow's Data API exposes **no delete for a registration record**, so every `registered_scripts/hosted` POST is a
 * permanent entry against the customer's site budget. Sync fires on composer save, slot rename, slot delete and
 * install — many times per editing session — and previously registered a brand-new script every time (the version is
 * `…+beacon.${Date.now()}`, so no two calls dedupe server-side). The applied entry's registered version carries the
 * runtime's source hash (`+beacon.<hash>`), and the site registry maps its id to the hosted file name that carries the
 * same hash, so an unchanged build is detectable from the two GETs the sync already makes.
 *
 * Pure and exported so the skip condition is unit-testable without the Data API. Every ambiguous or malformed input
 * fails **toward** registering: a redundant registration is waste, but a wrongly-skipped one ships a page whose
 * footer points at a stale or missing runtime, which breaks the customer's live site.
 */
export function decideCmsSlotRuntimeSyncAction(input: {
  existing: readonly PageCustomScript[] | null | undefined;
  expectedHash: string;
  registeredBeaconScriptIds: ReadonlySet<string>;
  /** Registered-script id → the runtime source hash its hosted file carries (from the site registry); optional. */
  registeredBeaconRuntimeHashesById?: ReadonlyMap<string, string>;
  force?: boolean;
}): CmsSlotRuntimeSyncDecision {
  if (input.force === true) {
    return { action: "register", reason: "Forced re-sync." };
  }
  const expectedHash = readStringLikeValue(input.expectedHash);
  if (expectedHash == null) {
    return { action: "register", reason: "No expected runtime source hash." };
  }
  const applied = (Array.isArray(input.existing) ? input.existing : []).filter(
    (s): s is PageCustomScript =>
      s != null && typeof s === "object" && isBeaconRuntimeScript(s, input.registeredBeaconScriptIds)
  );
  if (applied.length === 0) {
    return { action: "register", reason: "No beacon runtime applied to this page." };
  }
  // Stale duplicates must be collapsed back to the exactly-one-runtime invariant, which only the register+PUT path
  // does. Rare and self-healing after a single sync.
  if (applied.length > 1) {
    return { action: "register", reason: "More than one beacon runtime applied to this page." };
  }
  const current = applied[0];
  if (scriptLocation(current) !== "footer") {
    return { action: "register", reason: "Applied beacon runtime is not in the page footer." };
  }
  const appliedHash = readAppliedBeaconRuntimeHash(current, input.registeredBeaconRuntimeHashesById);
  if (appliedHash == null) {
    return { action: "register", reason: "Applied beacon runtime has no source hash." };
  }
  if (appliedHash !== expectedHash) {
    return { action: "register", reason: "Applied beacon runtime is a different build." };
  }
  if (hasAnyAttributes(current)) {
    return { action: "reapply", reason: "Applied beacon runtime still carries legacy marker attributes." };
  }
  return { action: "skip", reason: "Applied beacon runtime already matches this build." };
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
  version?: string;
  hostedLocation?: string;
};

/** Sibling source map of a runtime JS asset: `codalyn-beacon-runtime-<hash>.map.json` ({@link buildCmsSlotRuntimeSourceMap}). */
const CMS_SLOT_RUNTIME_SOURCE_MAP_SUFFIX = ".map.json";

function hasBeaconRuntimeAssetExtension(fileName: string): boolean {
  return fileName.endsWith(".js") || fileName.endsWith(CMS_SLOT_RUNTIME_SOURCE_MAP_SUFFIX);
}

/** Runtime JS assets and their sibling source maps — everything the purge and uninstall paths may delete. */
export function isBeaconRuntimeAssetFileName(fileName: string): boolean {
  return fileName.startsWith(CMS_SLOT_RUNTIME_ASSET_FILE_PREFIX) && hasBeaconRuntimeAssetExtension(fileName);
}

export function isBeaconRuntimeSourceMapFileName(fileName: string): boolean {
  return isBeaconRuntimeAssetFileName(fileName) && fileName.endsWith(CMS_SLOT_RUNTIME_SOURCE_MAP_SUFFIX);
}

/** The 8-hex runtime source hash carried by a runtime JS / source-map file name or hosted URL, else null. */
export function readBeaconRuntimeHashFromName(value: string): string | null {
  const m = /codalyn-beacon-runtime-([0-9a-f]{8})\.(?:js|map\.json)(?:[?#]|$)/.exec(value);
  return m ? m[1] : null;
}

function readBeaconRuntimeFileNameFromAssetRow(raw: Record<string, unknown>): string | null {
  for (const key of ["originalFileName", "fileName", "file_name", "displayName"] as const) {
    const value = readStringLikeValue(raw[key]);
    if (value == null) {
      continue;
    }
    if (isBeaconRuntimeAssetFileName(value)) {
      return value;
    }
    const prefixIndex = value.indexOf(CMS_SLOT_RUNTIME_ASSET_FILE_PREFIX);
    if (prefixIndex >= 0 && hasBeaconRuntimeAssetExtension(value)) {
      return value.slice(prefixIndex);
    }
  }
  return null;
}

/** Normalizes Webflow list-asset rows before beacon runtime cleanup compares URLs and filenames. */
export function normalizeBeaconRuntimeAssetRow(raw: unknown): SiteAssetRow | null {
  if (raw == null || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = readStringLikeValue(record.id);
  const hostedUrl =
    readStringLikeValue(record.hostedUrl) ?? readStringLikeValue(record.url) ?? readStringLikeValue(record.assetUrl);
  const originalFileName = readBeaconRuntimeFileNameFromAssetRow(record);
  if (id == null || hostedUrl == null || originalFileName == null) {
    return null;
  }
  return { id, hostedUrl, originalFileName };
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
  // A source map is referenced from inside its runtime JS (the trailer line), not from custom code, so it is live
  // exactly when a runtime JS with the same source hash is applied — the map is content-addressed by that hash.
  const appliedHashes = new Set(
    [...applied].map(readBeaconRuntimeHashFromName).filter((hash): hash is string => hash != null)
  );
  return options.assets
    .filter((asset) => isBeaconRuntimeAssetFileName(asset.originalFileName))
    .filter((asset) => !applied.has(normalizeHostedAssetUrl(asset.hostedUrl)))
    .filter((asset) => {
      if (!isBeaconRuntimeSourceMapFileName(asset.originalFileName)) {
        return true;
      }
      const hash = readBeaconRuntimeHashFromName(asset.originalFileName);
      return hash == null || !appliedHashes.has(hash);
    })
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
    const res = await towerFetchWithRetry(`${pathBase}${sep}limit=${limit}&offset=${offset}`, {
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
  const res = await towerFetchWithRetry(`/api/v2/webflow/sites/${encodeURIComponent(siteId)}/custom_code`, {
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
  const assets = await fetchAllPaginated<Record<string, unknown>>(
    `/api/v2/webflow/sites/${encodeURIComponent(siteId)}/assets`,
    (body) => ({
      items: Array.isArray(body.assets) ? (body.assets as Record<string, unknown>[]) : [],
      pagination: body.pagination as PaginatedList | undefined,
    })
  );
  const out: SiteAssetRow[] = [];
  for (const raw of assets) {
    const normalized = normalizeBeaconRuntimeAssetRow(raw);
    if (normalized != null) {
      out.push(normalized);
    }
  }
  return out;
}

async function listRegisteredBeaconRuntimeScripts(siteId: string): Promise<RegisteredScriptRow[]> {
  const scripts = await fetchAllPaginated<RegisteredScriptRow>(
    `/api/v2/webflow/sites/${encodeURIComponent(siteId)}/registered_scripts`,
    (body) => ({
      items: Array.isArray(body.registeredScripts) ? (body.registeredScripts as RegisteredScriptRow[]) : [],
      pagination: body.pagination as PaginatedList | undefined,
    })
  );
  return scripts.filter(
    (script) =>
      script.displayName === REGISTER_DISPLAY_NAME ||
      (typeof script.hostedLocation === "string" && script.hostedLocation.includes(CMS_SLOT_RUNTIME_ASSET_FILE_PREFIX))
  );
}

/**
 * Ids of every registered beacon runtime script, used to strip stale runtimes off page custom code. Best-effort: a
 * failed registry read returns an empty set so it can never block a sync or uninstall — marker-attribute removal still
 * covers the freshly-applied script.
 */
async function registeredBeaconRuntimeScriptIdSet(siteId: string): Promise<Set<string>> {
  return (await registeredBeaconRuntimeScriptIndex(siteId)).ids;
}

type RegisteredBeaconRuntimeIndex = {
  ids: Set<string>;
  versions: Set<string>;
  /** Registered id → the runtime source hash its hosted file name carries (falling back to its version's build tag). */
  hashById: Map<string, string>;
};

/**
 * Ids, taken versions and per-id runtime hashes of every registered beacon runtime script on the site. Same
 * best-effort contract as {@link registeredBeaconRuntimeScriptIdSet}: a failed registry read yields empty
 * collections, never a blocked sync.
 */
async function registeredBeaconRuntimeScriptIndex(siteId: string): Promise<RegisteredBeaconRuntimeIndex> {
  try {
    const scripts = await listRegisteredBeaconRuntimeScripts(siteId);
    const hashById = new Map<string, string>();
    for (const s of scripts) {
      const hash =
        (typeof s.hostedLocation === "string" ? readBeaconRuntimeHashFromName(s.hostedLocation) : null) ??
        readBeaconRuntimeHashFromVersion(s.version);
      if (typeof s.id === "string" && s.id.length > 0 && hash != null) {
        hashById.set(s.id, hash);
      }
    }
    return {
      ids: new Set(scripts.map((s) => s.id)),
      versions: new Set(
        scripts
          .filter((s) => s.displayName === REGISTER_DISPLAY_NAME && typeof s.version === "string")
          .map((s) => s.version as string)
      ),
      hashById,
    };
  } catch (e) {
    console.warn(LOG_PREFIX, "list registered beacon scripts failed (non-fatal)", e);
    return { ids: new Set<string>(), versions: new Set<string>(), hashById: new Map<string, string>() };
  }
}

function collectScriptIds(scripts: PageCustomScript[] | undefined, out: Set<string>): void {
  for (const script of scripts ?? []) {
    if (typeof script.id === "string" && script.id.length > 0) {
      out.add(script.id);
    }
  }
}

/**
 * Hard bounds on the orphan-asset page scan. It issues one `GET /pages/{id}/custom_code` per page, so on a large site
 * an unbounded scan is a long-running burst against a ~60 req/min budget (Marketplace: avoid long-running background
 * work; respect rate limits). Housekeeping is never worth degrading the customer's own API budget, so the scan is
 * capped by page count *and* wall-clock, and an incomplete scan skips the purge instead of acting on partial data.
 */
export const PURGE_MAX_PAGES_SCANNED = 60;
export const PURGE_SCAN_TIME_BUDGET_MS = 10_000;

export type BoundedPageScanPlan = { scan: string[]; skipped: number; complete: boolean };

/**
 * Splits the site's page ids into the bounded slice this invocation will scan and the remainder it will not.
 * Pure and exported so the cap is testable without the Data API. Non-string / empty ids are dropped at the boundary.
 */
export function planBoundedPageScan(
  pageIds: readonly unknown[] | null | undefined,
  maxPages: number = PURGE_MAX_PAGES_SCANNED
): BoundedPageScanPlan {
  const ids = (Array.isArray(pageIds) ? pageIds : []).filter(
    (id): id is string => typeof id === "string" && id.length > 0
  );
  const cap = Number.isFinite(maxPages) && maxPages > 0 ? Math.floor(maxPages) : 0;
  const scan = ids.slice(0, cap);
  return { scan, skipped: ids.length - scan.length, complete: scan.length === ids.length };
}

type AppliedScriptIdScan = { ids: Set<string>; complete: boolean; scanned: number; skipped: number };

async function collectAppliedCustomCodeScriptIds(
  siteId: string,
  now: () => number = Date.now
): Promise<AppliedScriptIdScan> {
  const ids = new Set<string>();
  collectScriptIds(await getSiteCustomScripts(siteId), ids);

  const plan = planBoundedPageScan(await listAllSitePageIds(siteId));
  let complete = plan.complete;
  let skipped = plan.skipped;
  let scanned = 0;
  const deadline = now() + PURGE_SCAN_TIME_BUDGET_MS;
  const batchSize = 5;

  for (let i = 0; i < plan.scan.length; i += batchSize) {
    if (now() >= deadline) {
      const remaining = plan.scan.length - i;
      complete = false;
      skipped += remaining;
      console.warn(LOG_PREFIX, "page scan stopped at time budget", {
        budgetMs: PURGE_SCAN_TIME_BUDGET_MS,
        scanned,
        remaining,
      });
      break;
    }
    const batch = plan.scan.slice(i, i + batchSize);
    // Fail-safe: a page read that errors (e.g. persistent 429/5xx) must abort the whole scan rather than be skipped.
    // A partial id set makes a still-referenced asset look orphaned, so the caller would wrongly delete a live runtime.
    // Propagating lets the caller treat the purge as not-run and retry later instead of acting on incomplete data.
    const perPage = await Promise.all(batch.map((pageId) => getPageCustomScripts(pageId)));
    for (const scripts of perPage) {
      collectScriptIds(scripts, ids);
    }
    scanned += batch.length;
  }

  if (plan.skipped > 0) {
    console.warn(LOG_PREFIX, "page scan capped", {
      maxPages: PURGE_MAX_PAGES_SCANNED,
      total: plan.scan.length + plan.skipped,
      skipped: plan.skipped,
    });
  }

  return { ids, complete, scanned, skipped };
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
  const res = await towerFetchWithRetry(`/api/v2/webflow/assets/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  return res.ok || res.status === 404;
}

/**
 * Best-effort delete of beacon runtime JS assets that are no longer referenced by site or page custom code.
 * Also clears stale assets left behind by prior syncs on the same page.
 *
 * `protectedHostedUrls` guards assets we *know* are live even when the Webflow custom-code API has not yet reflected
 * a just-applied script (read-after-write lag). Without this, a purge fired right after a sync deletes the runtime
 * asset the page footer was pointed at, breaking the live runtime.
 */
/**
 * Asset cleanup is best-effort housekeeping, not part of a sync's critical path. Scanning every page's custom code on
 * *every* sync is what produced the request floods / 429s. A per-site cooldown collapses repeated syncs into a single
 * scan; assets that miss a run are reclaimed on the next eligible purge. Keyed per site, scoped to this session.
 */
const PURGE_COOLDOWN_MS = 5 * 60 * 1000;
const lastPurgeAtBySite = new Map<string, number>();

async function purgeUnreferencedBeaconRuntimeAssets(
  siteId: string,
  protectedHostedUrls: Iterable<string> = [],
  options: { force?: boolean } = {}
): Promise<void> {
  const lastPurgeAt = lastPurgeAtBySite.get(siteId);
  if (!options.force && lastPurgeAt != null && Date.now() - lastPurgeAt < PURGE_COOLDOWN_MS) {
    return;
  }
  // Stamp before the scan so a failed/aborted run still respects the cooldown — prevents a failing scan from being
  // re-driven by every subsequent sync (which is exactly the flood we're removing).
  lastPurgeAtBySite.set(siteId, Date.now());
  try {
    const [scan, registeredScripts, assets] = await Promise.all([
      collectAppliedCustomCodeScriptIds(siteId),
      listRegisteredBeaconRuntimeScripts(siteId),
      listBeaconRuntimeAssets(siteId),
    ]);
    // Degrade gracefully: a bounded scan that did not cover every page yields a partial applied-id set, and acting on
    // it would delete assets that are still referenced by an unscanned page. Skip the purge; the next eligible run
    // reclaims them. Uninstall of the current page has already completed and is unaffected.
    if (!scan.complete) {
      console.warn(LOG_PREFIX, "orphan asset purge skipped — page scan was bounded and incomplete", {
        scanned: scan.scanned,
        skipped: scan.skipped,
      });
      return;
    }
    const appliedHostedUrls = collectAppliedHostedUrls(scan.ids, registeredScripts);
    for (const url of protectedHostedUrls) {
      if (typeof url === "string" && url.length > 0) {
        appliedHostedUrls.add(normalizeHostedAssetUrl(url));
      }
    }
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
 *
 * **No-ops when the page's applied runtime already matches this build** (see
 * {@link decideCmsSlotRuntimeSyncAction}) — registration records cannot be deleted via the Data API, so a redundant
 * register is a permanent entry against the customer's site. Pass `{ force: true }` from an explicit user-driven
 * repair ("Sync page script") where a re-push is the point of the action.
 */
export async function syncCmsSlotPageInlineScript(options: { force?: boolean } = {}): Promise<void> {
  if (!getTowerOrigin()) {
    throw new Error("Connect your Codalyn account to sync page custom code.");
  }

  // Best-effort: the Designer chrome/layout style is cosmetic. A Designer style failure must never abort the runtime
  // write (asset → register → page custom code), or the page ships with no runtime at all.
  try {
    await ensureCmsSlotListTargetLayoutStyle();
  } catch (e) {
    console.warn(LOG_PREFIX, "ensure list-target layout style (non-fatal)", e);
  }

  const sourceCode = getCmsSlotPageInlineScriptSource();
  const expectedHash = hashCmsSlotRuntimeSource(sourceCode);

  const siteId = (await webflow.getSiteInfo()).siteId;
  const pageId = (await webflow.getCurrentPage()).id as string;

  // Read the page's current state *before* uploading anything: an unchanged build must cost two GETs, not an
  // asset upload plus a permanent registration.
  const [existing, registry] = await Promise.all([
    getPageCustomScripts(pageId),
    registeredBeaconRuntimeScriptIndex(siteId),
  ]);
  const registeredBeaconScriptIds = registry.ids;
  const decision = decideCmsSlotRuntimeSyncAction({
    existing,
    expectedHash,
    registeredBeaconScriptIds,
    registeredBeaconRuntimeHashesById: registry.hashById,
    force: options.force,
  });
  if (decision.action === "skip") {
    return;
  }
  if (decision.action === "reapply") {
    // This build is already registered and applied; only the legacy `data-*` attributes remain on the page entry.
    // One PUT migrates it in place — no upload, no registration, no purge — so the hosted URL, bytes and SRI pin
    // (and any reviewer's saved runtime test package) stay valid.
    await putPageCustomScripts(pageId, withoutBeaconRuntimeAttributes(existing, registeredBeaconScriptIds));
    return;
  }

  const version = cmsSlotRuntimeScriptVersion({
    base: inlineScriptVersionBase(),
    sourceHash: expectedHash,
    takenVersions: registry.versions,
  });
  const registered = await registerHostedRuntimeScript(siteId, sourceCode, version);
  // The page entry is `{ id, location, version }` only: Webflow then renders the tag exactly as it renders its own
  // hosted scripts — `src type integrity crossorigin` — with the registered `integrityHash` as the SRI pin.
  const merged = mergePageScriptsWithBeaconRuntime(
    existing,
    { id: registered.id, location: "footer", version: registered.version },
    registeredBeaconScriptIds
  );

  await putPageCustomScripts(pageId, merged);
  await purgeUnreferencedBeaconRuntimeAssets(
    siteId,
    registered.sourceMapLocation == null
      ? [registered.hostedLocation]
      : [registered.hostedLocation, registered.sourceMapLocation]
  );
}

export type CmsSlotPageRuntimeRemovalResult =
  | { status: "removed" }
  | { status: "not_found" }
  | { status: "skipped_no_tower" }
  | { status: "failed"; reason: string };

/**
 * Removes the Codalyn beacon **footer** custom code from the current page (Tower + Data API) and deletes unreferenced
 * `codalyn-beacon-runtime-*.js` assets and their `.map.json` source maps from the site. No-op if Tower is not configured or the page has no matching
 * script.
 */
export async function removeCmsSlotPageRuntimeFromPage(): Promise<CmsSlotPageRuntimeRemovalResult> {
  if (!getTowerOrigin()) {
    return { status: "skipped_no_tower" };
  }

  try {
    const siteId = (await webflow.getSiteInfo()).siteId;
    const pageId = (await webflow.getCurrentPage()).id as string;
    const [existing, registeredBeaconScriptIds] = await Promise.all([
      getPageCustomScripts(pageId),
      registeredBeaconRuntimeScriptIdSet(siteId),
    ]);
    const next = withoutAnyBeaconRuntimeScripts(existing, registeredBeaconScriptIds);
    const status: CmsSlotPageRuntimeRemovalResult["status"] = next.length === existing.length ? "not_found" : "removed";
    if (status === "removed") {
      await putPageCustomScripts(pageId, next);
    }
    await purgeUnreferencedBeaconRuntimeAssets(siteId, [], { force: true });
    return { status };
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
    const footer = existing.filter((s) => scriptLocation(s) === "footer");
    // The applied entry normally identifies itself and its build through the `+beacon.<hash>` tag in its registered
    // version (or, on pages synced by older builds, the legacy marker attributes) — one GET. Only when the page
    // yields no self-identifying entry, or an entry whose build cannot be read (Webflow echoing a normalized
    // version), is the site registry consulted: it maps the entry's id to the hosted file name carrying the hash.
    let beacon = footer.find((s) => isBeaconRuntimeScript(s, NO_REGISTERED_BEACON_SCRIPT_IDS));
    let hashById: ReadonlyMap<string, string> | undefined;
    if (beacon == null || readAppliedBeaconRuntimeHash(beacon, undefined) == null) {
      const siteId = (await webflow.getSiteInfo()).siteId;
      const registry = await registeredBeaconRuntimeScriptIndex(siteId);
      hashById = registry.hashById;
      beacon ??= footer.find((s) => isBeaconRuntimeScript(s, registry.ids));
    }
    if (beacon == null) {
      return {
        synced: false,
        reason: "No beacon script in footer — sync from Designer.",
      };
    }
    const applied = readAppliedBeaconRuntimeHash(beacon, hashById);
    if (applied !== expectedHash) {
      return {
        synced: false,
        reason: "Beacon script out of date — sync from Designer.",
      };
    }
    return { synced: true };
  } catch (e) {
    return { synced: false, reason: formatRuntimeStatusError(e) };
  }
}
