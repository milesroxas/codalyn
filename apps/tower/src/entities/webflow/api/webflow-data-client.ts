import { webflowDataApiUrl } from "@codalyn/webflow-kit";

/**
 * Server-side Webflow Data API client (Bearer token).
 * Prefer Tower’s authenticated proxy (`/api/v1/webflow/*`) from Beacon so tokens stay on the server.
 */
export class WebflowDataClient {
  constructor(private readonly accessToken: string) {}

  request(pathSegments: string[], init?: RequestInit): Promise<Response> {
    const url = webflowDataApiUrl(pathSegments);
    return fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
        ...init?.headers,
      },
    });
  }
}
