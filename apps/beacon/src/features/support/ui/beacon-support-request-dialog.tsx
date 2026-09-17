import {
  TOWER_SUPPORT_REQUEST_CONFIG,
  TOWER_SUPPORT_REQUEST_EMAIL_LABEL,
  TOWER_SUPPORT_REQUEST_EMAIL_PLACEHOLDER,
  type TowerSupportRequestKind,
} from "@codalyn/webflow-kit";
import { type FormEvent, useState } from "react";
import {
  postBeaconSupportRequest,
  supportRequestSubmitErrorMessage,
  validateSupportRequestForm,
} from "@/features/support/model/submit-beacon-support-request";
import { captureObservabilityEvent } from "@/shared/lib/init-observability";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

const BEACON_SUPPORT_CAPTURE_EVENTS: Record<TowerSupportRequestKind, string> = {
  feedback: "beacon_feedback_submitted",
  help: "beacon_help_requested",
};

type BeaconSupportRequestDialogProps = {
  kind: TowerSupportRequestKind;
  open: boolean;
  /** Signed-in Tower email; when empty, guests must enter an email to submit. */
  sessionEmail: string;
  onOpenChange: (open: boolean) => void;
};

/**
 * Analytics records only that a submission happened (kind/topic/signed-in state). The message body
 * and email travel exclusively to Tower's support endpoint — the disclosed support channel. Never
 * add PII or free-text here: telemetry is disclosed as anonymous with an exact field list
 * (consent prompt, Settings → Privacy, privacy policy).
 */
function captureBeaconSupportRequest(kind: TowerSupportRequestKind, payload: { topic: string; signedIn: boolean }) {
  captureObservabilityEvent(BEACON_SUPPORT_CAPTURE_EVENTS[kind], { kind, ...payload });
}

function notifyUser(type: "Success" | "Error", message: string) {
  void webflow.notify({ type, message });
}

export function BeaconSupportRequestDialog({
  kind,
  open,
  sessionEmail,
  onOpenChange,
}: BeaconSupportRequestDialogProps) {
  const config = TOWER_SUPPORT_REQUEST_CONFIG[kind];
  const signedIn = Boolean(sessionEmail.trim());
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEmail("");
    setTopic("");
    setDetails("");
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedTopic = topic.trim();
    const trimmedDetails = details.trim();
    const submitEmail = signedIn ? sessionEmail.trim() : email.trim();
    const validationError = validateSupportRequestForm(
      config,
      {
        topic: trimmedTopic,
        details: trimmedDetails,
        email: submitEmail,
      },
      { requireEmail: !signedIn }
    );
    if (validationError) {
      setError(validationError);
      notifyUser("Error", validationError);
      return;
    }

    setBusy(true);
    const result = await postBeaconSupportRequest({
      kind,
      topic: trimmedTopic,
      details: trimmedDetails,
      ...(signedIn ? {} : { email: submitEmail }),
    });
    setBusy(false);

    if (!result.ok) {
      const message = supportRequestSubmitErrorMessage(config, result.error);
      setError(message);
      notifyUser("Error", message);
      return;
    }

    captureBeaconSupportRequest(kind, { topic: trimmedTopic, signedIn });
    notifyUser("Success", config.kind === "feedback" ? "Thanks for the feedback." : "Help request sent.");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {signedIn ? config.description : `${config.description} Add your email so we can reply.`}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            void onSubmit(event);
          }}
          className="space-y-3"
        >
          {!signedIn ? (
            <div className="space-y-1.5">
              <Label htmlFor={`beacon-support-email-${kind}`}>{TOWER_SUPPORT_REQUEST_EMAIL_LABEL}</Label>
              <Input
                id={`beacon-support-email-${kind}`}
                type="email"
                autoComplete="email"
                placeholder={TOWER_SUPPORT_REQUEST_EMAIL_PLACEHOLDER}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor={`beacon-support-topic-${kind}`}>{config.topicLabel}</Label>
            <Select value={topic || undefined} onValueChange={setTopic}>
              <SelectTrigger id={`beacon-support-topic-${kind}`} size="full" aria-label={config.topicLabel}>
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`beacon-support-details-${kind}`}>{config.detailsLabel}</Label>
            <Textarea
              id={`beacon-support-details-${kind}`}
              placeholder={config.detailsPlaceholder}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
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
