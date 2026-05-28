import { describe, expect, it } from "vitest";
import {
  OPERATOR_INVITE_LINK_VALID_DAYS,
  operatorInviteLinkExpiryHtmlBlock,
  operatorInviteLinkExpiryPlainTextLines,
} from "@/server/email/operator-invite-link-expiry-copy";
import { OPERATOR_CUSTOMER_INVITE_TTL_MS } from "@/server/operator-customer-invite-token";

describe("operatorInviteLinkExpiry copy", () => {
  it("derives day count from invite token TTL", () => {
    expect(OPERATOR_INVITE_LINK_VALID_DAYS).toBe(Math.round(OPERATOR_CUSTOMER_INVITE_TTL_MS / (24 * 60 * 60 * 1000)));
  });

  it("includes expiry duration and early-access resend guidance in plain text", () => {
    const lines = operatorInviteLinkExpiryPlainTextLines("early_access_approval");
    expect(lines[0]).toContain(`${OPERATOR_INVITE_LINK_VALID_DAYS} days`);
    expect(lines[1]).toContain("operator");
  });

  it("includes expiry duration in HTML", () => {
    const html = operatorInviteLinkExpiryHtmlBlock("operator_invite");
    expect(html).toContain(`${OPERATOR_INVITE_LINK_VALID_DAYS} days`);
    expect(html).toContain("invited you");
  });
});
