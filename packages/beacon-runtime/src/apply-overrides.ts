import type { BeaconBlockOverrides, BeaconFieldType } from "./types";

const TYPE_ATTR = "data-beacon-field-type";

function detectType(el: Element): BeaconFieldType {
  const explicit = el.getAttribute(TYPE_ATTR);
  if (explicit === "text" || explicit === "html" || explicit === "image-src" || explicit === "href") {
    return explicit;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === "img") return "image-src";
  if (tag === "a") return "href";
  return "text";
}

function applyOne(el: Element, value: string, type: BeaconFieldType): void {
  if (!value) return;
  switch (type) {
    case "text":
      el.textContent = value;
      return;
    case "html":
      el.innerHTML = value;
      return;
    case "image-src":
      if (el instanceof HTMLImageElement) {
        el.src = value;
        el.removeAttribute("srcset");
      } else {
        el.setAttribute("src", value);
      }
      return;
    case "href":
      el.setAttribute("href", value);
      return;
  }
}

function addToFieldMap(byName: Map<string, HTMLElement[]>, name: string, el: HTMLElement): void {
  const arr = byName.get(name);
  if (arr) arr.push(el);
  else byName.set(name, [el]);
}

function prependRootIfField(root: Element, byName: Map<string, HTMLElement[]>): void {
  if (!(root instanceof HTMLElement) || !root.hasAttribute("data-beacon-field")) {
    return;
  }
  const name = root.getAttribute("data-beacon-field");
  if (!name) return;
  const arr = byName.get(name);
  if (arr) arr.unshift(root);
  else byName.set(name, [root]);
}

function indexBeaconFields(root: Element, fields: NodeListOf<HTMLElement>): Map<string, HTMLElement[]> {
  const byName = new Map<string, HTMLElement[]>();
  for (const el of Array.from(fields)) {
    const name = el.getAttribute("data-beacon-field");
    if (!name) continue;
    addToFieldMap(byName, name, el);
  }
  prependRootIfField(root, byName);
  return byName;
}

export function applyOverrides(root: Element, overrides: BeaconBlockOverrides): void {
  if (!overrides || Object.keys(overrides).length === 0) return;
  const fields = root.querySelectorAll<HTMLElement>("[data-beacon-field]");
  const byName = indexBeaconFields(root, fields);

  for (const [key, value] of Object.entries(overrides)) {
    const targets = byName.get(key);
    if (!targets) continue;
    for (const el of targets) applyOne(el, value, detectType(el));
  }
}
