"use client";

import { type FormEvent, useId, useState } from "react";
import { submitFlintBetaGroupRequest } from "@/features/marketing/flint/lib/submit-flint-beta-group-request";
import { FLINT_BETA_GROUP_FORM } from "@/shared/lib/marketing/flint-beta-group-copy";
import { Button } from "@/shared/ui/button";
import { FormField, FormFieldGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type MarketingBetaGroupPanelProps = {
  title: string;
  description: string;
};

function MarketingBetaGroupPanel({ title, description }: MarketingBetaGroupPanelProps) {
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const result = await submitFlintBetaGroupRequest({ email, firstName, lastName });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      setFirstName("");
      setLastName("");
      setEmail("");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      data-slot="marketing-beta-group-panel"
      className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-sm border border-white/10 bg-neutral-950/80 p-8"
    >
      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-50">{title}</h2>
        <p className="text-lg leading-7 text-neutral-400">{description}</p>
      </div>
      {success ? (
        <p data-slot="marketing-beta-group-success" className="text-sm leading-relaxed text-neutral-200" role="status">
          {success}
        </p>
      ) : (
        <form data-slot="marketing-beta-group-form" onSubmit={onSubmit} className="flex flex-col gap-5">
          <FormFieldGrid>
            <FormField>
              <Label htmlFor={firstNameId} tone="marketing">
                {FLINT_BETA_GROUP_FORM.firstNameLabel}
              </Label>
              <Input
                id={firstNameId}
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                fieldSize="lg"
                surface="marketing"
              />
            </FormField>
            <FormField>
              <Label htmlFor={lastNameId} tone="marketing">
                {FLINT_BETA_GROUP_FORM.lastNameLabel}
              </Label>
              <Input
                id={lastNameId}
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                fieldSize="lg"
                surface="marketing"
              />
            </FormField>
          </FormFieldGrid>
          <FormField>
            <Label htmlFor={emailId} tone="marketing">
              {FLINT_BETA_GROUP_FORM.emailLabel}
            </Label>
            <Input
              id={emailId}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fieldSize="lg"
              surface="marketing"
              required
            />
          </FormField>
          {error ? (
            <p data-slot="marketing-beta-group-error" className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="form" width="fit" disabled={pending}>
            {pending ? FLINT_BETA_GROUP_FORM.submitPending : FLINT_BETA_GROUP_FORM.submitLabel}
          </Button>
        </form>
      )}
    </section>
  );
}

export { MarketingBetaGroupPanel };
