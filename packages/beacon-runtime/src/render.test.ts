import { describe, expect, it } from "vitest";
import { parseComposition } from "./parse-composition";
import { render } from "./render";

function makePage(bankHtml: string, slotAttrs: string, compositionJson: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = `
    <div data-beacon-bank style="display:none">${bankHtml}</div>
    <div ${slotAttrs} data-composition='${compositionJson.replace(/'/g, "&#39;")}'></div>
  `;
  return container;
}

describe("parseComposition", () => {
  it("returns empty on null/empty/invalid", () => {
    expect(parseComposition(null).slots).toEqual({});
    expect(parseComposition("").slots).toEqual({});
    expect(parseComposition("not json").slots).toEqual({});
  });

  it("parses multi-slot composition", () => {
    const json = JSON.stringify({
      v: 1,
      slots: {
        main: [{ id: "b1", componentId: "c1", overrides: { title: "Hello" } }],
      },
    });
    const parsed = parseComposition(json);
    expect(parsed.slots.main).toHaveLength(1);
    expect(parsed.slots.main[0].componentId).toBe("c1");
    expect(parsed.slots.main[0].overrides.title).toBe("Hello");
  });

  it("drops blocks without componentId", () => {
    const json = JSON.stringify({ v: 1, slots: { main: [{ id: "b1" }, { componentId: "c2" }] } });
    const parsed = parseComposition(json);
    expect(parsed.slots.main).toHaveLength(1);
    expect(parsed.slots.main[0].componentId).toBe("c2");
  });
});

describe("render", () => {
  it("clones component from bank into slot with text override", () => {
    const bankHtml = `
      <div data-beacon-component="cmp_a">
        <h2 data-beacon-field="title">Placeholder</h2>
      </div>
    `;
    const composition = JSON.stringify({
      v: 1,
      slots: { main: [{ id: "b1", componentId: "cmp_a", overrides: { title: "Hello World" } }] },
    });
    const root = makePage(bankHtml, 'data-beacon-slot="main"', composition);
    document.body.innerHTML = "";
    document.body.appendChild(root);

    render({ root: document });

    const slot = root.querySelector('[data-beacon-slot="main"]');
    expect(slot?.querySelector("h2")?.textContent).toBe("Hello World");
    expect(slot?.hasAttribute("data-beacon-rendered")).toBe(true);
  });

  it("applies image-src override on img tag", () => {
    const bankHtml = `
      <div data-beacon-component="cmp_b">
        <img data-beacon-field="hero" src="placeholder.jpg" alt="">
      </div>
    `;
    const composition = JSON.stringify({
      v: 1,
      slots: { main: [{ id: "b1", componentId: "cmp_b", overrides: { hero: "real.jpg" } }] },
    });
    const root = makePage(bankHtml, 'data-beacon-slot="main"', composition);
    document.body.innerHTML = "";
    document.body.appendChild(root);

    render({ root: document });

    const img = root.querySelector('[data-beacon-slot="main"] img') as HTMLImageElement;
    expect(img.src).toContain("real.jpg");
  });

  it("warns and skips missing components", () => {
    const bankHtml = `<div data-beacon-component="cmp_a"></div>`;
    const composition = JSON.stringify({
      v: 1,
      slots: { main: [{ id: "b1", componentId: "missing" }] },
    });
    const root = makePage(bankHtml, 'data-beacon-slot="main"', composition);
    document.body.innerHTML = "";
    document.body.appendChild(root);

    const warnings: string[] = [];
    render({ root: document, warn: (m) => warnings.push(m) });

    expect(warnings.some((w) => w.includes("missing"))).toBe(true);
  });

  it("hides bank after render", () => {
    const bankHtml = `<div data-beacon-component="cmp_a"></div>`;
    const composition = JSON.stringify({ v: 1, slots: {} });
    const root = makePage(bankHtml, 'data-beacon-slot="main"', composition);
    document.body.innerHTML = "";
    document.body.appendChild(root);

    render({ root: document });

    const bank = root.querySelector("[data-beacon-bank]") as HTMLElement;
    expect(bank.style.display).toBe("none");
    expect(bank.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders multiple slots independently", () => {
    const bankHtml = `
      <div data-beacon-component="cmp_a"><span data-beacon-field="v">x</span></div>
    `;
    const composition = JSON.stringify({
      v: 1,
      slots: {
        main: [{ id: "b1", componentId: "cmp_a", overrides: { v: "M" } }],
        aside: [{ id: "b2", componentId: "cmp_a", overrides: { v: "A" } }],
      },
    });
    const container = document.createElement("div");
    container.innerHTML = `
      <div data-beacon-bank>${bankHtml}</div>
      <div data-beacon-slot="main" data-composition='${composition}'></div>
      <div data-beacon-slot="aside" data-composition='${composition}'></div>
    `;
    document.body.innerHTML = "";
    document.body.appendChild(container);

    render({ root: document });

    expect(container.querySelector('[data-beacon-slot="main"] span')?.textContent).toBe("M");
    expect(container.querySelector('[data-beacon-slot="aside"] span')?.textContent).toBe("A");
  });
});
