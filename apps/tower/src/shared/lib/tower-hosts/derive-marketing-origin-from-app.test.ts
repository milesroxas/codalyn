import { describe, expect, it } from "vitest";

import { deriveMarketingOriginFromTowerAppUrl } from "./derive-marketing-origin-from-app";

describe("deriveMarketingOriginFromTowerAppUrl", () => {
  it("maps production and preview tower app hosts to marketing origins", () => {
    expect(deriveMarketingOriginFromTowerAppUrl("https://tower.codalyn.app")).toBe("https://codalyn.app");
    expect(deriveMarketingOriginFromTowerAppUrl("https://tower-preview.codalyn.app")).toBe(
      "https://preview.codalyn.app"
    );
  });

  it("returns null for non-tower app hosts", () => {
    expect(deriveMarketingOriginFromTowerAppUrl("https://codalyn.app")).toBeNull();
    expect(deriveMarketingOriginFromTowerAppUrl("http://localhost:3100")).toBeNull();
  });
});
