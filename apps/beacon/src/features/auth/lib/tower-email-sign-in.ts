import { getTowerAuthBaseUrl, towerAuthClient } from "@/features/auth/model/tower-auth-client";
import { writeBeaconTowerSessionToken } from "./beacon-tower-session-token";

export type TowerEmailSignInResult = { ok: true } | { ok: false; error: string };

type BetterAuthSignInError = { code?: string; message?: string; status?: number } | null | undefined;

/** Map a Better Auth email sign-in error to a short, Designer-friendly message. Pure for testability. */
export function messageForTowerEmailSignInError(error: BetterAuthSignInError): string {
  if (!error) {
    return "Couldn't sign in. Try again.";
  }
  const message = error.message?.toLowerCase() ?? "";
  if (error.code === "EMAIL_NOT_VERIFIED" || message.includes("email not verified")) {
    return "Verify your email first — check your inbox, then sign in.";
  }
  if (
    error.status === 401 ||
    error.code === "INVALID_EMAIL_OR_PASSWORD" ||
    message.includes("invalid email or password")
  ) {
    return "Incorrect email or password.";
  }
  return error.message?.trim() || "Couldn't sign in. Try again.";
}

/**
 * Signs in to Tower with email + password from inside the Designer extension and persists the returned
 * Better Auth bearer token (the extension authenticates Tower cross-origin via that token, not cookies).
 * The token arrives in the `set-auth-token` response header (bearer plugin) and/or the JSON body.
 */
export async function signInToTowerWithEmail(email: string, password: string): Promise<TowerEmailSignInResult> {
  if (!getTowerAuthBaseUrl()) {
    return { ok: false, error: "Cloud sync isn't available in this build." };
  }

  let headerToken = "";
  const { data, error } = await towerAuthClient.signIn.email({
    email: email.trim(),
    password,
    fetchOptions: {
      onSuccess(ctx) {
        headerToken = ctx.response.headers.get("set-auth-token")?.trim() ?? "";
      },
    },
  });

  if (error) {
    return { ok: false, error: messageForTowerEmailSignInError(error) };
  }

  const bodyTokenRaw = (data as { token?: unknown } | null | undefined)?.token;
  const bodyToken = typeof bodyTokenRaw === "string" ? bodyTokenRaw.trim() : "";
  const token = bodyToken || headerToken;
  if (!token) {
    return { ok: false, error: "No session token returned. Try again." };
  }

  writeBeaconTowerSessionToken(token);
  return { ok: true };
}
