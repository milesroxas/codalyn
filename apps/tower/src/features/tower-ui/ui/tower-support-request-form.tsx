"use client";

import posthog from "posthog-js";
import { type FormEvent, useId, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/features/auth/model/auth-client";
import {
  postSupportRequest,
  supportRequestSubmitErrorMessage,
  validateSupportRequestForm,
} from "@/features/tower-ui/lib/submit-tower-support-request";
import {
  TOWER_SUPPORT_REQUEST_CONFIG,
  TOWER_SUPPORT_REQUEST_EMAIL_LABEL,
  TOWER_SUPPORT_REQUEST_EMAIL_PLACEHOLDER,
  type TowerSupportRequestKind,
} from "@/features/tower-ui/lib/tower-support-request";
import { Button } from "@/shared/ui/button";
import { DialogFooter } from "@/shared/ui/dialog";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

type TowerSupportRequestFormProps = {
  kind: TowerSupportRequestKind;
  /** "page" renders a full-width submit; "dialog" renders a dialog footer with a close button. */
  variant?: "page" | "dialog";
  /** Called after a successful submission (for example to close the dialog). */
  onSuccess?: () => void;
};

function captureSupportRequest(
  event: string,
  payload: { kind: TowerSupportRequestKind; topic: string; details: string; email: string }
) {
  if (!posthog.__loaded) return;
  posthog.capture(event, payload);
}

export function TowerSupportRequestForm({ kind, variant = "page", onSuccess }: TowerSupportRequestFormProps) {
  const config = TOWER_SUPPORT_REQUEST_CONFIG[kind];
  const { data: session } = authClient.useSession();
  const sessionEmail = session?.user?.email?.trim() ?? "";
  const requireEmail = sessionEmail.length === 0;

  const topicId = useId();
  const detailsId = useId();
  const emailId = useId();

  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedTopic = topic.trim();
    const trimmedDetails = details.trim();
    const trimmedEmail = email.trim();
    const validationError = validateSupportRequestForm(
      config,
      { topic: trimmedTopic, details: trimmedDetails, email: trimmedEmail },
      { requireEmail }
    );
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
      email: requireEmail ? trimmedEmail : undefined,
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
      email: requireEmail ? trimmedEmail : sessionEmail,
    });
    toast.success(config.kind === "feedback" ? "Thanks for the feedback." : "Help request sent.");
    setTopic("");
    setDetails("");
    setEmail("");
    onSuccess?.();
  }

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="space-y-3"
    >
      {requireEmail ? (
        <FormField>
          <Label htmlFor={emailId}>{TOWER_SUPPORT_REQUEST_EMAIL_LABEL}</Label>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            fieldSize="lg"
            surface="elevated"
            placeholder={TOWER_SUPPORT_REQUEST_EMAIL_PLACEHOLDER}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </FormField>
      ) : null}
      <FormField>
        <Label htmlFor={topicId}>{config.topicLabel}</Label>
        <Select value={topic || undefined} onValueChange={setTopic}>
          <SelectTrigger id={topicId} aria-label={config.topicLabel}>
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
        <Label htmlFor={detailsId}>{config.detailsLabel}</Label>
        <Textarea
          id={detailsId}
          fieldSize="lg"
          placeholder={config.detailsPlaceholder}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          required
        />
      </FormField>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {variant === "dialog" ? (
        <DialogFooter showCloseButton>
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : config.submitLabel}
          </Button>
        </DialogFooter>
      ) : (
        <Button type="submit" disabled={busy} size="form" width="full">
          {busy ? "Sending…" : config.submitLabel}
        </Button>
      )}
    </form>
  );
}
