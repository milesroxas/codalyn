import { webflowDataApiUrl } from "@codalyn/webflow-kit";
import { resolveWebflowBearerToken } from "@/server/webflow-proxy-token";

export type WebflowSiteSummary = {
  id: string;
  displayName?: string;
};

export async function listWebflowSitesWithToken(accessToken: string): Promise<WebflowSiteSummary[]> {
  const token = accessToken.trim();
  if (!token) {
    return [];
  }

  const url = webflowDataApiUrl(["sites"]);
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    return [];
  }

  const json = (await res.json()) as { sites?: WebflowSiteSummary[] };
  return json.sites ?? [];
}

export async function listWebflowSitesForUser(opts: {
  userId: string;
  requestHeaders: Headers;
  accessToken?: string;
}): Promise<WebflowSiteSummary[] | null> {
  const token =
    opts.accessToken?.trim() ||
    (await resolveWebflowBearerToken({
      userId: opts.userId,
      requestHeaders: opts.requestHeaders,
    }));
  if (!token) {
    return null;
  }

  return listWebflowSitesWithToken(token);
}
