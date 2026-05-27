export const EARLY_ACCESS_REFERRAL_SOURCE_OPTIONS = [
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "webflow", label: "Webflow" },
  { value: "word-of-mouth", label: "Word of Mouth" },
  { value: "other", label: "Other" },
] as const;

export type EarlyAccessReferralSource = (typeof EARLY_ACCESS_REFERRAL_SOURCE_OPTIONS)[number]["value"];

export function parseEarlyAccessReferralSourceInput(raw: unknown): EarlyAccessReferralSource | null {
  if (typeof raw !== "string") {
    return null;
  }
  return EARLY_ACCESS_REFERRAL_SOURCE_OPTIONS.find((option) => option.value === raw)?.value ?? null;
}

export function formatEarlyAccessReferralNote(
  source: EarlyAccessReferralSource,
  otherDetail?: string | null
): string | null {
  if (source === "other") {
    const detail = otherDetail?.trim();
    if (!detail) {
      return null;
    }
    return `Other: ${detail}`;
  }

  return EARLY_ACCESS_REFERRAL_SOURCE_OPTIONS.find((option) => option.value === source)?.label ?? null;
}

export type EarlyAccessReferralRequestParseResult =
  | { note: string }
  | { error: "invalid_referral" | "invalid_referral_other" };

export function parseEarlyAccessReferralRequestInput(input: {
  referralSource?: unknown;
  referralOther?: unknown;
}): EarlyAccessReferralRequestParseResult {
  const source = parseEarlyAccessReferralSourceInput(input.referralSource);
  if (!source) {
    return { error: "invalid_referral" };
  }

  const other = typeof input.referralOther === "string" ? input.referralOther : undefined;
  const note = formatEarlyAccessReferralNote(source, other);
  if (!note) {
    return source === "other" ? { error: "invalid_referral_other" } : { error: "invalid_referral" };
  }

  return { note };
}
