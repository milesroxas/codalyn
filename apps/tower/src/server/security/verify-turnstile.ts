const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * True when Cloudflare Turnstile is provisioned. Captcha enforcement is opt-in via env: setting
 * `TURNSTILE_SECRET_KEY` turns it on. IMPORTANT: when you set the secret you MUST also render a
 * Turnstile widget on every client that posts to a protected route (the Tower `/request-access`
 * form and the Beacon inline early-access form) so they can supply a token — otherwise those
 * submissions will start failing with `captcha_failed`.
 */
export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verify a Turnstile token against Cloudflare's siteverify endpoint.
 *
 * - Not configured → returns `true` (fail-open only when the operator hasn't opted in).
 * - Configured → requires a token and a `success: true` verdict; any network/verify failure is
 *   treated as a failed challenge (fail-closed), since a captcha that fails open under load is no
 *   captcha at all.
 */
export async function verifyTurnstileToken(token: string | null | undefined, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return true;
  }
  if (!token || typeof token !== "string") {
    return false;
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) {
    form.set("remoteip", ip);
  }

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return data?.success === true;
  } catch {
    return false;
  }
}
