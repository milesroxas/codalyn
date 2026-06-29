"use client";

import { IconCopy, IconMailForward } from "@tabler/icons-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type OperatorInviteCustomerProps = {
  onInvited?: () => void;
  trigger?: React.ReactNode;
};

function messageForInviteError(err: unknown): string {
  if (!(err instanceof OperatorApiError)) return "Could not send invite";
  if (err.message === "invalid_email") return "Invalid email.";
  return err.message;
}

export function OperatorInviteCustomer({ onInvited, trigger }: OperatorInviteCustomerProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  function reset(partial?: { keepLink?: boolean }) {
    if (!partial?.keepLink) {
      setInviteLink(null);
    }
    setMessage(null);
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    reset();
    const value = email.trim().toLowerCase();
    if (!value) {
      const msg = "Enter an email address.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setBusy(true);
    try {
      const res = await operatorApi.inviteCustomer(value);
      handleInviteSuccess(res);
      onInvited?.();
    } catch (err) {
      const msg = messageForInviteError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleInviteSuccess(res: Awaited<ReturnType<typeof operatorApi.inviteCustomer>>) {
    if (res.kind === "existing_user") {
      const text =
        "That user already has an account. They now can create a team workspace (email sent if mail is configured).";
      setMessage(text);
      toast.success("Customer invite processed");
      setEmail("");
      return;
    }
    const text = "Invite ready. Email sent if mail is configured — copy the link below as a fallback.";
    setMessage(text);
    toast.success("Invite sent");
    setInviteLink(res.inviteUrl ?? null);
    setEmail("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <IconMailForward className="size-4" />
            Invite customer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite customer</DialogTitle>
          <DialogDescription>
            New addresses get an early-access sign-up link. Existing users are granted Tower sign-in immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <FormField>
            <Label htmlFor="operator-invite-email">Email</Label>
            <Input
              id="operator-invite-email"
              type="email"
              autoComplete="off"
              placeholder="customer@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormField>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {message ? (
            <p role="status" className="text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
          {inviteLink ? (
            <div className="space-y-2">
              <pre className="max-h-32 overflow-auto break-all rounded-sm border border-border bg-muted/40 p-2 font-mono text-xs">
                {inviteLink}
              </pre>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteLink);
                  toast.success("Invite link copied");
                }}
              >
                <IconCopy className="size-3.5" />
                Copy link
              </Button>
            </div>
          ) : null}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
