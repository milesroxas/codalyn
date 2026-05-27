"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { AccountDeleteSection } from "@/features/account/ui/account-delete-section";
import { AccountSettingsSkeleton } from "@/features/account/ui/account-settings-skeleton";
import { TowerEmailChangeToast } from "@/features/account/ui/tower-email-change-toast";
import {
  CHANGE_EMAIL_ACCOUNT_COPY,
  resolveTowerEmailChangePendingAppCallbackUrl,
} from "@/features/auth/lib/change-email";
import { authClient } from "@/features/auth/model/auth-client";
import { useRequireTowerSession } from "@/features/auth/model/use-require-tower-session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField, FormFieldGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { TowerPageHeader, TowerPageMain } from "@/shared/ui/tower-page-shell";

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
      callbackURL: resolveTowerEmailChangePendingAppCallbackUrl("/account"),
      fetchOptions: { credentials: "include" },
    });
    setEmailBusy(false);
    if (error) {
      const msg = error.message ?? "Could not start email change";
      setEmailErr(msg);
      toast.error(msg);
      return;
    }
    const msg = CHANGE_EMAIL_ACCOUNT_COPY.submitSuccess;
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

  const showSettingsSkeleton = useDeferredLoadingIndicator(sessionPending);
  if (showSettingsSkeleton) {
    return <AccountSettingsSkeleton />;
  }
  if (sessionPending || !session?.user) {
    return null;
  }

  const u = session.user;

  return (
    <TowerPageMain width="narrow">
      <TowerEmailChangeToast />
      <TowerPageHeader title="Account" description={<>Email, password, and account deletion for {u.email}.</>} />

      <div className="space-y-8">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Shown in Tower and the account menu.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onUpdateProfile} className="flex flex-col gap-4">
              <FormFieldGrid>
                <FormField>
                  <Label htmlFor={firstNameId}>First name</Label>
                  <Input
                    id={firstNameId}
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(ev) => setFirstName(ev.target.value)}
                  />
                </FormField>
                <FormField>
                  <Label htmlFor={lastNameId}>Last name</Label>
                  <Input
                    id={lastNameId}
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(ev) => setLastName(ev.target.value)}
                  />
                </FormField>
              </FormFieldGrid>
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
              <Button type="submit" width="fit" disabled={profileBusy}>
                {profileBusy ? "Saving…" : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Email</CardTitle>
            <CardDescription>{CHANGE_EMAIL_ACCOUNT_COPY.cardDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onChangeEmail} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Current: <span className="font-medium text-foreground">{u.email}</span>
              </p>
              <FormField>
                <Label htmlFor={emailNewId}>New email</Label>
                <Input
                  id={emailNewId}
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(ev) => setNewEmail(ev.target.value)}
                  required
                />
              </FormField>
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
              <Button type="submit" width="fit" disabled={emailBusy}>
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
              <FormField>
                <Label htmlFor={curPassId}>Current password</Label>
                <Input
                  id={curPassId}
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(ev) => setCurrentPassword(ev.target.value)}
                  required
                />
              </FormField>
              <FormField>
                <Label htmlFor={newPassId}>New password</Label>
                <Input
                  id={newPassId}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(ev) => setNewPassword(ev.target.value)}
                  required
                  minLength={8}
                />
              </FormField>
              <FormField>
                <Label htmlFor={confirmPassId}>Confirm new password</Label>
                <Input
                  id={confirmPassId}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  required
                  minLength={8}
                />
              </FormField>
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
              <Button type="submit" width="fit" disabled={passBusy}>
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
