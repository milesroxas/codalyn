import { describe, expect, it } from "vitest";
import {
  buildWebflowDesignerAppDeepLink,
  buildWebflowDesignerCanvasUrl,
  normalizeWebflowSiteShortName,
  resolveWebflowDesignerOpenLinks,
} from "./designer-deep-link.js";

describe("normalizeWebflowSiteShortName", () => {
  it("accepts canonical short names", () => {
    expect(normalizeWebflowSiteShortName("My-Marketing-Site")).toBe("my-marketing-site");
  });

  it("rejects empty and invalid characters", () => {
    expect(normalizeWebflowSiteShortName("")).toBeNull();
    expect(normalizeWebflowSiteShortName("   ")).toBeNull();
    expect(normalizeWebflowSiteShortName("site name")).toBeNull();
    expect(normalizeWebflowSiteShortName("../evil")).toBeNull();
  });
});

describe("buildWebflowDesignerCanvasUrl", () => {
  it("builds the designer canvas URL", () => {
    expect(buildWebflowDesignerCanvasUrl("Acme-Site")).toBe("https://acme-site.design.webflow.com");
  });
});

describe("buildWebflowDesignerAppDeepLink", () => {
  it("builds the documented app deep link", () => {
    expect(
      buildWebflowDesignerAppDeepLink({
        shortName: "acme-site",
        appClientId: "client_123",
      })
    ).toBe("https://acme-site.design.webflow.com/?app=client_123");
  });

  it("returns null when short name or client id is missing", () => {
    expect(buildWebflowDesignerAppDeepLink({ shortName: "acme", appClientId: "" })).toBeNull();
    expect(buildWebflowDesignerAppDeepLink({ shortName: "", appClientId: "client_123" })).toBeNull();
  });
});

describe("resolveWebflowDesignerOpenLinks", () => {
  it("returns both open URLs when inputs are valid", () => {
    expect(
      resolveWebflowDesignerOpenLinks({
        shortName: "acme-site",
        appClientId: "client_123",
      })
    ).toEqual({
      shortName: "acme-site",
      openWithAppUrl: "https://acme-site.design.webflow.com/?app=client_123",
      openDesignerUrl: "https://acme-site.design.webflow.com",
    });
  });
});
