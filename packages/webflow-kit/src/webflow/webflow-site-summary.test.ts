import { describe, expect, it } from "vitest";
import { parseWebflowSiteSummaries, parseWebflowSiteSummary } from "./webflow-site-summary.js";

describe("parseWebflowSiteSummary", () => {
  it("parses canonical Webflow site shapes", () => {
    expect(
      parseWebflowSiteSummary({
        id: "site_1",
        displayName: "Marketing",
        shortName: "My-Marketing-Site",
      })
    ).toEqual({
      id: "site_1",
      displayName: "Marketing",
      shortName: "my-marketing-site",
    });
  });

  it("rejects missing ids and invalid short names", () => {
    expect(parseWebflowSiteSummary({ displayName: "Marketing" })).toBeNull();
    expect(parseWebflowSiteSummary({ id: "site_1", shortName: "../evil" })).toEqual({ id: "site_1" });
  });
});

describe("parseWebflowSiteSummaries", () => {
  it("parses list responses and drops invalid entries", () => {
    expect(
      parseWebflowSiteSummaries({
        sites: [{ id: "site_1", displayName: "Marketing", shortName: "marketing-site" }, { displayName: "Missing id" }],
      })
    ).toEqual([{ id: "site_1", displayName: "Marketing", shortName: "marketing-site" }]);
  });
});
