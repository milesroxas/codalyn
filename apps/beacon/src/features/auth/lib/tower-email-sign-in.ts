import { getTowerAuthBaseUrl } from "@/features/auth/model/tower-auth-client";
import { requestTowerEmailSignIn, type TowerEmailSignInError } from "@/features/auth/model/tower-session-client";
import { writeBeaconTowerSessionToken } from "./beacon-tower-session-token";

export type TowerEmailSignInResult = { ok: true } | { ok: false; error: string };

type BetterAuthSignInError = Partial<TowerEmailSignInError> | null | undefined;

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

  const result = await requestTowerEmailSignIn(email.trim(), password);
  if (!result.ok) {
    return { ok: false, error: messageForTowerEmailSignInError(result.error) };
  }
  if (!result.token) {
    return { ok: false, error: "No session token returned. Try again." };
  }

  writeBeaconTowerSessionToken(result.token);
  return { ok: true };
}
