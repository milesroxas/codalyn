import { describe, expect, it } from "vitest";
import { getTeamMinSeats } from "@/server/billing/team-billing-config";

describe("getTeamMinSeats", () => {
  it("defaults to 6 when env unset", () => {
    expect(getTeamMinSeats()).toBe(6);
  });
});
