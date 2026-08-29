import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (tag: string) => revalidateTag(tag) }));

import type { PayloadRequest } from "payload";
import type { Page } from "@/payload-types";
import {
  revalidateCmsHeaderAfterChange,
  revalidateCmsPageAfterChange,
  revalidateCmsPageAfterDelete,
  revalidateCmsTags,
} from "./revalidate-cms-cache";

function makeReq() {
  const warn = vi.fn();
  const req = { payload: { logger: { warn } } } as unknown as PayloadRequest;
  return { req, warn };
}

function page(overrides: Partial<Page>): Page {
  return {
    id: 1,
    title: "Page",
    slug: "pricing",
    _status: "published",
    updatedAt: "",
    createdAt: "",
    ...overrides,
  } as Page;
}

// Hook arg objects carry many Payload internals the hooks never read.
function callAfterChange(args: Record<string, unknown>) {
  return (revalidateCmsPageAfterChange as unknown as (a: Record<string, unknown>) => unknown)(args);
}
function callAfterDelete(args: Record<string, unknown>) {
  return (revalidateCmsPageAfterDelete as unknown as (a: Record<string, unknown>) => unknown)(args);
}
function callHeaderAfterChange(args: Record<string, unknown>) {
  return (revalidateCmsHeaderAfterChange as unknown as (a: Record<string, unknown>) => unknown)(args);
}

beforeEach(() => {
  revalidateTag.mockReset();
});

describe("revalidateCmsTags", () => {
  it("purges every tag", () => {
    const { req } = makeReq();
    revalidateCmsTags(["a", "b"], req);
    expect(revalidateTag.mock.calls.map(([t]) => t)).toEqual(["a", "b"]);
  });

  it("swallows revalidateTag failures outside a Next request scope and warns", () => {
    const { req, warn } = makeReq();
    revalidateTag.mockImplementation(() => {
      throw new Error("static generation store missing");
    });
    expect(() => revalidateCmsTags(["a"], req)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("revalidateCmsPageAfterChange", () => {
  it("purges the collection and slug tags when a page is published", () => {
    const { req } = makeReq();
    const doc = page({ slug: "pricing" });
    expect(callAfterChange({ doc, previousDoc: page({ _status: "draft" }), req, context: {} })).toBe(doc);
    expect(revalidateTag.mock.calls.map(([t]) => t)).toEqual(["cms:pages", "cms:page:pricing"]);
  });

  it("purges the old slug too when a published page is renamed", () => {
    const { req } = makeReq();
    callAfterChange({ doc: page({ slug: "plans" }), previousDoc: page({ slug: "pricing" }), req, context: {} });
    expect(revalidateTag.mock.calls.map(([t]) => t)).toEqual(["cms:pages", "cms:page:plans", "cms:page:pricing"]);
  });

  it("purges on unpublish", () => {
    const { req } = makeReq();
    callAfterChange({ doc: page({ _status: "draft" }), previousDoc: page({ _status: "published" }), req, context: {} });
    expect(revalidateTag.mock.calls.map(([t]) => t)).toEqual(["cms:pages", "cms:page:pricing"]);
  });

  it("touches nothing for a draft-only save of a never-published page", () => {
    const { req } = makeReq();
    callAfterChange({ doc: page({ _status: "draft" }), previousDoc: undefined, req, context: {} });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("honors context.disableRevalidate", () => {
    const { req } = makeReq();
    callAfterChange({ doc: page({}), previousDoc: undefined, req, context: { disableRevalidate: true } });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("revalidateCmsPageAfterDelete", () => {
  it("purges the collection and slug tags", () => {
    const { req } = makeReq();
    const doc = page({ slug: "pricing" });
    expect(callAfterDelete({ doc, req, context: {} })).toBe(doc);
    expect(revalidateTag.mock.calls.map(([t]) => t)).toEqual(["cms:pages", "cms:page:pricing"]);
  });
});

describe("revalidateCmsHeaderAfterChange", () => {
  it("purges the header tag", () => {
    const { req } = makeReq();
    const doc = { id: 1 };
    expect(callHeaderAfterChange({ doc, req, context: {} })).toBe(doc);
    expect(revalidateTag.mock.calls.map(([t]) => t)).toEqual(["cms:header"]);
  });

  it("honors context.disableRevalidate", () => {
    const { req } = makeReq();
    callHeaderAfterChange({ doc: { id: 1 }, req, context: { disableRevalidate: true } });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
