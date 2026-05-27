import type { TowerSupportRequestConfig, TowerSupportRequestKind } from "@/shared/lib/support/tower-support-request";

type SupportRequestFormValues = {
  topic: string;
  details: string;
};

export function validateSupportRequestForm(
  config: TowerSupportRequestConfig,
  values: SupportRequestFormValues
): string | null {
  if (!values.topic.trim()) {
    return `Choose a ${config.topicLabel.toLowerCase()}.`;
  }
  if (!values.details.trim()) {
    return `Enter your ${config.detailsLabel.toLowerCase()}.`;
  }
  return null;
}

export function supportRequestSubmitErrorMessage(
  config: TowerSupportRequestConfig,
  errorCode: string | undefined
): string {
  if (errorCode === "unauthorized") {
    return "Sign in to continue.";
  }
  if (errorCode === "invalid_details") {
    return `Enter your ${config.detailsLabel.toLowerCase()}.`;
  }
  if (errorCode === "invalid_topic") {
    return `Choose a ${config.topicLabel.toLowerCase()}.`;
  }
  return "Could not send your request. Try again.";
}

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
