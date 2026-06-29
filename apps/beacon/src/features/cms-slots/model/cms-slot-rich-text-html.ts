import { isRichTextHtmlEmpty } from "@/shared/ui/rich-text-editor/lib/rich-text-empty";
import { isSafeRichTextUrl } from "@/shared/ui/rich-text-editor/lib/rich-text-url";

/**
 * Authoritative boundary sanitizer for Beacon rich-text values (plan §9, §11). Runs in the Beacon app at save time,
 * before a value is serialized into the runtime payload and shipped to a published page where the runtime applies it
 * via `innerHTML`. A strict tag/attr allowlist over a parsed `DOMParser` document — no heavy dependency; the editor's
 * constrained node set already keeps output narrow, so a focused, testable allowlist is preferred (CLAUDE.md: adapt +
 * validate at the boundary, separate from domain logic).
 *
 * Invalid/empty input returns `""` — never invents content (CLAUDE.md: no silent fallbacks). Empty-HTML
 * (`<p></p>`, `<p><br></p>`, `&nbsp;`) collapses to `""` so conditional visibility agrees on emptiness.
 */

/** Allowlisted element tags. The registered set is intentionally narrow (matches the editor node set). */
const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "a",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "blockquote",
]);

/** Tags whose entire subtree is dropped (never unwrapped — their text content is not content). */
const DROP_SUBTREE_TAGS: ReadonlySet<string> = new Set(["script", "style", "template", "noscript", "iframe", "object"]);

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

function applyAnchorAttrs(source: Element, target: HTMLElement): boolean {
  const href = source.getAttribute("href") ?? "";
  if (!isSafeRichTextUrl(href)) {
    // Drop the link wrapper but keep its text (handled by the caller unwrapping). Returning false signals "not a link".
    return false;
  }
  target.setAttribute("href", href.trim());
  const target_ = source.getAttribute("target");
  if (target_ === "_blank") {
    target.setAttribute("target", "_blank");
    target.setAttribute("rel", "noopener noreferrer");
  }
  return true;
}

function sanitizeChildren(source: Node, out: Node, doc: Document): void {
  for (let child = source.firstChild; child != null; child = child.nextSibling) {
    if (child.nodeType === TEXT_NODE) {
      out.appendChild(doc.createTextNode(child.nodeValue ?? ""));
      continue;
    }
    if (child.nodeType !== ELEMENT_NODE) {
      continue; // comments, processing instructions, etc.
    }
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (DROP_SUBTREE_TAGS.has(tag)) {
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap: keep allowlisted descendants/text, discard the disallowed element itself.
      sanitizeChildren(el, out, doc);
      continue;
    }
    if (tag === "a") {
      const anchor = doc.createElement("a");
      if (!applyAnchorAttrs(el, anchor)) {
        // Unsafe href → unwrap, preserving the text.
        sanitizeChildren(el, out, doc);
        continue;
      }
      sanitizeChildren(el, anchor, doc);
      out.appendChild(anchor);
      continue;
    }
    const clean = doc.createElement(tag);
    sanitizeChildren(el, clean, doc);
    out.appendChild(clean);
  }
}

export function sanitizeBeaconRichTextHtml(raw: string | null | undefined): string {
  if (raw == null) {
    return "";
  }
  const source = String(raw);
  if (source.trim().length === 0) {
    return "";
  }
  const doc = new DOMParser().parseFromString(source, "text/html");
  const container = doc.createElement("div");
  sanitizeChildren(doc.body, container, doc);
  const html = container.innerHTML;
  return isRichTextHtmlEmpty(html) ? "" : html;
}
