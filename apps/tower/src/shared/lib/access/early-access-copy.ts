export const EARLY_ACCESS_REQUIRED_CODE = "EARLY_ACCESS_REQUIRED";

export const EARLY_ACCESS_REQUIRED_MESSAGE =
  "Tower is in early access. Use the invite link from your email or ask us for access.";

export const EARLY_ACCESS_SIGN_UP_BLOCKED_MESSAGE =
  "Tower is in early access. Request access below, or use the link in your invitation email.";

export const EARLY_ACCESS_REQUEST_SUCCESS_MESSAGE = "Request received. We'll email you when you're approved.";

export const EARLY_ACCESS_REQUEST_ALREADY_PENDING_MESSAGE =
  "We already have your request. We'll email you when you're approved.";

export const EARLY_ACCESS_REQUEST_ALREADY_HAS_ACCESS_MESSAGE =
  "This email already has access. Sign in, or use your invite link.";

export const EARLY_ACCESS_ALREADY_APPROVED_PROMPT = "Already approved?";

export const EARLY_ACCESS_REQUEST_PAGE_TITLE = "Request access";

export const EARLY_ACCESS_REQUEST_PAGE_DESCRIPTION =
  "Share your email, teammates who should join you, and a short note. We review each request manually.";

export const EARLY_ACCESS_REQUEST_PAGE_UNAVAILABLE = "We're not taking requests right now.";

export const EARLY_ACCESS_REQUEST_PAGE_SIGN_UP_CTA = "Create an account";

export const EARLY_ACCESS_REQUEST_EMAIL_LABEL = "Work email";

export const EARLY_ACCESS_REQUEST_NAME_LABEL = "Name";

export const EARLY_ACCESS_REQUEST_TEAM_EMAILS_LABEL = "Teammates";

export const EARLY_ACCESS_REQUEST_TEAM_EMAILS_HINT =
  "Optional. Add work emails for anyone who should get access with you.";

export const EARLY_ACCESS_REQUEST_TEAM_EMAILS_PLACEHOLDER = "Add email and press Enter";

export const EARLY_ACCESS_REQUEST_INVALID_TEAM_EMAIL = "Enter a valid email for each teammate.";

export const EARLY_ACCESS_REQUEST_NOTE_LABEL = "How will you use Tower?";

export const EARLY_ACCESS_REQUEST_NOTE_PLACEHOLDER = "Team size, Webflow workflow…";

export const EARLY_ACCESS_REQUEST_SUBMIT_LABEL = "Send request";

export const EARLY_ACCESS_REQUEST_SUBMIT_PENDING = "Sending…";

export const EARLY_ACCESS_REQUEST_INVALID_EMAIL = "Enter a valid email address.";

export const EARLY_ACCESS_REQUEST_SUBMIT_ERROR = "Could not send your request. Try again.";

export const EARLY_ACCESS_REQUEST_SIGN_IN_LABEL = "Sign in";

export function isEarlyAccessAuthError(message: string | undefined | null): boolean {
  if (!message) {
    return false;
  }
  return message.includes("early access") || message.includes(EARLY_ACCESS_REQUIRED_CODE);
}
