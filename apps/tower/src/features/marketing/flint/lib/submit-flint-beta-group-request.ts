import { normalizeAccessEmail } from "@/shared/lib/access/email-input";
import { FLINT_BETA_GROUP_FORM } from "@/shared/lib/marketing/flint-beta-group-copy";

export type FlintBetaGroupRequestOutcome = "created" | "already_pending";

function messageForOutcome(outcome: FlintBetaGroupRequestOutcome): string {
  if (outcome === "already_pending") {
    return FLINT_BETA_GROUP_FORM.alreadyPendingMessage;
  }
  return FLINT_BETA_GROUP_FORM.successMessage;
}

function submitErrorMessage(errorCode: string | undefined): string {
  if (errorCode === "invalid_email") {
    return FLINT_BETA_GROUP_FORM.invalidEmail;
  }
  return FLINT_BETA_GROUP_FORM.submitError;
}

export async function submitFlintBetaGroupRequest(input: {
  email: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/marketing/flint/beta-group-request", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizeAccessEmail(input.email),
        firstName: input.firstName?.trim() || undefined,
        lastName: input.lastName?.trim() || undefined,
      }),
    });
    const body = (await res.json().catch(() => null)) as {
      outcome?: FlintBetaGroupRequestOutcome;
      error?: string;
    } | null;
    if (!res.ok) {
      return { ok: false, error: submitErrorMessage(body?.error) };
    }
    const outcome = body?.outcome ?? "created";
    return { ok: true, message: messageForOutcome(outcome) };
  } catch {
    return { ok: false, error: FLINT_BETA_GROUP_FORM.submitError };
  }
}
