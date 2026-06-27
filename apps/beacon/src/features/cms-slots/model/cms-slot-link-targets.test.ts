import { describe, expect, it } from "vitest";
import {
  buildPageBasePath,
  filterLinkOptions,
  isLinkablePageKind,
  joinCollectionItemPath,
  normalizeRelativePath,
  stripCmsDetailPagePrefix,
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

describe("buildPageBasePath", () => {
  it("builds the base path from the page slug alone when there are no folders", () => {
    expect(buildPageBasePath("blog", [])).toBe("/blog");
  });

  it("prefixes ancestor folder slugs, outermost first", () => {
    expect(buildPageBasePath("blog", ["resources"])).toBe("/resources/blog");
    expect(buildPageBasePath("blog", ["resources", "guides"])).toBe("/resources/guides/blog");
  });

  it("ignores empty/blank slug segments and trims the rest", () => {
    expect(buildPageBasePath("  blog  ", ["", "  ", "resources"])).toBe("/resources/blog");
    expect(buildPageBasePath(null, ["resources"])).toBe("/resources");
  });

  it("returns root when no non-empty segment exists (e.g. the homepage)", () => {
    expect(buildPageBasePath("", [])).toBe("/");
    expect(buildPageBasePath(null, [])).toBe("/");
  });

  it("composes with joinCollectionItemPath to the full detail path, independent of preview context", () => {
    // Regression: the prefix must come from the collection page's own slug, not its previewed item's resolved URL.
    expect(joinCollectionItemPath(buildPageBasePath("blog", []), "embracing-challenges")).toBe(
      "/blog/embracing-challenges"
    );
    expect(joinCollectionItemPath(buildPageBasePath("projects", []), "my-entry")).toBe("/projects/my-entry");
  });
});

describe("stripCmsDetailPagePrefix", () => {
  it("strips Webflow's `detail_` collection-page prefix so the path matches the published URL", () => {
    // Regression: Webflow returns `detail_event`, but the item URL is `/event/<slug>`, not `/detail_event/<slug>`.
    expect(stripCmsDetailPagePrefix("detail_event")).toBe("event");
    expect(stripCmsDetailPagePrefix("  detail_event  ")).toBe("event");
  });

  it("leaves a slug without the prefix unchanged (older sites / non-CMS callers)", () => {
    expect(stripCmsDetailPagePrefix("event")).toBe("event");
    expect(stripCmsDetailPagePrefix("blog")).toBe("blog");
  });

  it("strips only one leading prefix, preserving a slug that itself starts with `detail_`", () => {
    expect(stripCmsDetailPagePrefix("detail_detail_pages")).toBe("detail_pages");
  });

  it("returns null for missing / blank / prefix-only input (no partial application)", () => {
    expect(stripCmsDetailPagePrefix(null)).toBeNull();
    expect(stripCmsDetailPagePrefix(undefined)).toBeNull();
    expect(stripCmsDetailPagePrefix("   ")).toBeNull();
    expect(stripCmsDetailPagePrefix("detail_")).toBeNull();
  });

  it("composes to the corrected full detail path", () => {
    expect(
      joinCollectionItemPath(
        buildPageBasePath(stripCmsDetailPagePrefix("detail_event"), []),
        "design-thinking-symposium-2023"
      )
    ).toBe("/event/design-thinking-symposium-2023");
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
