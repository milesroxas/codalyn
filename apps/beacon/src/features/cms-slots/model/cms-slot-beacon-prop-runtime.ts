import { CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME } from "@/features/cms-slots/model/cms-slot-publish-placeholder-image-asset";

/** Custom attribute Engine tags on prop-bound elements; footer runtime reads this key. */
export const CMS_SLOT_BEACON_PROP_ATTR = "data-codalyn-beacon-prop";

/**
 * Stable Designer element identity on each tagged node (component|element).
 * Disambiguates duplicate bindings to the same exposed prop (e.g. direct image + nested image wrapper).
 */
export const CMS_SLOT_BEACON_BIND_ATTR = "data-codalyn-beacon-bind";

/** Stable bind id for a Webflow element, or null when `id` is incomplete. */
export function cmsSlotBeaconBindIdFromElement(el: AnyElement): string | null {
  const id = el.id as { component?: unknown; element?: unknown };
  if (typeof id.component === "string" && typeof id.element === "string") {
    return `${id.component}|${id.element}`;
  }
  return null;
}

/** Canonical exposed prop id from a `data-codalyn-beacon-prop` segment (strips `@bindId` suffix). */
export function canonicalPropIdFromBeaconPropAttrSegment(segment: string): string {
  const t = segment.trim();
  const at = t.indexOf("@");
  return at >= 0 ? t.slice(0, at) : t;
}

/**
 * Builds prop attr segments: first binding site keeps `propId`; later sites use `propId@bindId`
 * so published DOM never repeats the same tag signature on two elements.
 */
export function formatBeaconPropAttrSegmentsForBindings(
  canonicalPropIds: readonly string[],
  bindId: string,
  bindingCounts: Map<string, number>
): string[] {
  const segments: string[] = [];
  for (const canonical of canonicalPropIds) {
    const prior = bindingCounts.get(canonical) ?? 0;
    bindingCounts.set(canonical, prior + 1);
    segments.push(prior === 0 ? canonical : `${canonical}@${bindId}`);
  }
  return segments;
}

/** Minimal attr API for removing Engine tags from a bound element. */
export type BeaconCodalynAttrRemoveOps = {
  get: (name: string) => Promise<null | string>;
  remove: (name: string) => Promise<null>;
};

/** Removes both beacon prop/bind attrs when present; returns how many attrs were removed. */
export async function removeBeaconCodalynAttrsIfPresent(attr: BeaconCodalynAttrRemoveOps): Promise<number> {
  let removed = 0;
  for (const key of [CMS_SLOT_BEACON_PROP_ATTR, CMS_SLOT_BEACON_BIND_ATTR] as const) {
    const cur = await attr.get(key);
    if (cur != null && cur.length > 0) {
      await attr.remove(key);
      removed += 1;
    }
  }
  return removed;
}

/** Webflow conditional visibility class on published elements when “Keep in HTML when hidden” is enabled. */
export const WEBFLOW_CONDITION_INVISIBLE_CLASS = "w-condition-invisible";

/** Visible in Designer / publish HTML so Webflow conditional visibility includes tagged nodes; runtime treats as empty. */
export const CMS_SLOT_PUBLISH_PLACEHOLDER_URL = "https://codalyn.beacon/publish-placeholder";

export const CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL = "placeholder@codalyn.invalid";

/** Non-breaking space used as a minimal text publish placeholder. */
export const CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT = "\u00a0";

export {
  CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME,
  getCachedPublishPlaceholderImageAssetId,
  isPublishPlaceholderImageReference,
} from "@/features/cms-slots/model/cms-slot-publish-placeholder-image-asset";

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
  return s.includes(CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME);
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

/** Minified `function pickP(ps,k){…}` — resolves prop payload keys; `@bindId` segments fall back to the base prop id. */
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
    'function applyValue(el,v){v=String(v==null?"":v);var tag=String(el.tagName||"").toUpperCase();if(tag==="IMG"||tag==="SOURCE"){bApplyImageSrc(el,v);return}if(tag==="PICTURE"){bApplyImageToContainer(el,v);return}if(bLooksLikeImageUrl(v)&&bApplyImageToContainer(el,v))return;if(tag==="A"&&bLooksLikeImageUrl(v)&&el.querySelector&&el.querySelector("img")){bApplyImageToContainer(el,v);return}if(tag==="A"){el.setAttribute("href",v);return}if(tag==="IFRAME"||tag==="EMBED"){el.setAttribute("src",v);return}if(tag==="INPUT"){var type=String(el.type||"").toLowerCase();if(type==="checkbox"||type==="radio"){el.checked=!!(v&&v!=="0"&&v!=="false"&&v.toLowerCase()!=="off")}else{el.value=v}return}if(tag==="TEXTAREA"||tag==="SELECT"){el.value=v;return}el.textContent=v}',
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
    `function bPropReveal(n,row){bPropSetHidden(n,false);var cur=n.parentElement;while(cur&&cur!==row){if(cur.classList.contains(${cls})){cur.classList.remove(${cls});cur.style.removeProperty('display');cur.style.removeProperty('visibility')}cur=cur.parentElement}}`,
    `function bPropConceal(n,row){bPropSetHidden(n,true);var cur=n.parentElement,touched=false;while(cur&&cur!==row){if(cur.classList.contains(${cls})){cur.style.setProperty('display','none');cur.style.removeProperty('visibility');touched=true}cur=cur.parentElement}if(!touched){var p=n.parentElement;if(p&&p!==row){p.classList.add(${cls});p.style.setProperty('display','none')}}}`,
    `function bIsPlaceholderImageSrc(s){s=String(s||"");return s===${url}||s.indexOf(${assetName})>=0}`,
    `function bPropClearPublishPlaceholder(n){var tag=String(n.tagName||'').toUpperCase();if(tag==='SOURCE'){var ss=n.getAttribute('srcset')||'';if(bIsPlaceholderImageSrc(ss)||ss.indexOf(${assetName})>=0)n.removeAttribute('srcset');return}if(tag==='IMG'||tag==='IFRAME'||tag==='EMBED'){var s=n.getAttribute('src')||'';if(bIsPlaceholderImageSrc(s))n.removeAttribute('src');return}if(tag==='A'){var h=n.getAttribute('href')||'';if(h===${url})n.removeAttribute('href');return}var pic=n.querySelector&&n.querySelector('picture');if(pic){var sources=pic.querySelectorAll('source'),i;for(i=0;i<sources.length;i++){var si=sources[i].getAttribute('srcset')||'';if(bIsPlaceholderImageSrc(si)||si.indexOf(${assetName})>=0)sources[i].removeAttribute('srcset')}}var img=n.querySelector&&n.querySelector('img');if(img){var si=img.getAttribute('src')||'';if(bIsPlaceholderImageSrc(si))img.removeAttribute('src')}var t=n.textContent||'';if(t===${text})n.textContent=''}`,
  ].join("");
}
