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
}): Promise<{ ok: true } | { ok: false; error?: string }> {
  try {
    const res = await fetch("/api/account/support-request", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
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
