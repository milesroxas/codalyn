import {
  CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME,
  isPublishPlaceholderImageReference,
} from "@/features/cms-slots/model/cms-slot-publish-placeholder-image-asset";

/**
 * Content tag on a prop-bound element; footer runtime swaps this element's content with the Composer value.
 * Value is a `|`-separated list of exposed prop ids; duplicate binding sites use an ordinal suffix `propId@N`
 * (see {@link formatContentAttrSegmentsForBindings}). The footer `pickP` resolves any segment back to its base propId.
 */
export const CMS_SLOT_CONTENT_ATTR = "data-cb-c";

/**
 * Conditional-visibility marker. `"1"` when the element's visibility is bound to a prop/CMS condition. The runtime
 * hides such an element when the Composer leaves its content empty (instead of falling back to the seeded default).
 */
export const CMS_SLOT_COND_ATTR = "data-cb-v";

/**
 * Class-append tag. Holds the same `|`-separated segment list as {@link CMS_SLOT_CONTENT_ATTR} (duplicate sites use
 * `propId@N`), but the resolved value is **appended to the element's class list** at runtime instead of replacing its
 * content. Set when a `class` attribute (Webflow Attributes panel) is bound to an exposed component prop — that
 * binding surfaces only inside `getSettings().attributes`, so the content scan never tags it.
 */
export const CMS_SLOT_CLASS_ATTR = "data-cb-cls";

/**
 * Records the class tokens the runtime appended on a prior pass so re-runs (the runtime applies three times) replace
 * those tokens instead of duplicating them. Removed when nothing is applied.
 */
export const CMS_SLOT_CLASS_APPLIED_ATTR = "data-cb-cls-applied";

/** Tag attributes the Designer writes onto bound elements (and that cleanup removes). */
const CMS_SLOT_WRITTEN_TAG_ATTRS = [CMS_SLOT_CONTENT_ATTR, CMS_SLOT_COND_ATTR, CMS_SLOT_CLASS_ATTR] as const;

/** Canonical exposed prop id from a `data-cb-c` segment (strips the `@N` / `@…` suffix). */
export function canonicalPropIdFromContentAttrSegment(segment: string): string {
  const t = segment.trim();
  const at = t.indexOf("@");
  return at >= 0 ? t.slice(0, at) : t;
}

/**
 * Builds content attr segments: the first binding site for a prop keeps `propId`; later sites use an ordinal
 * `propId@N` (N = 1, 2, …) so the published DOM never repeats the same tag signature on two elements. The ordinal is
 * delimiter-free (no `|`/`@` collision); the footer `pickP` strips it to resolve the base propId.
 */
export function formatContentAttrSegmentsForBindings(
  canonicalPropIds: readonly string[],
  bindingCounts: Map<string, number>
): string[] {
  const segments: string[] = [];
  for (const canonical of canonicalPropIds) {
    const prior = bindingCounts.get(canonical) ?? 0;
    bindingCounts.set(canonical, prior + 1);
    segments.push(prior === 0 ? canonical : `${canonical}@${prior}`);
  }
  return segments;
}

/** Minimal attr API for removing Designer tags from a bound element. */
export type BeaconCmsSlotAttrRemoveOps = {
  get: (name: string) => Promise<null | string>;
  remove: (name: string) => Promise<null>;
};

/** Attr API for ownership-aware tag edits (rewrites `data-cb-c` instead of always clearing it). */
export type BeaconCmsSlotAttrOps = BeaconCmsSlotAttrRemoveOps & {
  set: (name: string, value: string) => Promise<null>;
};

/** Removes all CMS slot tag attrs when present; returns how many attrs were removed. */
export async function removeCmsSlotTagAttrsIfPresent(attr: BeaconCmsSlotAttrRemoveOps): Promise<number> {
  let removed = 0;
  for (const key of CMS_SLOT_WRITTEN_TAG_ATTRS) {
    const cur = await attr.get(key);
    if (cur != null && cur.length > 0) {
      await attr.remove(key);
      removed += 1;
    }
  }
  return removed;
}

/** Split a `data-cb-c` value into trimmed, non-empty segments. */
function parseContentAttrSegments(value: string | null | undefined): string[] {
  if (value == null) {
    return [];
  }
  const out: string[] = [];
  for (const part of value.split("|")) {
    const seg = part.trim();
    if (seg.length > 0) {
      out.push(seg);
    }
  }
  return out;
}

/** True when a `data-cb-c` segment's canonical prop id belongs to `ownerIds` (case-insensitive). */
export function contentAttrSegmentOwnedBy(segment: string, ownerIds: ReadonlySet<string>): boolean {
  const canonical = canonicalPropIdFromContentAttrSegment(segment);
  if (canonical.length === 0) {
    return false;
  }
  if (ownerIds.has(canonical)) {
    return true;
  }
  const lower = canonical.toLowerCase();
  for (const id of ownerIds) {
    if (id.toLowerCase() === lower) {
      return true;
    }
  }
  return false;
}

/**
 * Recomputes a (possibly shared) element's `data-cb-c` segments during **one** Designer component's tag sync.
 * Keeps segments owned by **other** Designer components (`foreignExposedIds`); drops the current component's old
 * segments and any segment owned by no current component (stale); then appends this sync's `newSegments`.
 * The same nested component definition can therefore carry one segment per Designer component that exposes it
 * (e.g. an Image nested in both Hero and Card), and the footer runtime resolves the right value per row via `pickP`.
 */
export function mergeContentAttrSegments(input: {
  existing: string | null;
  foreignExposedIds: ReadonlySet<string>;
  newSegments: readonly string[];
}): string[] {
  const kept = parseContentAttrSegments(input.existing).filter((seg) =>
    contentAttrSegmentOwnedBy(seg, input.foreignExposedIds)
  );
  const out: string[] = [];
  const seen = new Set<string>();
  for (const seg of [...kept, ...input.newSegments]) {
    if (seg.length === 0 || seen.has(seg)) {
      continue;
    }
    seen.add(seg);
    out.push(seg);
  }
  return out;
}

/**
 * Removes segments owned by `ownerExposedIds` (one deleted Designer component) from a `data-cb-c` value, returning the
 * segments that remain (owned by other Designer components). Used to clean a deleted component's tags off shared
 * element definitions without disturbing the rest.
 */
export function removeOwnedContentAttrSegments(
  existing: string | null,
  ownerExposedIds: ReadonlySet<string>
): string[] {
  return parseContentAttrSegments(existing).filter((seg) => !contentAttrSegmentOwnedBy(seg, ownerExposedIds));
}

/** Drops `ownerExposedIds`-owned segments from one `|`-separated attr; clears the attr when none remain. */
async function rewriteOwnedSegmentAttr(
  attr: BeaconCmsSlotAttrOps,
  name: string,
  ownerExposedIds: ReadonlySet<string>
): Promise<{ changed: number; remaining: number }> {
  const existing = await attr.get(name);
  const had = parseContentAttrSegments(existing);
  if (had.length === 0) {
    return { changed: 0, remaining: 0 };
  }
  const remaining = removeOwnedContentAttrSegments(existing, ownerExposedIds);
  if (remaining.length === had.length) {
    return { changed: 0, remaining: remaining.length };
  }
  if (remaining.length === 0) {
    await attr.remove(name);
    return { changed: 1, remaining: 0 };
  }
  await attr.set(name, remaining.join("|"));
  return { changed: 1, remaining: remaining.length };
}

/**
 * Strips one Designer component's tags from a (possibly shared) element. Rewrites `data-cb-c` **and** `data-cb-cls`
 * to the segments owned by other components, each independently; when no content segment remains also removes
 * `data-cb-v` (the conditional flag belongs to the content stream). `ownerExposedIds` empty ⇒ removes all tags
 * (single-owner / legacy). Returns the number of attributes changed.
 */
export async function removeOwnedCmsSlotTagAttrs(
  attr: BeaconCmsSlotAttrOps,
  ownerExposedIds: ReadonlySet<string>
): Promise<number> {
  if (ownerExposedIds.size === 0) {
    return removeCmsSlotTagAttrsIfPresent(attr);
  }
  const content = await rewriteOwnedSegmentAttr(attr, CMS_SLOT_CONTENT_ATTR, ownerExposedIds);
  const cls = await rewriteOwnedSegmentAttr(attr, CMS_SLOT_CLASS_ATTR, ownerExposedIds);
  let changed = content.changed + cls.changed;
  if (content.remaining === 0) {
    const cond = await attr.get(CMS_SLOT_COND_ATTR);
    if (cond != null && cond.length > 0) {
      await attr.remove(CMS_SLOT_COND_ATTR);
      changed += 1;
    }
  }
  return changed;
}

/** Webflow conditional visibility class on published elements when “Keep in HTML when hidden” is enabled. */
export const WEBFLOW_CONDITION_INVISIBLE_CLASS = "w-condition-invisible";

/** Visible in Designer / publish HTML so Webflow conditional visibility includes tagged nodes; runtime treats as empty. */
export const CMS_SLOT_PUBLISH_PLACEHOLDER_URL = "https://codalyn.beacon/publish-placeholder";

export const CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL = "placeholder@codalyn.invalid";

/** Non-breaking space used as a minimal text publish placeholder. */
export const CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT = "\u00a0";

/** True when a value is a Designer/publish seed sentinel — not real Composer content. */
export function isBeaconPublishPlaceholderValue(v: unknown): boolean {
  if (v == null) {
    return false;
  }
  const raw = String(v);
  if (raw === CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT) {
    return true;
  }
  const s = raw.trim();
  if (s === CMS_SLOT_PUBLISH_PLACEHOLDER_URL || s === CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL) {
    return true;
  }
  return isPublishPlaceholderImageReference(v);
}

/** True when a Composer field is unset (Designer empty checks). */
export function isBeaconPropValueEmpty(v: unknown): boolean {
  if (v == null) {
    return true;
  }
  return String(v).trim() === "";
}

/** True when a runtime JSON `p` value should hide the bound node (includes publish placeholders). */
export function isBeaconRuntimePropValueEmpty(v: unknown): boolean {
  if (isBeaconPropValueEmpty(v)) {
    return true;
  }
  return isBeaconPublishPlaceholderValue(v);
}

/** Minified `function pickP(ps,k){…}` — resolves prop payload keys; `@`-suffixed segments fall back to the base prop id. */
export function beaconPropPickRuntimeSource(): string {
  return 'function pickP(ps,k){if(!k||!ps||typeof ps!=="object")return;var a=String(k);if(Object.prototype.hasOwnProperty.call(ps,a))return ps[a];var al=a.toLowerCase();for(var x in ps)if(Object.prototype.hasOwnProperty.call(ps,x)&&x.toLowerCase()===al)return ps[x];var at=a.indexOf("@");if(at>0){var b=a.slice(0,at);if(Object.prototype.hasOwnProperty.call(ps,b))return ps[b];var bl=b.toLowerCase();for(var y in ps)if(Object.prototype.hasOwnProperty.call(ps,y)&&y.toLowerCase()===bl)return ps[y]}}';
}

/** Minified `function bPropEmpty(v){…}` embedded in the footer runtime. */
export function beaconPropEmptyRuntimeSource(): string {
  const url = JSON.stringify(CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
  const email = JSON.stringify(CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL);
  const text = JSON.stringify(CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT);
  const assetName = JSON.stringify(CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME);
  return `function bPropEmpty(v){if(v==null)return true;var raw=String(v);if(raw===${text})return true;var s=raw.trim();if(s==="")return true;if(s.indexOf(${assetName})>=0)return true;return s===${url}||s===${email}}`;
}

/** Minified `applyValue` for the footer runtime — sets `src`/`srcset` on images and picture/source descendants. */
export function beaconPropApplyValueRuntimeSource(): string {
  return [
    'function bLooksLikeImageUrl(v){v=String(v==null?"":v);return/^https?:\\/\\//i.test(v)||v.indexOf("//")===0}',
    'function bEscapeCssUrl(u){return String(u).replace(/\\\\/g,"\\\\\\\\").replace(/"/g,"\\\\\\"")}',
    'function bApplyImageSrc(el,v){var tag=String(el.tagName||"").toUpperCase();if(tag==="SOURCE"){el.setAttribute("srcset",v);if(/\\.avif(\\?|$)/i.test(v))el.setAttribute("type","image/avif");else if(/\\.webp(\\?|$)/i.test(v))el.setAttribute("type","image/webp");el.removeAttribute("src");return}el.setAttribute("src",v);if(el.removeAttribute){el.removeAttribute("srcset");el.removeAttribute("sizes")}var par=el.parentElement;if(par&&String(par.tagName||"").toUpperCase()==="PICTURE"){var sources=par.querySelectorAll("source"),i;for(i=0;i<sources.length;i++)bApplyImageSrc(sources[i],v)}}',
    'function bApplyImageToContainer(el,v){var pic=el.tagName&&String(el.tagName).toUpperCase()==="PICTURE"?el:(el.querySelector&&el.querySelector("picture"));if(pic){var sources=pic.querySelectorAll("source"),i;for(i=0;i<sources.length;i++)bApplyImageSrc(sources[i],v);var pimg=pic.querySelector("img");if(pimg)bApplyImageSrc(pimg,v);return true}var img=el.querySelector&&el.querySelector("img");if(img){bApplyImageSrc(img,v);return true}var src=el.querySelector&&el.querySelector("source");if(src){bApplyImageSrc(src,v);return true}var tag=String(el.tagName||"").toUpperCase();if(tag==="DIV"||tag==="SPAN"||tag==="FIGURE"){el.style.setProperty("background-image","url(\\""+bEscapeCssUrl(v)+"\\")");el.style.setProperty("background-size","cover");return true}return false}',
    'function bApplyLink(el,v){var h=v,nt=false;if(v&&v.charAt(0)==="{"){try{var o=JSON.parse(v);if(o&&typeof o==="object"&&typeof o.h==="string"){h=o.h;nt=o.t===1||o.t===true}}catch(e){}}el.setAttribute("href",h);if(nt){el.setAttribute("target","_blank");el.setAttribute("rel","noopener noreferrer")}else{el.removeAttribute("target")}}',
    'function applyValue(el,v){v=String(v==null?"":v);var tag=String(el.tagName||"").toUpperCase();if(tag==="IMG"||tag==="SOURCE"){bApplyImageSrc(el,v);return}if(tag==="PICTURE"){bApplyImageToContainer(el,v);return}if(bLooksLikeImageUrl(v)&&bApplyImageToContainer(el,v))return;if(tag==="A"&&bLooksLikeImageUrl(v)&&el.querySelector&&el.querySelector("img")){bApplyImageToContainer(el,v);return}if(tag==="A"){bApplyLink(el,v);return}if(tag==="IFRAME"||tag==="EMBED"){el.setAttribute("src",v);return}if(tag==="INPUT"){var type=String(el.type||"").toLowerCase();if(type==="checkbox"||type==="radio"){el.checked=!!(v&&v!=="0"&&v!=="false"&&v.toLowerCase()!=="off")}else{el.value=v}return}if(tag==="TEXTAREA"||tag==="SELECT"){el.value=v;return}el.textContent=v}',
  ].join("");
}

/**
 * Minified class-append helpers for the footer runtime. A `data-cb-cls` element gets the resolved per-row prop value's
 * whitespace-separated tokens **appended** to its class list (existing Webflow classes are kept). The
 * `data-cb-cls-applied` marker makes the three reapply passes idempotent: tokens added on a prior pass are removed
 * before the new set is added, so re-runs never duplicate or strand classes. Depends on `pickP` + `bPropEmpty`.
 */
export function beaconPropApplyClassRuntimeSource(): string {
  const applied = JSON.stringify(CMS_SLOT_CLASS_APPLIED_ATTR);
  const attr = JSON.stringify(CMS_SLOT_CLASS_ATTR);
  return [
    'function bClsTokens(v){v=String(v==null?"":v);var parts=v.split(/\\s+/),out=[],i,t;for(i=0;i<parts.length;i++){t=parts[i];if(t&&!bPropEmpty(t)&&out.indexOf(t)<0)out.push(t)}return out}',
    `function bApplyClassBinding(node,props){if(!node||!node.classList)return[];var raw=node.getAttribute(${attr})||"";if(!raw)return[];var segs=String(raw).split("|"),add=[],si,seg,pv,tk,i;for(si=0;si<segs.length;si++){seg=segs[si].trim();if(!seg)continue;pv=pickP(props,seg);if(bPropEmpty(pv))continue;tk=bClsTokens(pv);for(i=0;i<tk.length;i++)if(add.indexOf(tk[i])<0)add.push(tk[i])}var prev=node.getAttribute(${applied});if(prev){var pt=prev.split(/\\s+/),x;for(x=0;x<pt.length;x++)if(pt[x]&&add.indexOf(pt[x])<0)node.classList.remove(pt[x])}for(i=0;i<add.length;i++)node.classList.add(add[i]);if(add.length)node.setAttribute(${applied},add.join(" "));else node.removeAttribute(${applied});return add}`,
  ].join("");
}

/**
 * Minified hide/reveal helpers for the footer runtime, including Webflow conditional visibility on ancestors.
 * Reveal strips `w-condition-invisible` only from ancestors that already carry it.
 * Conceal re-hides the tagged node and at most its conditional wrapper — never the whole component row.
 */
export function beaconPropVisibilityRuntimeSource(): string {
  const cls = JSON.stringify(WEBFLOW_CONDITION_INVISIBLE_CLASS);
  const url = JSON.stringify(CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
  const text = JSON.stringify(CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT);
  const assetName = JSON.stringify(CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME);
  return [
    "function bPropSetHidden(n,h){if(h){n.setAttribute('hidden','');n.setAttribute('aria-hidden','true')}else{n.removeAttribute('hidden');n.removeAttribute('aria-hidden')}}",
    `function bPropReveal(n,row){bPropSetHidden(n,false);var cur=n===row?null:n.parentElement;while(cur&&cur!==row){if(cur.classList.contains(${cls})){cur.classList.remove(${cls});cur.style.removeProperty('display');cur.style.removeProperty('visibility')}cur=cur.parentElement}}`,
    `function bPropConceal(n,row){bPropSetHidden(n,true);var cur=n===row?null:n.parentElement,touched=false;while(cur&&cur!==row){if(cur.classList.contains(${cls})){cur.style.setProperty('display','none');cur.style.removeProperty('visibility');touched=true}cur=cur.parentElement}if(!touched&&n!==row){var p=n.parentElement;if(p&&p!==row){p.classList.add(${cls});p.style.setProperty('display','none')}}}`,
    `function bIsPlaceholderImageSrc(s){s=String(s||"");return s===${url}||s.indexOf(${assetName})>=0}`,
    `function bPropClearPublishPlaceholder(n){var tag=String(n.tagName||'').toUpperCase();if(tag==='SOURCE'){var ss=n.getAttribute('srcset')||'';if(bIsPlaceholderImageSrc(ss)||ss.indexOf(${assetName})>=0)n.removeAttribute('srcset');return}if(tag==='IMG'||tag==='IFRAME'||tag==='EMBED'){var s=n.getAttribute('src')||'';if(bIsPlaceholderImageSrc(s))n.removeAttribute('src');return}if(tag==='A'){var h=n.getAttribute('href')||'';if(h===${url})n.removeAttribute('href');return}var pic=n.querySelector&&n.querySelector('picture');if(pic){var sources=pic.querySelectorAll('source'),i;for(i=0;i<sources.length;i++){var si=sources[i].getAttribute('srcset')||'';if(bIsPlaceholderImageSrc(si)||si.indexOf(${assetName})>=0)sources[i].removeAttribute('srcset')}}var img=n.querySelector&&n.querySelector('img');if(img){var si=img.getAttribute('src')||'';if(bIsPlaceholderImageSrc(si))img.removeAttribute('src')}var t=n.textContent||'';if(t===${text})n.textContent=''}`,
  ].join("");
}
