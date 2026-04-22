import type { BeaconOnPage } from "@/features/beacons/model/beacon-page-targets";

type BodyWithAppend = AnyElement & {
  append: (preset: ElementPreset<AnyElement>) => Promise<AnyElement>;
  getChildren: () => Promise<AnyElement[]>;
};

const BEACON_WRAPPER_ATTR = "data-beacon-wrapper";
const BEACON_WRAPPER_ATTR_VALUE = "beacons-wrapper";
const BEACON_WRAPPER_STYLE_NAME = "beacons-wrapper";

function getBodyElement(all: AnyElement[]): BodyWithAppend | null {
  const body = all.find((e) => e.type === "Body");
  if (!body) return null;
  if (typeof (body as { append?: unknown }).append !== "function") return null;
  if (typeof (body as { getChildren?: unknown }).getChildren !== "function") return null;
  return body as BodyWithAppend;
}

export async function findBeaconsWrapperOnPage(): Promise<BlockElement | null> {
  const all = await webflow.getAllElements();
  for (const el of all) {
    if (el.type !== "Block") continue;
    const block = el as BlockElement;
    const v = await block.getCustomAttribute(BEACON_WRAPPER_ATTR);
    if (v === BEACON_WRAPPER_ATTR_VALUE) return block;
  }
  return null;
}

async function ensureBeaconsWrapperHiddenStyle(): Promise<Style> {
  const all = await webflow.getAllStyles();
  for (const s of all) {
    if ((await s.getName()) === BEACON_WRAPPER_STYLE_NAME) {
      return s;
    }
  }
  const created = await webflow.createStyle(BEACON_WRAPPER_STYLE_NAME);
  await created.setProperty("display", "none");
  return created;
}

async function reparentBodyDirectBeaconsInto(
  body: BodyWithAppend,
  wrapper: BlockElement,
  embed: HtmlEmbedElement
): Promise<number> {
  let reparented = 0;
  for (const ch of await body.getChildren()) {
    if (ch === wrapper) continue;
    if (ch.type !== "Block") continue;
    const block = ch as BlockElement;
    const target = await block.getCustomAttribute("data-target");
    const list = await block.getCustomAttribute("data-list");
    if (target !== "beacons" || list == null || !list.startsWith("beacon-")) continue;
    try {
      await embed.before(ch);
      reparented += 1;
    } catch {
      /* Designer may block some moves; leave target on body */
    }
  }
  return reparented;
}

async function ensureHtmlEmbedInWrapper(wrapper: BlockElement): Promise<HtmlEmbedElement> {
  const kids = await wrapper.getChildren();
  const existing = kids.find((c): c is HtmlEmbedElement => c.type === "HtmlEmbed");
  if (existing) return existing;
  try {
    return (await wrapper.append(webflow.elementPresets.HtmlEmbed)) as HtmlEmbedElement;
  } catch {
    throw new Error("The Beacons container cannot hold an HTML embed.");
  }
}

/** Beacon list divs stay before the install HTML embed; move embed to the end if needed. */
async function ensureEmbedIsLastChild(wrapper: BlockElement, embed: HtmlEmbedElement): Promise<void> {
  const kids = await wrapper.getChildren();
  if (kids.length === 0) return;
  if (kids[kids.length - 1] === embed) return;
  try {
    await wrapper.append(embed);
  } catch {
    /* leave order unchanged if Designer blocks the move */
  }
}

/**
 * Installs a hidden **`beacons-wrapper`** div (class style `beacons-wrapper`, `display: none`) at the end of
 * the page body, with an **HTML embed** as the **last** child. Beacon list divs are **before** the embed.
 * Existing beacon targets that were direct children of Body are moved into the wrapper (before the embed).
 * Idempotent: returns the existing wrapper if already present.
 */
export async function installBeaconsWrapperOnPage(): Promise<{
  wrapper: BlockElement;
  embed: HtmlEmbedElement;
  created: boolean;
  reparented: number;
}> {
  const found = await findBeaconsWrapperOnPage();
  if (found) {
    const embed = await ensureHtmlEmbedInWrapper(found);
    await ensureEmbedIsLastChild(found, embed);
    return { wrapper: found, embed, created: false, reparented: 0 };
  }

  const all = await webflow.getAllElements();
  const body = getBodyElement(all);
  if (!body) {
    throw new Error("Could not find Body on this page. Open a page in the Designer and try again.");
  }

  const hidden = await ensureBeaconsWrapperHiddenStyle();
  const wrapper = (await body.append(webflow.elementPresets.DivBlock)) as BlockElement;
  await wrapper.setTag("div");
  await wrapper.setStyles([hidden]);
  await wrapper.setCustomAttribute(BEACON_WRAPPER_ATTR, BEACON_WRAPPER_ATTR_VALUE);
  let embed: HtmlEmbedElement;
  try {
    embed = (await wrapper.append(webflow.elementPresets.HtmlEmbed)) as HtmlEmbedElement;
  } catch {
    await wrapper.remove();
    throw new Error("Beacon could not create the Beacons container on this page.");
  }

  const reparented = await reparentBodyDirectBeaconsInto(body, wrapper, embed);
  await ensureEmbedIsLastChild(wrapper, embed);
  return { wrapper, embed, created: true, reparented };
}

/** `true` when this page has the `beacons-wrapper` install (beacons must be created inside it). */
export async function isBeaconsWrapperInstalledOnPage(): Promise<boolean> {
  return (await findBeaconsWrapperOnPage()) != null;
}

/**
 * Beacons that are still direct children of Body (e.g. reparent into the install wrapper failed). Empty when there is
 * no issue.
 */
export async function listBeaconsOrphanedOnBody(): Promise<BeaconOnPage[]> {
  const bodyRow = (await webflow.getAllElements()).find((e) => e.type === "Body");
  if (!bodyRow) {
    return [];
  }
  const wrapper = await findBeaconsWrapperOnPage();
  const out: BeaconOnPage[] = [];
  for (const ch of await bodyRow.getChildren()) {
    if (wrapper && ch === wrapper) continue;
    if (ch.type !== "Block") continue;
    const block = ch as BlockElement;
    const target = await block.getCustomAttribute("data-target");
    const list = await block.getCustomAttribute("data-list");
    if (target === "beacons" && list != null && list.startsWith("beacon-")) {
      const key = `${block.id.component}:${block.id.element}`;
      out.push({ dataList: list, container: block, key });
    }
  }
  return out;
}
