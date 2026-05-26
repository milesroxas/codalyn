import { describe, expect, it } from "vitest";
import {
  assertOrganizationNotOverSeatCap,
  assertOrganizationSeatAvailable,
} from "@/server/billing/organization-seat-count";

describe("organization seat assertions", () => {
  it("exports server seat gates for organization hooks", () => {
    expect(typeof assertOrganizationSeatAvailable).toBe("function");
    expect(typeof assertOrganizationNotOverSeatCap).toBe("function");
  });
});
