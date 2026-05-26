export class WebflowIntegrationApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "WebflowIntegrationApiError";
    this.status = status;
  }
}

export async function disconnectWebflowIntegration(): Promise<void> {
  const res = await fetch("/api/integrations/webflow/connection", {
    method: "DELETE",
    credentials: "include",
  });
  if (res.ok) {
    return;
  }

  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  const message =
    data?.error ??
    (res.status === 403
      ? "Only workspace admins can disconnect Webflow"
      : res.status === 401
        ? "Sign in required"
        : "Could not disconnect Webflow");
  throw new WebflowIntegrationApiError(res.status, message);
}
