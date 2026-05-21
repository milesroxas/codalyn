import { CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME } from "@/features/cms-slots/model/cms-slot-publish-placeholder-image-asset";

/** Custom attribute Engine tags on prop-bound elements; footer runtime reads this key. */
export const CMS_SLOT_BEACON_PROP_ATTR = "data-codalyn-beacon-prop";

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

/** Minified `function bPropEmpty(v){…}` embedded in the footer runtime. */
export function beaconPropEmptyRuntimeSource(): string {
  const url = JSON.stringify(CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
  const email = JSON.stringify(CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL);
  const text = JSON.stringify(CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT);
  const assetName = JSON.stringify(CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME);
  return `function bPropEmpty(v){if(v==null)return true;var raw=String(v);if(raw===${text})return true;var s=raw.trim();if(s==="")return true;if(s.indexOf(${assetName})>=0)return true;return s===${url}||s===${email}}`;
}

/** Minified `applyValue` for the footer runtime — sets `src` on IMG/SOURCE and on descendant `img` when the value is a URL. */
export function beaconPropApplyValueRuntimeSource(): string {
  return [
    'function bLooksLikeImageUrl(v){v=String(v==null?"":v);return/^https?:\\/\\//i.test(v)||v.indexOf("//")===0}',
    'function bApplyImageSrc(el,v){el.setAttribute("src",v);el.removeAttribute&&el.removeAttribute("srcset")}',
    'function applyValue(el,v){v=String(v==null?"":v);var tag=String(el.tagName||"").toUpperCase();if(tag==="IMG"||tag==="SOURCE"){bApplyImageSrc(el,v);return}if(bLooksLikeImageUrl(v)){var img=el.querySelector&&el.querySelector("img");if(img){bApplyImageSrc(img,v);return}}if(tag==="A"){el.setAttribute("href",v);return}if(tag==="IFRAME"||tag==="EMBED"){el.setAttribute("src",v);return}if(tag==="INPUT"){var type=String(el.type||"").toLowerCase();if(type==="checkbox"||type==="radio"){el.checked=!!(v&&v!=="0"&&v!=="false"&&v.toLowerCase()!=="off")}else{el.value=v}return}if(tag==="TEXTAREA"||tag==="SELECT"){el.value=v;return}el.textContent=v}',
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
    `function bPropClearPublishPlaceholder(n){var tag=String(n.tagName||'').toUpperCase();if(tag==='IMG'||tag==='SOURCE'||tag==='IFRAME'||tag==='EMBED'){var s=n.getAttribute('src')||'';if(bIsPlaceholderImageSrc(s))n.removeAttribute('src');return}if(tag==='A'){var h=n.getAttribute('href')||'';if(h===${url})n.removeAttribute('href');return}var img=n.querySelector&&n.querySelector('img');if(img){var si=img.getAttribute('src')||'';if(bIsPlaceholderImageSrc(si))img.removeAttribute('src')}var t=n.textContent||'';if(t===${text})n.textContent=''}`,
  ].join("");
}
