"use client";

import { IconMailForward, IconUsers } from "@tabler/icons-react";
import { type FormEvent, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function OperatorAccounts() {
  const [busy, setBusy] = useState(false);
  const [payload, setPayload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const onLoad = async () => {
    setError(null);
    setBusy(true);
    const res = await authClient.admin.listUsers({
      query: { limit: 50 },
      fetchOptions: { credentials: "include" },
    });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Could not list accounts");
      setPayload(null);
      return;
    }
    setPayload(JSON.stringify(res.data, null, 2));
  };

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteMessage(null);
    setInviteLink(null);
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteMessage("Enter an email address.");
      return;
    }
    setInviteBusy(true);
    const res = await fetch("/api/operator/customer-invite", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setInviteBusy(false);
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      kind?: string;
      inviteUrl?: string;
      error?: string;
    } | null;
    if (!res.ok) {
      setInviteMessage(body?.error === "invalid_email" ? "Invalid email." : "Could not send invite.");
      return;
    }
    if (body?.kind === "existing_user") {
      setInviteMessage(
        "That user already has an account. They can create a team workspace now (email sent if mail is configured)."
      );
      setInviteEmail("");
      return;
    }
    if (body?.kind === "new_user" && typeof body.inviteUrl === "string") {
      setInviteMessage("Invite ready. Email sent if mail is configured — copy the link below as a fallback.");
      setInviteLink(body.inviteUrl);
      setInviteEmail("");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500/90">
          Operations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Accounts</h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Invite customers to sign up with team workspace eligibility, list accounts for support, and provision existing
          users.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconMailForward className="size-5 text-zinc-500" aria-hidden />
            <CardTitle className="text-base">Invite customer</CardTitle>
          </div>
          <CardDescription>
            New addresses get a sign-up link; existing users gain permission to create a team workspace. Configure{" "}
            <span className="font-mono text-xs">RESEND_*</span> to send mail, or copy the link from the response in
            development.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={onInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="operator-invite-email">Email</Label>
              <Input
                id="operator-invite-email"
                type="email"
                autoComplete="off"
                value={inviteEmail}
                onChange={(ev) => setInviteEmail(ev.target.value)}
                placeholder="customer@company.com"
                className="bg-background/80 dark:bg-input/40"
              />
            </div>
            <Button type="submit" size="sm" disabled={inviteBusy} className="shrink-0 sm:mb-0">
              {inviteBusy ? "Sending…" : "Send invite"}
            </Button>
          </form>
          {inviteMessage ? (
            <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
              {inviteMessage}
            </p>
          ) : null}
          {inviteLink ? (
            <div className="space-y-2">
              <pre className="max-h-32 overflow-auto break-all rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed dark:border-zinc-800 dark:bg-zinc-900/60">
                {inviteLink}
              </pre>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void navigator.clipboard.writeText(inviteLink)}
              >
                Copy link
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconUsers className="size-5 text-zinc-500" aria-hidden />
            <CardTitle className="text-base">User directory</CardTitle>
          </div>
          <CardDescription>First page (limit 50). Shape matches Better Auth admin list response.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" size="sm" disabled={busy} onClick={() => void onLoad()}>
            {busy ? "Loading…" : "Load accounts"}
          </Button>
          {payload ? (
            <pre className="max-h-[min(28rem,60dvh)] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed dark:border-zinc-800 dark:bg-zinc-900/60">
              {payload}
            </pre>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
