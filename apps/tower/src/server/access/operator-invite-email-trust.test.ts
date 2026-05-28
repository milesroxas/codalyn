import { describe, expect, it } from "vitest";
import { isValidOperatorInviteForEmail } from "@/server/access/operator-invite-email-trust";
import { signOperatorCustomerInviteToken } from "@/server/operator-customer-invite-token";

describe("isValidOperatorInviteForEmail", () => {
  it("accepts a valid token for the invited email", () => {
    const token = signOperatorCustomerInviteToken("User@Example.com");
    expect(isValidOperatorInviteForEmail(token, "user@example.com")).toBe(true);
  });

  it("rejects email mismatch", () => {
    const token = signOperatorCustomerInviteToken("user@example.com");
    expect(isValidOperatorInviteForEmail(token, "other@example.com")).toBe(false);
  });

  it("rejects invalid tokens", () => {
    expect(isValidOperatorInviteForEmail("not-a-token", "user@example.com")).toBe(false);
  });
});
