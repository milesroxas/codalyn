import { describe, expect, it } from "vitest";
import { CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_KEYS } from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";
import { CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME } from "@/features/cms-slots/model/cms-slot-list-target-slot-style";
import { getCmsSlotPageInlineScriptSource } from "@/features/cms-slots/model/cms-slot-page-inline-script";

function runCmsSlotBeaconRuntime(doc: Document): void {
  const win = doc.defaultView;
  if (win == null) {
    throw new Error("document.defaultView required");
  }
  const source = getCmsSlotPageInlineScriptSource();
  const run = new Function("document", "window", "addEventListener", "globalThis", source) as (
    document: Document,
    window: Window,
    addEventListener: Window["addEventListener"],
    globalThis: Window
  ) => void;
  run(doc, win, win.addEventListener.bind(win), win);
}

describe("getCmsSlotPageInlineScriptSource", () => {
  it("parses in JS", () => {
    const s = getCmsSlotPageInlineScriptSource();
    expect(() => {
      void new Function("document", "window", "addEventListener", s);
    }).not.toThrow();
  });

  it("strips designer placeholder inline styles on list target reveal", () => {
    const s = getCmsSlotPageInlineScriptSource();
    for (const key of CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_KEYS) {
      expect(s).toContain(`"${key}"`);
    }
    expect(s).toContain("removeProperty");
  });

  it("applies display contents layout on list target reveal", () => {
    const s = getCmsSlotPageInlineScriptSource();
    expect(s).toContain(`classList.add("${CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME}")`);
    expect(s).toContain('setProperty("display","contents","important")');
  });
});

/** @vitest-environment jsdom */
describe("cms slot beacon runtime (published DOM)", () => {
  const LIST = "beacon-nested-clone-test";

  function mountListFixture(payloadJson: string): { target: HTMLDivElement } {
    const doc = document;
    const source = doc.createElement("div");
    source.setAttribute("data-target", "beacons");
    source.setAttribute("data-list", LIST);

    const row = doc.createElement("div");
    row.className = "row-template";
    const nested = doc.createElement("div");
    nested.className = "nested-component";
    const title = doc.createElement("h2");
    title.setAttribute("data-codalyn-beacon-prop", "parent-title");
    title.textContent = "Designer placeholder";
    const inner = doc.createElement("div");
    const imgSlot = doc.createElement("span");
    imgSlot.setAttribute("data-codalyn-beacon-prop", "parent-img");
    imgSlot.textContent = "img placeholder";
    inner.appendChild(imgSlot);
    nested.appendChild(title);
    nested.appendChild(inner);
    row.appendChild(nested);
    source.appendChild(row);

    const target = doc.createElement("div");
    target.setAttribute("data-beacon-target", "list");
    target.setAttribute("data-list", LIST);
    target.textContent = payloadJson;

    doc.body.append(source, target);
    return { target };
  }

  it("deep-clones nested component markup and applies per-row props inside nested nodes", () => {
    const payload = JSON.stringify({
      v: 2,
      i: [0],
      p: [{ "parent-title": "Row A title" }],
    });
    const { target } = mountListFixture(payload);
    runCmsSlotBeaconRuntime(document);

    expect(target.children.length).toBe(1);
    const clonedRow = target.children[0];
    const nested = clonedRow?.querySelector(".nested-component");
    expect(nested).not.toBeNull();
    expect(nested).not.toBe(document.querySelector("[data-target=beacons] .nested-component"));

    const title = clonedRow?.querySelector<HTMLHeadingElement>("[data-codalyn-beacon-prop='parent-title']");
    expect(title?.textContent).toBe("Row A title");
    expect(title?.hasAttribute("hidden")).toBe(false);

    const imgSlot = clonedRow?.querySelector("[data-codalyn-beacon-prop='parent-img']");
    expect(imgSlot?.hasAttribute("hidden")).toBe(true);
  });

  it("clones the same nested template twice with independent prop payloads", () => {
    const payload = JSON.stringify({
      v: 2,
      i: [0, 0],
      p: [{ "parent-title": "First" }, { "parent-title": "Second" }],
    });
    const { target } = mountListFixture(payload);
    runCmsSlotBeaconRuntime(document);

    expect(target.children.length).toBe(2);
    const titles = [...target.querySelectorAll<HTMLHeadingElement>("[data-codalyn-beacon-prop='parent-title']")];
    expect(titles.map((el) => el.textContent)).toEqual(["First", "Second"]);
    expect(titles[0]).not.toBe(titles[1]);
  });
});
