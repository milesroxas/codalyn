"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useId, useState } from "react";
import {
  syncExistingTowerSessionToBeaconIfPopup,
  tryFinishBeaconTowerAuthPopup,
} from "@/features/auth/lib/beacon-opener-auth";
import { messageForRedeemFailure, redeemOperatorInviteClient } from "@/features/auth/lib/operator-invite-client";
import { resolveUserAndTokenAfterEmailAuth, userToBeaconPayload } from "@/features/auth/lib/resolve-email-auth-session";
import { authClient } from "@/features/auth/model/auth-client";
import { EarlyAccessSignUpGate } from "@/features/auth/ui/early-access-sign-up-gate";
import { AuthCardSkeleton } from "@/features/tower-ui/auth-card-skeleton";
import { AuthShell } from "@/features/tower-ui/auth-shell";
import { TOWER_OPERATOR_INVITE_HEADER } from "@/shared/lib/access/operator-invite-header";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

async function postEnableTeamCreation(): Promise<{ ok: true } | { ok: false; errorKey?: string }> {
  const res = await fetch("/api/account/enable-team-creation", {
    method: "POST",
    credentials: "include",
  });
  if (res.ok) {
    return { ok: true };
  }
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return { ok: false, errorKey: body?.error };
}

function messageForEnableTeamError(errorKey: string | undefined): string {
  if (errorKey === "team_creation_requires_upgrade") {
    return "Account created. Team workspace creation needs a team-eligible plan—use billing when available.";
  }
  if (errorKey === "already_in_organization") {
    return "Account created. You already belong to a team.";
  }
  return "Account created, but team workspace could not be enabled yet. You can upgrade later.";
}

async function runAfterTowerSignUp(opts: {
  operatorInviteToken: string | null;
  beaconOrigin: string | null;
  startWithTeamWorkspace: boolean;
}): Promise<string | null> {
  if (opts.operatorInviteToken && !opts.beaconOrigin) {
    const redeemResult = await redeemOperatorInviteClient(opts.operatorInviteToken);
    if (redeemResult !== "ok") {
      return messageForRedeemFailure(redeemResult);
    }
  }
  if (opts.startWithTeamWorkspace && !opts.beaconOrigin) {
    const enable = await postEnableTeamCreation();
    if (!enable.ok) {
      return messageForEnableTeamError(enable.errorKey);
    }
  }
  return null;
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const beaconOrigin = searchParams.get("beaconOrigin");
  const operatorInviteParam = searchParams.get("invite");
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const teamWorkspaceId = useId();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [startWithTeamWorkspace, setStartWithTeamWorkspace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [operatorInviteToken, setOperatorInviteToken] = useState<string | null>(null);
  const [inviteEmailLocked, setInviteEmailLocked] = useState(false);
  const [earlyAccessRequired, setEarlyAccessRequired] = useState<boolean | null>(null);
  const [inviteValidated, setInviteValidated] = useState(!operatorInviteParam && !beaconOrigin);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/access-policy", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { earlyAccessRequired?: boolean } | null) => {
        if (!cancelled) {
          setEarlyAccessRequired(Boolean(data?.earlyAccessRequired));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEarlyAccessRequired(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!operatorInviteParam || beaconOrigin) {
      if (!operatorInviteParam) {
        setInviteValidated(true);
      }
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/account/operator-invite-details?token=${encodeURIComponent(operatorInviteParam)}`, {
        credentials: "same-origin",
      });
      if (cancelled) {
        return;
      }
      if (!res.ok) {
        setError("This invite link is invalid or expired. Ask your administrator for a new one.");
        setInviteValidated(true);
        return;
      }
      const data = (await res.json().catch(() => null)) as { email?: string } | null;
      if (data?.email) {
        setEmail(data.email);
        setStartWithTeamWorkspace(true);
        setOperatorInviteToken(operatorInviteParam);
        setInviteEmailLocked(true);
      }
      setInviteValidated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [operatorInviteParam, beaconOrigin]);

  useEffect(() => {
    if (!beaconOrigin) {
      return;
    }
    void syncExistingTowerSessionToBeaconIfPopup(beaconOrigin);
  }, [beaconOrigin]);

  async function finishSignUp(data: Parameters<typeof resolveUserAndTokenAfterEmailAuth>[0]) {
    const { user: u, token } = await resolveUserAndTokenAfterEmailAuth(data);
    if (tryFinishBeaconTowerAuthPopup(beaconOrigin, u ? userToBeaconPayload(u) : undefined, token)) {
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const displayName =
      [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim() || email.split("@")[0] || "User";
    const inviteToken = operatorInviteToken ?? operatorInviteParam?.trim() ?? null;
    const { data, error: err } = await authClient.signUp.email({
      email,
      password,
      name: displayName,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      ...(beaconOrigin ? {} : { callbackURL: callbackUrl }),
      fetchOptions: inviteToken
        ? {
            headers: {
              [TOWER_OPERATOR_INVITE_HEADER]: inviteToken,
            },
          }
        : undefined,
    });
    setPending(false);
    if (err) {
      setError(err.message ?? "Sign up failed");
      return;
    }
    const postErr = await runAfterTowerSignUp({
      operatorInviteToken: inviteToken,
      beaconOrigin,
      startWithTeamWorkspace,
    });
    if (postErr) {
      setError(postErr);
      return;
    }
    await finishSignUp(data);
  }

  const signInHref = `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}${beaconOrigin ? `&beaconOrigin=${encodeURIComponent(beaconOrigin)}` : ""}`;
  const requestAccessHref = `/request-access?callbackUrl=${encodeURIComponent(callbackUrl)}${beaconOrigin ? `&beaconOrigin=${encodeURIComponent(beaconOrigin)}` : ""}`;
  const joiningViaTeamInvite = callbackUrl.includes("/invitations/accept");

  if (earlyAccessRequired === null || !inviteValidated) {
    return <AuthCardSkeleton variant="sign-up" />;
  }

  if (earlyAccessRequired && inviteValidated && !operatorInviteToken && !operatorInviteParam && !joiningViaTeamInvite) {
    return <EarlyAccessSignUpGate signInHref={signInHref} requestAccessHref={requestAccessHref} />;
  }

  return (
    <AuthShell>
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight">Create your account</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Start using Tower with Beacon and team features.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={firstNameId}>First name</Label>
                <Input
                  id={firstNameId}
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(ev) => setFirstName(ev.target.value)}
                  fieldSize="lg"
                  surface="elevated"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={lastNameId}>Last name</Label>
                <Input
                  id={lastNameId}
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(ev) => setLastName(ev.target.value)}
                  fieldSize="lg"
                  surface="elevated"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                fieldSize="lg"
                surface="elevated"
                required
                readOnly={inviteEmailLocked}
                aria-readonly={inviteEmailLocked}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={passwordId}>Password</Label>
              <Input
                id={passwordId}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                fieldSize="lg"
                surface="elevated"
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            {!beaconOrigin ? (
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/25 p-4 dark:bg-muted/15">
                <div className="min-w-0 space-y-1">
                  <Label htmlFor={teamWorkspaceId} className="text-sm font-medium">
                    Team workspace
                  </Label>
                  <p id={`${teamWorkspaceId}-hint`} className="text-xs leading-relaxed text-muted-foreground">
                    {operatorInviteToken
                      ? "Your invite includes permission to create a team workspace."
                      : "Create a team workspace now (team plan / onboarding), or add it later from billing."}
                  </p>
                </div>
                <Switch
                  id={teamWorkspaceId}
                  checked={startWithTeamWorkspace}
                  onCheckedChange={setStartWithTeamWorkspace}
                  disabled={Boolean(operatorInviteToken)}
                  className="mt-0.5 shrink-0"
                  aria-describedby={`${teamWorkspaceId}-hint`}
                />
              </div>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="h-10 w-full rounded-lg font-medium">
              {pending ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
          <p className="text-left text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}${beaconOrigin ? `&beaconOrigin=${encodeURIComponent(beaconOrigin)}` : ""}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton variant="sign-up" />}>
      <SignUpForm />
    </Suspense>
  );
}
