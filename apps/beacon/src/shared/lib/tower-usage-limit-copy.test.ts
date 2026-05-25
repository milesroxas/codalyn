import { describe, expect, it } from "vitest";

import { towerUsageLimitResetDetailLine } from "./tower-usage-limit-copy";

describe("towerUsageLimitResetDetailLine", () => {
  it("shows the first day of the next UTC month", () => {
    expect(towerUsageLimitResetDetailLine(new Date("2026-05-15T12:00:00.000Z"))).toBe("June 1, 2026 · UTC");
  });

  it("rolls the year at December", () => {
    expect(towerUsageLimitResetDetailLine(new Date("2026-12-20T00:00:00.000Z"))).toBe("January 1, 2027 · UTC");
  });
});
