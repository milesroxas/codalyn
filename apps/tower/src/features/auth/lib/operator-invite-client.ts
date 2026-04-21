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
