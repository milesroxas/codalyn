import { describe, expect, it } from "vitest";
import {
  formatEarlyAccessReferralNote,
  parseEarlyAccessReferralRequestInput,
  parseEarlyAccessReferralSourceInput,
} from "@/shared/lib/access/referral-source";

describe("parseEarlyAccessReferralSourceInput", () => {
  it("accepts known source values", () => {
    expect(parseEarlyAccessReferralSourceInput("youtube")).toBe("youtube");
    expect(parseEarlyAccessReferralSourceInput("other")).toBe("other");
  });

  it("rejects unknown or malformed values", () => {
    expect(parseEarlyAccessReferralSourceInput("YouTube")).toBeNull();
    expect(parseEarlyAccessReferralSourceInput("")).toBeNull();
    expect(parseEarlyAccessReferralSourceInput(null)).toBeNull();
  });
});

describe("formatEarlyAccessReferralNote", () => {
  it("uses the display label for known sources", () => {
    expect(formatEarlyAccessReferralNote("linkedin")).toBe("LinkedIn");
  });

  it("requires detail for other", () => {
    expect(formatEarlyAccessReferralNote("other", "  Podcast  ")).toBe("Other: Podcast");
    expect(formatEarlyAccessReferralNote("other", "   ")).toBeNull();
    expect(formatEarlyAccessReferralNote("other")).toBeNull();
  });
});

describe("parseEarlyAccessReferralRequestInput", () => {
  it("returns note for valid source", () => {
    expect(parseEarlyAccessReferralRequestInput({ referralSource: "webflow" })).toEqual({ note: "Webflow" });
  });

  it("returns note for other with detail", () => {
    expect(parseEarlyAccessReferralRequestInput({ referralSource: "other", referralOther: "Conference" })).toEqual({
      note: "Other: Conference",
    });
  });

  it("returns errors for invalid input", () => {
    expect(parseEarlyAccessReferralRequestInput({ referralSource: "other" })).toEqual({
      error: "invalid_referral_other",
    });
    expect(parseEarlyAccessReferralRequestInput({ referralSource: "podcast" })).toEqual({
      error: "invalid_referral",
    });
  });
});
