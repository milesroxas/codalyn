import { Loader2 } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import {
  EARLY_ACCESS_REFERRAL_SOURCE_OPTIONS,
  EARLY_ACCESS_REQUEST_SUBMIT_ERROR,
  EARLY_ACCESS_REQUEST_SUCCESS_MESSAGES,
  type EarlyAccessReferralSource,
  earlyAccessSubmitErrorMessage,
  normalizeEarlyAccessSubmitResponse,
} from "@/features/auth/lib/early-access-request";
import { towerFetch } from "@/shared/lib/tower-client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

type BeaconEarlyAccessRequestFormProps = {
  /** Returns the onboarding card to the sign-in view. */
  onBackToSignIn: () => void;
};

/**
 * Inline early-access request, submitted from the Designer without leaving the extension
 * (`POST /api/v1/beacon/early-access-request`). Mirrors Tower's `/request-access` form fields.
 */
export function BeaconEarlyAccessRequestForm(props: BeaconEarlyAccessRequestFormProps) {
  const { onBackToSignIn } = props;
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const referralId = useId();
  const referralOtherId = useId();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [referralSource, setReferralSource] = useState<EarlyAccessReferralSource | "">("");
  const [referralOther, setReferralOther] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!referralSource) {
      setError(earlyAccessSubmitErrorMessage("invalid_referral"));
      return;
    }
    if (referralSource === "other" && !referralOther.trim()) {
      setError(earlyAccessSubmitErrorMessage("invalid_referral_other"));
      return;
    }

    setPending(true);
    try {
      const res = await towerFetch("/api/v1/beacon/early-access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          email: email.trim().toLowerCase(),
          referralSource,
          referralOther: referralSource === "other" ? referralOther : undefined,
        }),
      });
      const body = normalizeEarlyAccessSubmitResponse(await res.json().catch(() => null));
      if (!res.ok) {
        setError(earlyAccessSubmitErrorMessage(body.error));
        return;
      }
      setSuccess(EARLY_ACCESS_REQUEST_SUCCESS_MESSAGES[body.outcome ?? "created"]);
    } catch {
      setError(EARLY_ACCESS_REQUEST_SUBMIT_ERROR);
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs leading-snug text-foreground" role="status">
          {success}
        </p>
        <Button type="button" variant="outline" className="w-full" onClick={onBackToSignIn}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={firstNameId}>First name</Label>
          <Input
            id={firstNameId}
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={lastNameId}>Last name</Label>
          <Input
            id={lastNameId}
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={pending}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={emailId}>Work email</Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={referralId}>How did you hear about us?</Label>
        <Select
          value={referralSource || undefined}
          onValueChange={(value) => setReferralSource(value as EarlyAccessReferralSource)}
          disabled={pending}
        >
          <SelectTrigger id={referralId} className="w-full" aria-label="How did you hear about us?">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {EARLY_ACCESS_REFERRAL_SOURCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {referralSource === "other" ? (
        <div className="space-y-1.5">
          <Label htmlFor={referralOtherId}>Tell us more</Label>
          <Textarea
            id={referralOtherId}
            value={referralOther}
            onChange={(e) => setReferralOther(e.target.value)}
            rows={3}
            placeholder="Where did you hear about Codalyn Tower?"
            disabled={pending}
            required
          />
        </div>
      ) : null}
      {error ? (
        <p className="text-xs leading-snug text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 aria-hidden data-icon="inline-start" className="animate-spin" /> : null}
        {pending ? "Sending…" : "Send request"}
      </Button>
      <div className="flex items-center justify-center text-xs">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-xs"
          onClick={onBackToSignIn}
          disabled={pending}
        >
          Back to sign in
        </Button>
      </div>
    </form>
  );
}
