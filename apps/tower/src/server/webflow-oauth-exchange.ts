import {
  resolveWebflowAppClientCredentials,
  WEBFLOW_DATA_API_APP_KEY,
  type WebflowAppKey,
} from "@/server/webflow-app-registry";
import { resolveWebflowOAuthRedirectUri } from "@/server/webflow-oauth-config";

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

export async function exchangeWebflowAuthorizationCode(
  code: string,
  redirectUri: string = resolveWebflowOAuthRedirectUri(),
  app: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY
): Promise<WebflowOAuthTokenResponse> {
  const { clientId, clientSecret } = resolveWebflowAppClientCredentials(app);
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      `Webflow OAuth for the ${app} app requires its WEBFLOW_${app.toUpperCase()}_CLIENT_ID / _CLIENT_SECRET (Beacon also accepts legacy WEBFLOW_CLIENT_ID/SECRET) and WEBFLOW_REDIRECT_URI`
    );
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
