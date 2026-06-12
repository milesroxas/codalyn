import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  appendComponentDefinitionToPageBody,
  findComponentInstanceByDefinitionIdOnPage,
  withPageComponentInstanceForDefinitionWork,
} from "./page-component-instance-for-preset-work";

function mockWebflowPage(children: unknown[], webflowOverrides: Record<string, unknown> = {}) {
  const body = {
    type: "Body",
    id: { component: "page_1", element: "body_1" },
    getChildren: vi.fn().mockResolvedValue(children),
  };
  return {
    body,
    webflow: {
      getAllElements: vi.fn().mockResolvedValue([body, ...children]),
      ...webflowOverrides,
    },
  };
}

vi.mock("@/shared/lib/component-definition-scope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/component-definition-scope")>();
  return {
    ...actual,
    preparePageCanvasForWork: vi.fn().mockResolvedValue(undefined),
    withComponentDefinitionScope: vi.fn(async (_instance, fn) =>
      fn({
        instance: { type: "ComponentInstance" } as ComponentElement,
        definition: { id: "cmp_1" } as Component,
        definitionRoot: null,
      })
    ),
    exitCurrentComponentIfAny: vi.fn().mockResolvedValue(undefined),
  };
});

describe("page-component-instance-for-preset-work", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds a matching component instance on the page", async () => {
    const instance = {
      type: "ComponentInstance",
      id: { component: "page_1", element: "inst_1" },
      getComponent: vi.fn().mockResolvedValue({ id: "cmp_1" }),
      getChildren: vi.fn().mockResolvedValue([]),
      getSlots: vi.fn().mockResolvedValue([]),
    };
    const { webflow } = mockWebflowPage([instance]);
    vi.stubGlobal("webflow", webflow);

    await expect(findComponentInstanceByDefinitionIdOnPage("cmp_1")).resolves.toBe(instance);
  });

  it("appends a component definition to the page body", async () => {
    const definition = { id: "cmp_1" };
    const created = { type: "ComponentInstance", id: { component: "page_1", element: "inst_new" } };
    const body = {
      type: "Body",
      append: vi.fn().mockResolvedValue(created),
    };
    vi.stubGlobal("webflow", {
      getComponent: vi.fn().mockResolvedValue(definition),
      getAllElements: vi.fn().mockResolvedValue([body]),
    });

    await expect(appendComponentDefinitionToPageBody("cmp_1")).resolves.toBe(created);
    expect(body.append).toHaveBeenCalledWith(definition);
  });

  it("reuses an existing page instance without removing it", async () => {
    const existing = {
      type: "ComponentInstance",
      id: { component: "page_1", element: "inst_1" },
      remove: vi.fn(),
      getComponent: vi.fn().mockResolvedValue({ id: "cmp_1" }),
      getChildren: vi.fn().mockResolvedValue([]),
      getSlots: vi.fn().mockResolvedValue([]),
    };
    const { webflow } = mockWebflowPage([existing]);
    vi.stubGlobal("webflow", webflow);

    const fn = vi.fn().mockResolvedValue("ok");
    await expect(
      withPageComponentInstanceForDefinitionWork({
        componentDefinitionId: "cmp_1",
        pageIdHint: "page_1",
        fn,
      })
    ).resolves.toBe("ok");

    expect(fn).toHaveBeenCalledTimes(1);
    expect(existing.remove).not.toHaveBeenCalled();
  });

  it("removes a temporarily placed instance after work completes", async () => {
    const created = {
      type: "ComponentInstance",
      id: { component: "page_1", element: "inst_new" },
      remove: vi.fn().mockResolvedValue(undefined),
      getChildren: vi.fn().mockResolvedValue([]),
      getSlots: vi.fn().mockResolvedValue([]),
    };
    const body = {
      type: "Body",
      id: { component: "page_1", element: "body_1" },
      append: vi.fn().mockResolvedValue(created),
    };
    vi.stubGlobal("webflow", {
      getComponent: vi.fn().mockResolvedValue({ id: "cmp_1" }),
      getAllElements: vi.fn().mockResolvedValue([body]),
    });

    await withPageComponentInstanceForDefinitionWork({
      componentDefinitionId: "cmp_1",
      pageIdHint: "page_1",
      fn: async () => undefined,
    });

    expect(body.append).toHaveBeenCalledTimes(1);
    expect(created.remove).toHaveBeenCalledTimes(1);
  });
});
