import { describe, expect, it } from "vitest";
import {
  collectionTemplatePrefixFromPublishPath,
  filterLinkOptions,
  isLinkablePageKind,
  joinCollectionItemPath,
  normalizeRelativePath,
} from "@/features/cms-slots/model/cms-slot-link-targets";

describe("isLinkablePageKind", () => {
  it("accepts fixed-URL pages and rejects CMS collection / template / system pages", () => {
    expect(isLinkablePageKind("static")).toBe(true);
    expect(isLinkablePageKind("ecommerce")).toBe(true);
    // CMS collection pages have no standalone URL — their entries are linked via the CMS tab, not the Page picker.
    expect(isLinkablePageKind("cms")).toBe(false);
    expect(isLinkablePageKind("staticTemplate")).toBe(false);
    expect(isLinkablePageKind("userSystems")).toBe(false);
    expect(isLinkablePageKind("utility")).toBe(false);
  });
});

describe("normalizeRelativePath", () => {
  it("forces a single leading slash and strips trailing slashes", () => {
    expect(normalizeRelativePath("about")).toBe("/about");
    expect(normalizeRelativePath("/about/")).toBe("/about");
    expect(normalizeRelativePath("//blog//post//")).toBe("/blog/post");
    expect(normalizeRelativePath("/")).toBe("/");
  });

  it("returns null for missing / blank input", () => {
    expect(normalizeRelativePath(null)).toBeNull();
    expect(normalizeRelativePath(undefined)).toBeNull();
    expect(normalizeRelativePath("   ")).toBeNull();
  });
});

describe("joinCollectionItemPath", () => {
  it("builds a site-relative detail path from template path + slug", () => {
    expect(joinCollectionItemPath("/blog", "my-post")).toBe("/blog/my-post");
    expect(joinCollectionItemPath("/blog/", "/my-post/")).toBe("/blog/my-post");
    expect(joinCollectionItemPath("blog", "my-post")).toBe("/blog/my-post");
  });

  it("returns null when either part is missing (no partial application)", () => {
    expect(joinCollectionItemPath(null, "my-post")).toBeNull();
    expect(joinCollectionItemPath("/blog", "")).toBeNull();
    expect(joinCollectionItemPath("", "my-post")).toBeNull();
  });
});

describe("collectionTemplatePrefixFromPublishPath", () => {
  it("drops the live item-slug segment Webflow appends to a collection page's publish path", () => {
    // Regression: getPublishPath resolves against the item previewed in the Designer, so the prefix must exclude it.
    expect(collectionTemplatePrefixFromPublishPath("/blog/the-power-of-resilience")).toBe("/blog");
    expect(collectionTemplatePrefixFromPublishPath("/resources/blog/some-post")).toBe("/resources/blog");
    expect(collectionTemplatePrefixFromPublishPath("//blog//some-post//")).toBe("/blog");
  });

  it("yields root for a single-segment detail path (collection mounted at the site root)", () => {
    expect(collectionTemplatePrefixFromPublishPath("/some-post")).toBe("/");
  });

  it("returns null when there is no resolvable prefix", () => {
    expect(collectionTemplatePrefixFromPublishPath(null)).toBeNull();
    expect(collectionTemplatePrefixFromPublishPath("/")).toBeNull();
    expect(collectionTemplatePrefixFromPublishPath("   ")).toBeNull();
  });
});

describe("filterLinkOptions", () => {
  const opts = [
    { id: "1", name: "About", path: "/about" },
    { id: "2", name: "Blog", path: "/blog" },
    { id: "3", name: "Contact us", path: "/contact" },
  ];

  it("returns all when the query is blank", () => {
    expect(filterLinkOptions(opts, "  ")).toHaveLength(3);
  });

  it("matches name or path, case-insensitively", () => {
    expect(filterLinkOptions(opts, "ABOUT").map((o) => o.id)).toEqual(["1"]);
    expect(filterLinkOptions(opts, "/blog").map((o) => o.id)).toEqual(["2"]);
    expect(filterLinkOptions(opts, "us").map((o) => o.id)).toEqual(["3"]);
  });
});
