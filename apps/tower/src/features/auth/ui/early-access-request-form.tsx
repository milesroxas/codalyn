"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useId, useState } from "react";
import {
  EARLY_ACCESS_ALREADY_APPROVED_PROMPT,
  EARLY_ACCESS_REQUEST_ALREADY_HAS_ACCESS_MESSAGE,
  EARLY_ACCESS_REQUEST_ALREADY_PENDING_MESSAGE,
  EARLY_ACCESS_REQUEST_EMAIL_LABEL,
  EARLY_ACCESS_REQUEST_INVALID_EMAIL,
  EARLY_ACCESS_REQUEST_INVALID_TEAM_EMAIL,
  EARLY_ACCESS_REQUEST_NAME_LABEL,
  EARLY_ACCESS_REQUEST_NOTE_LABEL,
  EARLY_ACCESS_REQUEST_NOTE_PLACEHOLDER,
  EARLY_ACCESS_REQUEST_PAGE_DESCRIPTION,
  EARLY_ACCESS_REQUEST_PAGE_TITLE,
  EARLY_ACCESS_REQUEST_SIGN_IN_LABEL,
  EARLY_ACCESS_REQUEST_SUBMIT_ERROR,
  EARLY_ACCESS_REQUEST_SUBMIT_LABEL,
  EARLY_ACCESS_REQUEST_SUBMIT_PENDING,
  EARLY_ACCESS_REQUEST_SUCCESS_MESSAGE,
  EARLY_ACCESS_REQUEST_TEAM_EMAILS_HINT,
  EARLY_ACCESS_REQUEST_TEAM_EMAILS_LABEL,
  EARLY_ACCESS_REQUEST_TEAM_EMAILS_PLACEHOLDER,
} from "@/shared/lib/access/early-access-copy";
import { normalizeAccessEmail, parseAccessEmailInput } from "@/shared/lib/access/email-input";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { TagsInput } from "@/shared/ui/tags-input";
import { Textarea } from "@/shared/ui/textarea";

type RequestOutcome = "created" | "already_pending" | "already_has_access";

function messageForOutcome(outcome: RequestOutcome): string {
  if (outcome === "already_pending") {
    return EARLY_ACCESS_REQUEST_ALREADY_PENDING_MESSAGE;
  }
  if (outcome === "already_has_access") {
    return EARLY_ACCESS_REQUEST_ALREADY_HAS_ACCESS_MESSAGE;
  }
  return EARLY_ACCESS_REQUEST_SUCCESS_MESSAGE;
}

export type EarlyAccessRequestFormProps = {
  signInHref?: string;
};

export function EarlyAccessRequestForm(props: EarlyAccessRequestFormProps) {
  const { signInHref = "/sign-in" } = props;
  const emailId = useId();
  const nameId = useId();
  const teamEmailsId = useId();
  const teamEmailsHintId = useId();
  const noteId = useId();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [teamMemberEmails, setTeamMemberEmails] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const normalizeTeamEmail = useCallback(
    (raw: string) => {
      const parsed = parseAccessEmailInput(raw);
      if (!parsed) {
        return null;
      }
      const primary = parseAccessEmailInput(email);
      if (primary && parsed === primary) {
        return null;
      }
      return parsed;
    },
    [email]
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const res = await fetch("/api/account/request-early-access", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeAccessEmail(email),
          name,
          note,
          teamMemberEmails,
        }),
      });
      const body = (await res.json().catch(() => null)) as { outcome?: RequestOutcome; error?: string } | null;
      if (!res.ok) {
        if (body?.error === "invalid_email") {
          setError(EARLY_ACCESS_REQUEST_INVALID_EMAIL);
        } else if (body?.error === "invalid_team_email") {
          setError(EARLY_ACCESS_REQUEST_INVALID_TEAM_EMAIL);
        } else {
          setError(EARLY_ACCESS_REQUEST_SUBMIT_ERROR);
        }
        return;
      }
      const outcome = body?.outcome ?? "created";
      setSuccess(messageForOutcome(outcome));
      if (outcome === "already_has_access") {
        return;
      }
      setNote("");
      setTeamMemberEmails([]);
    } catch {
      setError(EARLY_ACCESS_REQUEST_SUBMIT_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{EARLY_ACCESS_REQUEST_PAGE_TITLE}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{EARLY_ACCESS_REQUEST_PAGE_DESCRIPTION}</p>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-lg shadow-black/4 dark:shadow-black/25">
        {success ? (
          <p className="text-sm text-foreground" role="status">
            {success}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <FormField>
              <Label htmlFor={emailId}>{EARLY_ACCESS_REQUEST_EMAIL_LABEL}</Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                fieldSize="lg"
                surface="elevated"
                required
              />
            </FormField>
            <FormField>
              <Label htmlFor={nameId}>{EARLY_ACCESS_REQUEST_NAME_LABEL}</Label>
              <Input
                id={nameId}
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                fieldSize="lg"
                surface="elevated"
              />
            </FormField>
            <FormField>
              <Label id={`${teamEmailsId}-label`} htmlFor={teamEmailsId}>
                {EARLY_ACCESS_REQUEST_TEAM_EMAILS_LABEL}
              </Label>
              <TagsInput
                id={teamEmailsId}
                value={teamMemberEmails}
                onChange={setTeamMemberEmails}
                placeholder={EARLY_ACCESS_REQUEST_TEAM_EMAILS_PLACEHOLDER}
                normalizeTag={normalizeTeamEmail}
                disabled={pending}
                aria-describedby={teamEmailsHintId}
              />
              <p id={teamEmailsHintId} className="text-xs leading-relaxed text-muted-foreground">
                {EARLY_ACCESS_REQUEST_TEAM_EMAILS_HINT}
              </p>
            </FormField>
            <FormField>
              <Label htmlFor={noteId}>{EARLY_ACCESS_REQUEST_NOTE_LABEL}</Label>
              <Textarea
                id={noteId}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder={EARLY_ACCESS_REQUEST_NOTE_PLACEHOLDER}
                fieldSize="lg"
                surface="elevated"
              />
            </FormField>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} size="form" width="full">
              {pending ? EARLY_ACCESS_REQUEST_SUBMIT_PENDING : EARLY_ACCESS_REQUEST_SUBMIT_LABEL}
            </Button>
          </form>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {EARLY_ACCESS_ALREADY_APPROVED_PROMPT}{" "}
        <Link href={signInHref} className="font-medium text-foreground underline-offset-4 hover:underline">
          {EARLY_ACCESS_REQUEST_SIGN_IN_LABEL}
        </Link>
      </p>
    </div>
  );
}
