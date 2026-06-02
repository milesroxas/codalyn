import { describe, expect, it } from "vitest";
import {
  isTowerPlanKey,
  normalizeTowerPlanKey,
  TOWER_PLAN_KEYS,
  towerIndividualOwnedWorkspaceAllowance,
  towerPlanBillingScope,
  towerPlanName,
  towerPlanUsesPooledUsage,
} from "./tower-plan-catalog.js";

describe("tower plan catalog", () => {
  it("exposes the four MVP plan keys", () => {
    expect(TOWER_PLAN_KEYS).toEqual(["free", "pro", "studio", "team"]);
  });

  it("maps plan keys to marketing names", () => {
    expect(towerPlanName("free")).toBe("Free");
    expect(towerPlanName("pro")).toBe("Pro");
    expect(towerPlanName("studio")).toBe("Studio");
    expect(towerPlanName("team")).toBe("Team");
  });

  it("scopes individual plans to user and team to workspace", () => {
    expect(towerPlanBillingScope("pro")).toBe("user");
    expect(towerPlanBillingScope("studio")).toBe("user");
    expect(towerPlanBillingScope("team")).toBe("workspace");
  });

  it("grants owned-workspace allowance from the individual plan only", () => {
    expect(towerIndividualOwnedWorkspaceAllowance("free")).toBe(1);
    expect(towerIndividualOwnedWorkspaceAllowance("pro")).toBe(3);
    expect(towerIndividualOwnedWorkspaceAllowance("studio")).toBe(10);
  });

  it("pools usage only for the workspace-scoped Team plan", () => {
    expect(towerPlanUsesPooledUsage("free")).toBe(false);
    expect(towerPlanUsesPooledUsage("pro")).toBe(false);
    expect(towerPlanUsesPooledUsage("studio")).toBe(false);
    expect(towerPlanUsesPooledUsage("team")).toBe(true);
  });

  it("validates and normalizes plan keys", () => {
    expect(isTowerPlanKey("studio")).toBe(true);
    expect(isTowerPlanKey("enterprise")).toBe(false);
    expect(normalizeTowerPlanKey("studio")).toBe("studio");
    expect(normalizeTowerPlanKey("enterprise")).toBeNull();
    expect(normalizeTowerPlanKey(42)).toBeNull();
  });
});
