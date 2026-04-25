"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/features/auth/model/auth-client";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";

const inputClass = "h-10 rounded-lg bg-background/80 dark:bg-input/40";

export function AccountSettingsScreen() {
  const router = useRouter();
  const { data: session, isPending: sessionPending, refetch: refetchSession } = authClient.useSession();

  const firstNameId = useId();
  const lastNameId = useId();
  const emailNewId = useId();
  const curPassId = useId();
  const newPassId = useId();
  const confirmPassId = useId();
  const deletePassId = useId();
  const deleteConfirmPhraseId = useId();

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

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (sessionPending) {
      return;
    }
    if (!session?.user) {
      router.replace(`/sign-in?callbackUrl=${encodeURIComponent("/account")}`);
    }
  }, [session?.user, sessionPending, router]);

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

  async function onDeleteAccount(e: FormEvent) {
    e.preventDefault();
    setDeleteErr(null);
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      setDeleteErr("Type DELETE to confirm.");
      return;
    }
    setDeleteBusy(true);
    const { error } = await authClient.deleteUser({
      password: deletePassword,
      callbackURL: appCallbackUrl("/"),
      fetchOptions: { credentials: "include" },
    });
    setDeleteBusy(false);
    if (error) {
      const msg = error.message ?? "Could not delete account";
      setDeleteErr(msg);
      toast.error(msg);
      return;
    }
    toast.success("Account deleted");
    setDeleteDialogOpen(false);
    router.push("/");
    router.refresh();
  }

  function onDeleteDialogOpenChange(open: boolean) {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeletePassword("");
      setDeleteConfirm("");
      setDeleteErr(null);
    }
  }

  if (sessionPending || !session?.user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const u = session.user;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Tower</p>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted-foreground">Sign-in email, password, and account deletion for {u.email}.</p>
      </div>

      <Separator className="my-8" />

      <div className="space-y-8">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Your name appears in Tower and in the account menu.</CardDescription>
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
                    className={inputClass}
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
                    className={inputClass}
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
            <CardDescription>Changing your email sends a confirmation link to your current address.</CardDescription>
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
                  className={inputClass}
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
            <CardDescription>Updates your Tower password and signs out other sessions.</CardDescription>
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
                  className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
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

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Delete account</CardTitle>
            <CardDescription>
              Permanently removes your Tower user, sessions, and personal data tied to this account. Team workspaces you
              own may need to be transferred first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={deleteDialogOpen} onOpenChange={onDeleteDialogOpenChange}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="h-10 font-medium">
                  Delete my account…
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <form onSubmit={onDeleteAccount} className="flex flex-col gap-4">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes your user and cannot be undone. Enter your password and type DELETE to
                      confirm.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={deletePassId}>Password</Label>
                    <Input
                      id={deletePassId}
                      type="password"
                      autoComplete="current-password"
                      value={deletePassword}
                      onChange={(ev) => setDeletePassword(ev.target.value)}
                      className={inputClass}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={deleteConfirmPhraseId}>Type DELETE to confirm</Label>
                    <Input
                      id={deleteConfirmPhraseId}
                      type="text"
                      autoComplete="off"
                      value={deleteConfirm}
                      onChange={(ev) => setDeleteConfirm(ev.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  {deleteErr ? (
                    <p className="text-sm text-destructive" role="alert">
                      {deleteErr}
                    </p>
                  ) : null}
                  <AlertDialogFooter>
                    <AlertDialogCancel type="button" disabled={deleteBusy}>
                      Cancel
                    </AlertDialogCancel>
                    <Button type="submit" variant="destructive" disabled={deleteBusy} className="font-medium">
                      {deleteBusy ? "Deleting…" : "Delete account"}
                    </Button>
                  </AlertDialogFooter>
                </form>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
          <CardFooter className="border-t border-border/60 text-xs text-muted-foreground">
            This cannot be undone. If you use Beacon or integrations, you will need a new account to sign in again.
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
