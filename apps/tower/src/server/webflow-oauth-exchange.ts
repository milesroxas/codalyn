const TOKEN_URL = "https://api.webflow.com/oauth/access_token";

export type WebflowOAuthTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

type WebflowOAuthErrorBody = {
  error?: string;
  error_description?: string;
};

export async function exchangeWebflowAuthorizationCode(code: string): Promise<WebflowOAuthTokenResponse> {
  const clientId = process.env.WEBFLOW_CLIENT_ID?.trim();
  const clientSecret = process.env.WEBFLOW_CLIENT_SECRET?.trim();
  const redirectUri = process.env.WEBFLOW_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("WEBFLOW_CLIENT_ID, WEBFLOW_CLIENT_SECRET, and WEBFLOW_REDIRECT_URI are required");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = (await res.json()) as WebflowOAuthTokenResponse & WebflowOAuthErrorBody;
  if (!res.ok) {
    throw new Error(data.error_description ?? data.error ?? `Token exchange failed (${res.status})`);
  }
  if (!data.access_token) {
    throw new Error("Token exchange returned no access_token");
  }
  return data;
}
