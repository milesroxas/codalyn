import { describe, expect, it } from "vitest";
import {
  getCurrentSiteLinkNotice,
  resolveCurrentSiteLinkState,
} from "@/features/tower-ui/lib/tower-webflow-integration-status";

describe("resolveCurrentSiteLinkState", () => {
  it("is linked when the current site is among the workspace's authorized sites", () => {
    expect(resolveCurrentSiteLinkState({ webflowOAuthConnected: true, currentSiteLinked: true })).toBe("linked");
  });

  it("needs a relink when connected but the current site is not authorized", () => {
    expect(resolveCurrentSiteLinkState({ webflowOAuthConnected: true, currentSiteLinked: false })).toBe("needs-relink");
  });

  it("needs a connect when the workspace has no Webflow OAuth at all", () => {
    expect(resolveCurrentSiteLinkState({ webflowOAuthConnected: false, currentSiteLinked: false })).toBe(
      "needs-connect"
    );
  });

  it("treats a linked site as linked even if OAuth is reported off (link list is the source of truth)", () => {
    expect(resolveCurrentSiteLinkState({ webflowOAuthConnected: false, currentSiteLinked: true })).toBe("linked");
  });
});

describe("getCurrentSiteLinkNotice", () => {
  it("returns a positive tone only for the linked state", () => {
    expect(getCurrentSiteLinkNotice("linked").tone).toBe("positive");
    expect(getCurrentSiteLinkNotice("needs-relink").tone).toBe("warn");
    expect(getCurrentSiteLinkNotice("needs-connect").tone).toBe("warn");
  });

  it("gives actionable copy for each state", () => {
    expect(getCurrentSiteLinkNotice("needs-relink").detail).toMatch(/relink/i);
    expect(getCurrentSiteLinkNotice("needs-connect").detail).toMatch(/connect webflow/i);
  });
});
