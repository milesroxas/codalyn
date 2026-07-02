import { describe, expect, it } from "vitest";

import {
  isTowerMarketingInnerPagePath,
  isTowerMarketingPublicPath,
  isTowerMarketingSelfContainedPath,
  isTowerPublicFooterPath,
} from "@/shared/lib/navigation/tower-marketing-paths";

describe("tower marketing paths", () => {
  it("recognizes marketing public paths", () => {
    expect(isTowerMarketingPublicPath("/")).toBe(true);
    expect(isTowerMarketingPublicPath("/beacon")).toBe(true);
    expect(isTowerMarketingPublicPath("/flint")).toBe(true);
    expect(isTowerMarketingPublicPath("/tower")).toBe(true);
    expect(isTowerMarketingPublicPath("/support")).toBe(true);
    expect(isTowerMarketingPublicPath("/terms")).toBe(true);
    expect(isTowerMarketingPublicPath("/privacy")).toBe(true);
    expect(isTowerMarketingPublicPath("/account")).toBe(false);
  });

  it("recognizes self-contained marketing pages", () => {
    expect(isTowerMarketingSelfContainedPath("/")).toBe(true);
    expect(isTowerMarketingSelfContainedPath("/beacon")).toBe(true);
    expect(isTowerMarketingSelfContainedPath("/flint")).toBe(true);
    expect(isTowerMarketingSelfContainedPath("/tower")).toBe(true);
    expect(isTowerMarketingSelfContainedPath("/sign-in")).toBe(false);
  });

  it("recognizes marketing inner pages", () => {
    expect(isTowerMarketingInnerPagePath("/terms")).toBe(true);
    expect(isTowerMarketingInnerPagePath("/privacy")).toBe(true);
    expect(isTowerMarketingInnerPagePath("/tower")).toBe(false);
    expect(isTowerMarketingInnerPagePath("/sign-in")).toBe(false);
  });

  it("recognizes public footer paths", () => {
    expect(isTowerPublicFooterPath("/")).toBe(true);
    expect(isTowerPublicFooterPath("/tower")).toBe(true);
    expect(isTowerPublicFooterPath("/terms")).toBe(true);
    expect(isTowerPublicFooterPath("/privacy")).toBe(true);
    expect(isTowerPublicFooterPath("/sign-in")).toBe(false);
  });
});
