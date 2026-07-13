import { describe, expect, it } from "vitest";

import {
  isTowerCmsPagePath,
  isTowerMarketingInnerPagePath,
  isTowerMarketingPublicPath,
  isTowerMarketingSelfContainedPath,
  isTowerPublicFooterPath,
  isValidTowerCmsPageSlug,
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

  it("recognizes CMS page paths", () => {
    expect(isTowerCmsPagePath("/p/spring-launch")).toBe(true);
    expect(isTowerCmsPagePath("/p/a")).toBe(true);
    expect(isTowerCmsPagePath("/p")).toBe(false);
    expect(isTowerCmsPagePath("/p/")).toBe(false);
    expect(isTowerCmsPagePath("/privacy")).toBe(false);
    expect(isTowerCmsPagePath("/px/foo")).toBe(false);
  });

  it("treats CMS pages as marketing public, inner, and footer paths", () => {
    expect(isTowerMarketingPublicPath("/p/spring-launch")).toBe(true);
    expect(isTowerMarketingInnerPagePath("/p/spring-launch")).toBe(true);
    expect(isTowerPublicFooterPath("/p/spring-launch")).toBe(true);
    expect(isTowerMarketingSelfContainedPath("/p/spring-launch")).toBe(false);
  });

  it("validates CMS page slugs", () => {
    expect(isValidTowerCmsPageSlug("spring-launch")).toBe(true);
    expect(isValidTowerCmsPageSlug("a1-b2-c3")).toBe(true);
    expect(isValidTowerCmsPageSlug("a")).toBe(true);
    expect(isValidTowerCmsPageSlug("")).toBe(false);
    expect(isValidTowerCmsPageSlug("Spring-Launch")).toBe(false);
    expect(isValidTowerCmsPageSlug("a_b")).toBe(false);
    expect(isValidTowerCmsPageSlug("-a")).toBe(false);
    expect(isValidTowerCmsPageSlug("a-")).toBe(false);
    expect(isValidTowerCmsPageSlug("a--b")).toBe(false);
    expect(isValidTowerCmsPageSlug("a/b")).toBe(false);
    expect(isValidTowerCmsPageSlug("a b")).toBe(false);
  });
});
