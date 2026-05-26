"use client";

import { type FormEvent, useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { AccountDeleteSection } from "@/features/account/ui/account-delete-section";
import { AccountSettingsSkeleton } from "@/features/account/ui/account-settings-skeleton";
import { authClient } from "@/features/auth/model/auth-client";
import { useRequireTowerSession } from "@/features/auth/model/use-require-tower-session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { TowerPageMain } from "@/shared/ui/tower-page-shell";

export function AccountSettingsScreen() {
  const { session, sessionPending, refetch: refetchSession } = useRequireTowerSession("/account");

  const firstNameId = useId();
  const lastNameId = useId();
  const emailNewId = useId();
  const curPassId = useId();
  const newPassId = useId();
  const confirmPassId = useId();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passBusy, setPassBusy] = useState(false);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);

  useEffect(() => {
    const u = session?.user as { firstName?: string | null; lastName?: string | null } | undefined;
    if (!u) {
      return;
    }
    setFirstName(u.firstName?.trim() ?? "");
    setLastName(u.lastName?.trim() ?? "");
  }, [session?.user]);

  const appCallbackUrl = useCallback((path: string) => {
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    if (base) {
      return `${base}${path.startsWith("/") ? path : `/${path}`}`;
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
    }
    return path;
  }, []);

  async function onUpdateProfile(e: FormEvent) {
    e.preventDefault();
    if (!session?.user) {
      return;
    }
    setProfileErr(null);
    setProfileMsg(null);
    setProfileBusy(true);
    const fn = firstName.trim();
    const ln = lastName.trim();
    const displayName =
      [fn, ln].filter(Boolean).join(" ").trim() ||
      session.user.name?.trim() ||
      session.user.email.split("@")[0] ||
      "User";
    const { error } = await authClient.updateUser({
      firstName: fn,
      lastName: ln,
      name: displayName,
      fetchOptions: { credentials: "include" },
    });
    setProfileBusy(false);
    if (error) {
      const msg = error.message ?? "Could not update profile";
      setProfileErr(msg);
      toast.error(msg);
      return;
    }
    const msg = "Profile updated.";
    setProfileMsg(msg);
    toast.success(msg);
    void refetchSession();
  }

  async function onChangeEmail(e: FormEvent) {
    e.preventDefault();
    setEmailErr(null);
    setEmailMsg(null);
    setEmailBusy(true);
    const { error } = await authClient.changeEmail({
      newEmail: newEmail.trim(),
      callbackURL: appCallbackUrl("/account"),
      fetchOptions: { credentials: "include" },
    });
    setEmailBusy(false);
    if (error) {
      const msg = error.message ?? "Could not start email change";
      setEmailErr(msg);
      toast.error(msg);
      return;
    }
    const msg = "Check your email for a link to finish this change.";
    setEmailMsg(msg);
    toast.success(msg);
    setNewEmail("");
    void refetchSession();
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPassErr(null);
    setPassMsg(null);
    if (newPassword !== confirmPassword) {
      setPassErr("New password and confirmation do not match.");
      return;
    }
    setPassBusy(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
      fetchOptions: { credentials: "include" },
    });
    setPassBusy(false);
    if (error) {
      const msg = error.message ?? "Could not update password";
      setPassErr(msg);
      toast.error(msg);
      return;
    }
    const msg = "Password updated. Other sessions were signed out.";
    setPassMsg(msg);
    toast.success(msg);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    void refetchSession();
  }

  if (sessionPending || !session?.user) {
    return <AccountSettingsSkeleton />;
  }

  const u = session.user;

  return (
    <TowerPageMain width="narrow">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Tower</p>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted-foreground">Email, password, and account deletion for {u.email}.</p>
      </div>

      <Separator className="my-8" />

      <div className="space-y-8">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Shown in Tower and the account menu.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onUpdateProfile} className="flex flex-col gap-4">
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
              {profileErr ? (
                <p className="text-sm text-destructive" role="alert">
                  {profileErr}
                </p>
              ) : null}
              {profileMsg ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {profileMsg}
                </p>
              ) : null}
              <Button type="submit" disabled={profileBusy} className="h-10 w-fit rounded-lg font-medium">
                {profileBusy ? "Saving…" : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Email</CardTitle>
            <CardDescription>We email your current address to confirm.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onChangeEmail} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Current: <span className="font-medium text-foreground">{u.email}</span>
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor={emailNewId}>New email</Label>
                <Input
                  id={emailNewId}
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(ev) => setNewEmail(ev.target.value)}
                  fieldSize="lg"
                  surface="elevated"
                  required
                />
              </div>
              {emailErr ? (
                <p className="text-sm text-destructive" role="alert">
                  {emailErr}
                </p>
              ) : null}
              {emailMsg ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {emailMsg}
                </p>
              ) : null}
              <Button type="submit" disabled={emailBusy} className="h-10 w-fit rounded-lg font-medium">
                {emailBusy ? "Sending…" : "Change email"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Password</CardTitle>
            <CardDescription>Signs out other sessions when saved.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={curPassId}>Current password</Label>
                <Input
                  id={curPassId}
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(ev) => setCurrentPassword(ev.target.value)}
                  fieldSize="lg"
                  surface="elevated"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={newPassId}>New password</Label>
                <Input
                  id={newPassId}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(ev) => setNewPassword(ev.target.value)}
                  fieldSize="lg"
                  surface="elevated"
                  required
                  minLength={8}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={confirmPassId}>Confirm new password</Label>
                <Input
                  id={confirmPassId}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  fieldSize="lg"
                  surface="elevated"
                  required
                  minLength={8}
                />
              </div>
              {passErr ? (
                <p className="text-sm text-destructive" role="alert">
                  {passErr}
                </p>
              ) : null}
              {passMsg ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {passMsg}
                </p>
              ) : null}
              <Button type="submit" disabled={passBusy} className="h-10 w-fit rounded-lg font-medium">
                {passBusy ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <AccountDeleteSection sessionReady={Boolean(session?.user)} />
      </div>
    </TowerPageMain>
  );
}
