import { afterEach, describe, expect, it, vi } from "vitest";
import { CODALYN_EXTERNAL_LINK_REL, codalynPolicyLinkProps } from "./codalyn-links";

const towerOrigin = vi.hoisted(() => ({ value: "https://tower.test" }));

vi.mock("@/shared/lib/beacon-tower-origin", () => ({
  readBeaconTowerOrigin: () => towerOrigin.value.replace(/\/$/, ""),
  isBeaconTowerOriginConfigured: () => towerOrigin.value.length > 0,
}));

describe("codalynPolicyLinkProps", () => {
  afterEach(() => {
    towerOrigin.value = "https://tower.test";
  });

  it.each([
    ["privacy", "https://tower.codalyn.app/privacy"],
    ["terms", "https://tower.codalyn.app/terms"],
    ["docs", "https://tower.codalyn.app/docs"],
    ["pricing", "https://tower.codalyn.app/pricing"],
  ] as const)("renders the %s page as a new-tab anchor on the Tower origin with no opener and no referrer", (page, href) => {
    towerOrigin.value = "https://tower.codalyn.app/";
    expect(codalynPolicyLinkProps(page)).toEqual({ href, target: "_blank", rel: "noopener noreferrer" });
  });

  it("pins the rel value every external anchor must carry", () => {
    expect(CODALYN_EXTERNAL_LINK_REL.split(" ").sort()).toEqual(["noopener", "noreferrer"]);
  });

  it("follows the build's Tower origin rather than naming a host of its own", () => {
    towerOrigin.value = "https://tower.preview.example";
    for (const page of ["privacy", "terms", "docs", "pricing"] as const) {
      expect(new URL(codalynPolicyLinkProps(page).href).origin).toBe("https://tower.preview.example");
    }
  });
});
