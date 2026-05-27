"use client";

import Link from "next/link";
import { type FormEvent, useId, useState } from "react";
import {
  EARLY_ACCESS_ALREADY_APPROVED_PROMPT,
  EARLY_ACCESS_REQUEST_ALREADY_HAS_ACCESS_MESSAGE,
  EARLY_ACCESS_REQUEST_ALREADY_PENDING_MESSAGE,
  EARLY_ACCESS_REQUEST_EMAIL_LABEL,
  EARLY_ACCESS_REQUEST_INVALID_EMAIL,
  EARLY_ACCESS_REQUEST_INVALID_REFERRAL,
  EARLY_ACCESS_REQUEST_INVALID_REFERRAL_OTHER,
  EARLY_ACCESS_REQUEST_NAME_LABEL,
  EARLY_ACCESS_REQUEST_PAGE_DESCRIPTION,
  EARLY_ACCESS_REQUEST_PAGE_TITLE,
  EARLY_ACCESS_REQUEST_REFERRAL_LABEL,
  EARLY_ACCESS_REQUEST_REFERRAL_OTHER_LABEL,
  EARLY_ACCESS_REQUEST_REFERRAL_OTHER_PLACEHOLDER,
  EARLY_ACCESS_REQUEST_REFERRAL_PLACEHOLDER,
  EARLY_ACCESS_REQUEST_SIGN_IN_LABEL,
  EARLY_ACCESS_REQUEST_SUBMIT_ERROR,
  EARLY_ACCESS_REQUEST_SUBMIT_LABEL,
  EARLY_ACCESS_REQUEST_SUBMIT_PENDING,
  EARLY_ACCESS_REQUEST_SUCCESS_MESSAGE,
} from "@/shared/lib/access/early-access-copy";
import { normalizeAccessEmail } from "@/shared/lib/access/email-input";
import {
  EARLY_ACCESS_REFERRAL_SOURCE_OPTIONS,
  type EarlyAccessReferralSource,
} from "@/shared/lib/access/referral-source";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
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

function submitErrorMessage(errorCode: string | undefined): string {
  if (errorCode === "invalid_email") {
    return EARLY_ACCESS_REQUEST_INVALID_EMAIL;
  }
  if (errorCode === "invalid_referral") {
    return EARLY_ACCESS_REQUEST_INVALID_REFERRAL;
  }
  if (errorCode === "invalid_referral_other") {
    return EARLY_ACCESS_REQUEST_INVALID_REFERRAL_OTHER;
  }
  return EARLY_ACCESS_REQUEST_SUBMIT_ERROR;
}

function validateReferralInput(referralSource: EarlyAccessReferralSource | "", referralOther: string): string | null {
  if (!referralSource) {
    return EARLY_ACCESS_REQUEST_INVALID_REFERRAL;
  }
  if (referralSource === "other" && !referralOther.trim()) {
    return EARLY_ACCESS_REQUEST_INVALID_REFERRAL_OTHER;
  }
  return null;
}

export type EarlyAccessRequestFormProps = {
  signInHref?: string;
};

export function EarlyAccessRequestForm(props: EarlyAccessRequestFormProps) {
  const { signInHref = "/sign-in" } = props;
  const nameId = useId();
  const emailId = useId();
  const referralId = useId();
  const referralOtherId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [referralSource, setReferralSource] = useState<EarlyAccessReferralSource | "">("");
  const [referralOther, setReferralOther] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateReferralInput(referralSource, referralOther);
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/account/request-early-access", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: normalizeAccessEmail(email),
          referralSource,
          referralOther: referralSource === "other" ? referralOther : undefined,
        }),
      });
      const body = (await res.json().catch(() => null)) as { outcome?: RequestOutcome; error?: string } | null;
      if (!res.ok) {
        setError(submitErrorMessage(body?.error));
        return;
      }
      const outcome = body?.outcome ?? "created";
      setSuccess(messageForOutcome(outcome));
      if (outcome === "already_has_access") {
        return;
      }
      setReferralSource("");
      setReferralOther("");
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
              <Label htmlFor={referralId}>{EARLY_ACCESS_REQUEST_REFERRAL_LABEL}</Label>
              <Select
                value={referralSource || undefined}
                onValueChange={(value) => setReferralSource(value as EarlyAccessReferralSource)}
                disabled={pending}
              >
                <SelectTrigger id={referralId} aria-label={EARLY_ACCESS_REQUEST_REFERRAL_LABEL}>
                  <SelectValue placeholder={EARLY_ACCESS_REQUEST_REFERRAL_PLACEHOLDER} />
                </SelectTrigger>
                <SelectContent>
                  {EARLY_ACCESS_REFERRAL_SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {referralSource === "other" ? (
              <FormField>
                <Label htmlFor={referralOtherId}>{EARLY_ACCESS_REQUEST_REFERRAL_OTHER_LABEL}</Label>
                <Textarea
                  id={referralOtherId}
                  value={referralOther}
                  onChange={(event) => setReferralOther(event.target.value)}
                  rows={3}
                  placeholder={EARLY_ACCESS_REQUEST_REFERRAL_OTHER_PLACEHOLDER}
                  fieldSize="lg"
                  surface="elevated"
                  required
                />
              </FormField>
            ) : null}
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
