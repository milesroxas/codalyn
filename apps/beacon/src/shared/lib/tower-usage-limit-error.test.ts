import { describe, expect, it } from "vitest";

import { getTowerUsageLimitFromError, parseTowerUsageLimitBody, TowerUsageLimitError } from "./tower-usage-limit-error";

describe("parseTowerUsageLimitBody", () => {
  it("parses Tower 402 usage limit payloads", () => {
    expect(
      parseTowerUsageLimitBody(
        JSON.stringify({
          error: "usage_limit",
          code: "TOWER_USAGE_LIMIT",
          message: "Monthly usage limit reached for your plan.",
          kind: "image",
          used: 50,
          limit: 50,
        })
      )
    ).toEqual({ kind: "image", used: 50, limit: 50 });
  });

  it("returns null for unrelated JSON", () => {
    expect(parseTowerUsageLimitBody(JSON.stringify({ error: "other" }))).toBeNull();
  });
});

describe("getTowerUsageLimitFromError", () => {
  it("reads details from TowerUsageLimitError", () => {
    const err = new TowerUsageLimitError({ kind: "image", used: 12, limit: 50 });
    expect(getTowerUsageLimitFromError(err)).toEqual({ kind: "image", used: 12, limit: 50 });
  });

  it("reads details from legacy optimize error messages", () => {
    const err = new Error(
      'Tower image optimize failed (402): {"code":"TOWER_USAGE_LIMIT","kind":"image","used":50,"limit":50}'
    );
    expect(getTowerUsageLimitFromError(err)).toEqual({ kind: "image", used: 50, limit: 50 });
  });
});
