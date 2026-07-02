import {
  supportRequestSubmitErrorMessage,
  type TowerSupportRequestConfig,
  type TowerSupportRequestKind,
  validateSupportRequestForm,
} from "@codalyn/webflow-kit";

export { supportRequestSubmitErrorMessage, validateSupportRequestForm };

export async function postSupportRequest(input: {
  kind: TowerSupportRequestKind;
  topic: string;
  details: string;
  /** Provide for guests (no session). Routes to the email-accepting endpoint. */
  email?: string;
}): Promise<{ ok: true } | { ok: false; error?: string }> {
  const guestEmail = input.email?.trim();
  // Authenticated users submit via the session-gated account endpoint; guests supply an
  // email and use the endpoint that accepts one without a Tower session.
  const endpoint = guestEmail ? "/api/v1/beacon/support-request" : "/api/account/support-request";
  const payload = guestEmail
    ? { kind: input.kind, topic: input.topic, details: input.details, email: guestEmail }
    : { kind: input.kind, topic: input.topic, details: input.details };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      return { ok: false, error: body?.error };
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export type { TowerSupportRequestConfig };
