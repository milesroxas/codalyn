/**
 * Client contract for Tower's Beacon-facing early-access endpoint
 * (`POST /api/v1/beacon/early-access-request`).
 *
 * Referral option values must match Tower's server allowlist
 * (`apps/tower/src/shared/lib/access/referral-source.ts`) — the server rejects unknown
 * values with `invalid_referral`. Matching is by `value` (stable id), never by label.
 */

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

export const EARLY_ACCESS_REQUEST_OUTCOMES = ["created", "already_pending", "already_has_access"] as const;

export type EarlyAccessRequestOutcome = (typeof EARLY_ACCESS_REQUEST_OUTCOMES)[number];

export type EarlyAccessSubmitResponse = {
  /** Parsed request outcome; null when the body carries none (e.g. an error response). */
  outcome: EarlyAccessRequestOutcome | null;
  /** Server error code (`invalid_email`, `invalid_referral`, …); null when absent. */
  error: string | null;
};

/** Reads a string from primitive or wrapped `{ value }` form; null when absent/malformed. */
function readStringLikeValue(raw: unknown): string | null {
  if (typeof raw === "string") {
    return raw;
  }
  if (raw && typeof raw === "object" && "value" in raw) {
    return readStringLikeValue((raw as { value: unknown }).value);
  }
  return null;
}

function parseEarlyAccessRequestOutcome(raw: unknown): EarlyAccessRequestOutcome | null {
  const value = readStringLikeValue(raw);
  return EARLY_ACCESS_REQUEST_OUTCOMES.find((outcome) => outcome === value) ?? null;
}

/**
 * Normalizes the endpoint's JSON body (`{ ok, outcome }` on success, `{ error }` on failure)
 * into a stable shape. Malformed/missing bodies normalize to `{ outcome: null, error: null }`
 * so callers fall back to their generic failure message.
 */
export function normalizeEarlyAccessSubmitResponse(raw: unknown): EarlyAccessSubmitResponse {
  if (!raw || typeof raw !== "object") {
    return { outcome: null, error: null };
  }
  const record = raw as { outcome?: unknown; error?: unknown };
  return {
    outcome: parseEarlyAccessRequestOutcome(record.outcome),
    error: readStringLikeValue(record.error),
  };
}

const EARLY_ACCESS_REQUEST_APPROVAL_FOLLOW_UP = "We'll review your request and email you when you're approved.";

export const EARLY_ACCESS_REQUEST_SUCCESS_MESSAGES: Record<EarlyAccessRequestOutcome, string> = {
  created: `Request received. ${EARLY_ACCESS_REQUEST_APPROVAL_FOLLOW_UP}`,
  already_pending: `We already have your request. ${EARLY_ACCESS_REQUEST_APPROVAL_FOLLOW_UP}`,
  already_has_access: "This email already has access. Sign in with it instead.",
};

export const EARLY_ACCESS_REQUEST_SUBMIT_ERROR = "Could not send your request. Try again.";

const EARLY_ACCESS_REQUEST_ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  invalid_referral: "Select how you heard about Codalyn Tower.",
  invalid_referral_other: "Tell us where you heard about Codalyn Tower.",
  not_available: "We're not taking requests right now.",
};

export function earlyAccessSubmitErrorMessage(errorCode: string | null): string {
  return (errorCode && EARLY_ACCESS_REQUEST_ERROR_MESSAGES[errorCode]) || EARLY_ACCESS_REQUEST_SUBMIT_ERROR;
}
