export type OperatorInviteSignUpPrefill = {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export async function fetchOperatorInviteSignUpPrefill(
  token: string
): Promise<{ ok: true; prefill: OperatorInviteSignUpPrefill } | { ok: false; error: string }> {
  const res = await fetch(`/api/account/operator-invite-details?token=${encodeURIComponent(token)}`, {
    credentials: "same-origin",
  });
  if (!res.ok) {
    return { ok: false, error: "This invite link is invalid or expired. Ask your administrator for a new one." };
  }
  const data = (await res.json().catch(() => null)) as {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  if (!data?.email) {
    return { ok: false, error: "This invite link is invalid or expired. Ask your administrator for a new one." };
  }
  return {
    ok: true,
    prefill: {
      email: data.email,
      firstName: data.firstName?.trim() || null,
      lastName: data.lastName?.trim() || null,
    },
  };
}

export async function redeemOperatorInviteClient(token: string): Promise<"ok" | "email_mismatch" | "invalid"> {
  const redeem = await fetch("/api/account/redeem-operator-invite", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (redeem.ok) {
    return "ok";
  }
  const body = (await redeem.json().catch(() => null)) as { error?: string } | null;
  if (body?.error === "email_mismatch") {
    return "email_mismatch";
  }
  return "invalid";
}

export function messageForRedeemFailure(code: "email_mismatch" | "invalid"): string {
  if (code === "email_mismatch") {
    return "Use the invited email address for this account.";
  }
  return "Could not apply your invite. Try again or contact support.";
}
