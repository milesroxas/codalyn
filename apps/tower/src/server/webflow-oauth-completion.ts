import { classifyWebflowOAuthCallback } from "@/server/webflow-oauth-callback-logic";

export function readWebflowOAuthCallbackQuery(searchParams: URLSearchParams): {
  code: string | null;
  state: string | null;
  oauthError: string | null;
  oauthErrorDescription: string | null;
} {
  return {
    code: searchParams.get("code"),
    state: searchParams.get("state"),
    oauthError: searchParams.get("error"),
    oauthErrorDescription: searchParams.get("error_description"),
  };
}

export function resolveWebflowOAuthCallbackKind(
  searchParams: URLSearchParams,
  cookieExpectedState: string | undefined
) {
  const query = readWebflowOAuthCallbackQuery(searchParams);
  return {
    query,
    kind: classifyWebflowOAuthCallback({
      ...query,
      cookieExpectedState,
    }),
  };
}
