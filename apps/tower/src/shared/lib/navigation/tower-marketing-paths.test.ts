import { describe, expect, it } from "vitest";

import {
  isLegacyTowerCmsPagePath,
  isTowerCmsPagePath,
  isTowerCmsRootPagePath,
  isTowerMarketingInnerPagePath,
  isTowerMarketingPublicPath,
  isTowerMarketingSelfContainedPath,
  isTowerPublicFooterPath,
  isValidTowerCmsPageSlug,
  towerCmsPagePath,
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

  it("recognizes legacy CMS page paths", () => {
    expect(isLegacyTowerCmsPagePath("/p/spring-launch")).toBe(true);
    expect(isLegacyTowerCmsPagePath("/p/a")).toBe(true);
    expect(isLegacyTowerCmsPagePath("/p")).toBe(false);
    expect(isLegacyTowerCmsPagePath("/p/")).toBe(false);
    expect(isLegacyTowerCmsPagePath("/privacy")).toBe(false);
    expect(isLegacyTowerCmsPagePath("/px/foo")).toBe(false);
  });

  it("recognizes root-level CMS page candidates", () => {
    expect(isTowerCmsRootPagePath("/spring-launch")).toBe(true);
    expect(isTowerCmsRootPagePath("/pricing")).toBe(true);
    expect(isTowerCmsRootPagePath("/a")).toBe(true);
    expect(isTowerCmsRootPagePath("/")).toBe(false);
    expect(isTowerCmsRootPagePath("/spring-launch/deep")).toBe(false);
    expect(isTowerCmsRootPagePath("/Spring-Launch")).toBe(false);
    expect(isTowerCmsRootPagePath("spring-launch")).toBe(false);
  });

  it("never treats reserved app segments as CMS pages", () => {
    for (const reserved of ["/sign-in", "/account", "/dashboard", "/admin", "/api", "/p", "/beacon", "/tower"]) {
      expect(isTowerCmsRootPagePath(reserved)).toBe(false);
    }
  });

  it("recognizes CMS page paths in both namespaces", () => {
    expect(isTowerCmsPagePath("/p/spring-launch")).toBe(true);
    expect(isTowerCmsPagePath("/spring-launch")).toBe(true);
    expect(isTowerCmsPagePath("/privacy")).toBe(false);
    expect(isTowerCmsPagePath("/px/foo")).toBe(false);
  });

  it("builds canonical root URLs for CMS pages", () => {
    expect(towerCmsPagePath("spring-launch")).toBe("/spring-launch");
  });

  it("treats CMS pages as marketing public, inner, and footer paths", () => {
    for (const path of ["/p/spring-launch", "/spring-launch"]) {
      expect(isTowerMarketingPublicPath(path)).toBe(true);
      expect(isTowerMarketingInnerPagePath(path)).toBe(true);
      expect(isTowerPublicFooterPath(path)).toBe(true);
      expect(isTowerMarketingSelfContainedPath(path)).toBe(false);
    }
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
