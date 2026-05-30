"use client";

import { IconMail } from "@tabler/icons-react";
import { type FormEvent, useCallback, useId, useState } from "react";
import { toast } from "sonner";
import {
  CHANGE_EMAIL_ACCOUNT_COPY,
  resolveTowerEmailChangePendingAppCallbackUrl,
} from "@/features/auth/lib/change-email";
import { authClient } from "@/features/auth/model/auth-client";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type AccountChangeEmailSectionProps = {
  currentEmail: string;
  onEmailChangeStarted: () => void;
};

export function AccountChangeEmailSection({ currentEmail, onEmailChangeStarted }: AccountChangeEmailSectionProps) {
  const emailNewId = useId();
  const [newEmail, setNewEmail] = useState("");
  const [pendingNewEmail, setPendingNewEmail] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const startEmailChange = useCallback(
    async (targetEmail: string, options?: { resend?: boolean }) => {
      setEmailErr(null);
      setEmailBusy(true);
      const { error } = await authClient.changeEmail({
        newEmail: targetEmail,
        callbackURL: resolveTowerEmailChangePendingAppCallbackUrl("/account"),
        fetchOptions: { credentials: "include" },
      });
      setEmailBusy(false);
      if (error) {
        const msg = error.message ?? "Could not start email change";
        setEmailErr(msg);
        toast.error(msg);
        return false;
      }
      setPendingNewEmail(targetEmail);
      setNewEmail("");
      if (options?.resend) {
        toast.success(CHANGE_EMAIL_ACCOUNT_COPY.pending.resendSuccess);
      } else {
        toast.success(CHANGE_EMAIL_ACCOUNT_COPY.submitSuccess);
      }
      onEmailChangeStarted();
      return true;
    },
    [onEmailChangeStarted]
  );

  async function onChangeEmail(e: FormEvent) {
    e.preventDefault();
    await startEmailChange(newEmail.trim());
  }

  const onResend = useCallback(async () => {
    if (!pendingNewEmail) {
      return;
    }
    await startEmailChange(pendingNewEmail, { resend: true });
  }, [pendingNewEmail, startEmailChange]);

  function onUseDifferentEmail() {
    setPendingNewEmail(null);
    setEmailErr(null);
    setNewEmail("");
  }

  function onCancelEmailChange() {
    setPendingNewEmail(null);
    setEmailErr(null);
    setNewEmail("");
    toast.success(CHANGE_EMAIL_ACCOUNT_COPY.pending.cancelSuccess);
  }

  if (pendingNewEmail) {
    return (
      <>
        <CardHeader>
          <CardTitle className="text-lg">Email</CardTitle>
          <CardDescription>{CHANGE_EMAIL_ACCOUNT_COPY.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert variant="info">
            <IconMail />
            <AlertTitle>{CHANGE_EMAIL_ACCOUNT_COPY.pending.title}</AlertTitle>
            <AlertDescription>{CHANGE_EMAIL_ACCOUNT_COPY.pending.description}</AlertDescription>
            <AlertAction>
              <Button type="button" size="sm" disabled={emailBusy} onClick={() => void onResend()}>
                {emailBusy
                  ? CHANGE_EMAIL_ACCOUNT_COPY.pending.resendPendingLabel
                  : CHANGE_EMAIL_ACCOUNT_COPY.pending.resendLabel}
              </Button>
            </AlertAction>
          </Alert>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{CHANGE_EMAIL_ACCOUNT_COPY.pending.currentEmailLabel}</dt>
              <dd className="font-medium text-foreground">{currentEmail}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{CHANGE_EMAIL_ACCOUNT_COPY.pending.newEmailLabel}</dt>
              <dd className="font-medium text-foreground">{pendingNewEmail}</dd>
            </div>
          </dl>
          {emailErr ? (
            <p className="text-sm text-destructive" role="alert">
              {emailErr}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="link" size="sm" disabled={emailBusy}>
                {CHANGE_EMAIL_ACCOUNT_COPY.pending.cancelLabel}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{CHANGE_EMAIL_ACCOUNT_COPY.pending.cancelDialogTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {CHANGE_EMAIL_ACCOUNT_COPY.pending.cancelDialogDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">
                  {CHANGE_EMAIL_ACCOUNT_COPY.pending.cancelDismissLabel}
                </AlertDialogCancel>
                <AlertDialogAction type="button" variant="destructive" onClick={onCancelEmailChange}>
                  {CHANGE_EMAIL_ACCOUNT_COPY.pending.cancelConfirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button type="button" variant="outline" size="sm" disabled={emailBusy} onClick={onUseDifferentEmail}>
            {CHANGE_EMAIL_ACCOUNT_COPY.pending.useDifferentEmailLabel}
          </Button>
        </CardFooter>
      </>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="text-lg">Email</CardTitle>
        <CardDescription>{CHANGE_EMAIL_ACCOUNT_COPY.cardDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onChangeEmail} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Current: <span className="font-medium text-foreground">{currentEmail}</span>
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
          <Button type="submit" width="fit" disabled={emailBusy}>
            {emailBusy ? "Sending…" : "Change email"}
          </Button>
        </form>
      </CardContent>
    </>
  );
}
