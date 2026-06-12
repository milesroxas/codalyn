import {
  supportRequestSubmitErrorMessage,
  type TowerSupportRequestKind,
  validateSupportRequestForm,
} from "@codalyn/webflow-kit";
import { towerFetch } from "@/shared/lib/tower-client";

export { supportRequestSubmitErrorMessage, validateSupportRequestForm };

export async function postBeaconSupportRequest(input: {
  kind: TowerSupportRequestKind;
  topic: string;
  details: string;
  email?: string;
}): Promise<{ ok: true } | { ok: false; error?: string }> {
  try {
    const res = await towerFetch("/api/v1/beacon/support-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: input.kind,
        topic: input.topic,
        details: input.details,
        ...(input.email ? { email: input.email } : {}),
      }),
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
