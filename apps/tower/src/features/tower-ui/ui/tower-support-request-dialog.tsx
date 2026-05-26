"use client";

import posthog from "posthog-js";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/features/auth/model/auth-client";
import {
  postSupportRequest,
  supportRequestSubmitErrorMessage,
  validateSupportRequestForm,
} from "@/features/tower-ui/lib/submit-tower-support-request";
import {
  TOWER_SUPPORT_REQUEST_CONFIG,
  type TowerSupportRequestKind,
} from "@/features/tower-ui/lib/tower-support-request";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

type TowerSupportRequestDialogProps = {
  kind: TowerSupportRequestKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function captureSupportRequest(
  event: string,
  payload: { kind: TowerSupportRequestKind; topic: string; details: string; email: string }
) {
  if (!posthog.__loaded) return;
  posthog.capture(event, payload);
}

export function TowerSupportRequestDialog({ kind, open, onOpenChange }: TowerSupportRequestDialogProps) {
  const config = TOWER_SUPPORT_REQUEST_CONFIG[kind];
  const { data: session } = authClient.useSession();
  const sessionEmail = session?.user?.email?.trim() ?? "";

  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(sessionEmail);
  }, [open, sessionEmail]);

  function resetForm() {
    setTopic("");
    setDetails("");
    setEmail(sessionEmail);
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedTopic = topic.trim();
    const trimmedDetails = details.trim();
    const trimmedEmail = email.trim();
    const validationError = validateSupportRequestForm(config, {
      topic: trimmedTopic,
      details: trimmedDetails,
      email: trimmedEmail,
    });
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setBusy(true);
    const result = await postSupportRequest({
      kind,
      topic: trimmedTopic,
      details: trimmedDetails,
      email: trimmedEmail,
    });
    setBusy(false);

    if (!result.ok) {
      const message = supportRequestSubmitErrorMessage(config, result.error);
      setError(message);
      toast.error(message);
      return;
    }

    captureSupportRequest(config.captureEvent, {
      kind,
      topic: trimmedTopic,
      details: trimmedDetails,
      email: trimmedEmail,
    });
    toast.success(config.kind === "feedback" ? "Thanks for the feedback." : "Help request sent.");
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          resetForm();
        }
      }}
    >
      <DialogContent size="form">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            void onSubmit(event);
          }}
          className="space-y-3"
        >
          <FormField>
            <Label htmlFor={`tower-support-topic-${kind}`}>{config.topicLabel}</Label>
            <Select value={topic || undefined} onValueChange={setTopic}>
              <SelectTrigger id={`tower-support-topic-${kind}`} aria-label={config.topicLabel}>
                <SelectValue placeholder={config.topicPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {config.topics.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField>
            <Label htmlFor={`tower-support-details-${kind}`}>{config.detailsLabel}</Label>
            <Textarea
              id={`tower-support-details-${kind}`}
              fieldSize="lg"
              placeholder={config.detailsPlaceholder}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              required
            />
          </FormField>
          <FormField>
            <Label htmlFor={`tower-support-email-${kind}`}>Email</Label>
            <Input
              id={`tower-support-email-${kind}`}
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </FormField>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : config.submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
