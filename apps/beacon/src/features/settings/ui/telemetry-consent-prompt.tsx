import { useState } from "react";
import { applyTelemetryConsent } from "@/shared/lib/init-observability";
import { readTelemetryConsent } from "@/shared/lib/telemetry-preference";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

/**
 * First-run telemetry consent gate (Webflow Marketplace Privacy & Data Protection). Telemetry is
 * opt-in: no analytics or error reporting runs until the user chooses here (or in Settings →
 * Privacy). Escape leaves the decision unset — telemetry stays off and the prompt returns next
 * launch — so a dismissal is never silently recorded as consent either way.
 */
export function TelemetryConsentPrompt() {
  const [open, setOpen] = useState(() => readTelemetryConsent() === null);

  if (!open) {
    return null;
  }

  const decide = (granted: boolean) => {
    applyTelemetryConsent(granted ? "granted" : "denied");
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent onEscapeKeyDown={() => setOpen(false)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Share anonymous usage &amp; error data?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="grid gap-2">
              <p>
                Beacon can collect anonymous operational telemetry to fix errors and improve features: error reports,
                feature-usage events, app version, and the current Webflow site and workspace IDs.
              </p>
              <p>
                Data is processed by PostHog (product analytics) and Sentry (error reporting) on Codalyn&rsquo;s behalf.
                No session recording, no autocapture, and no page or design content is ever collected. Nothing is sent
                unless you allow it, and you can change this anytime in Settings &rarr; Privacy.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button" onClick={() => decide(false)}>
            No thanks
          </AlertDialogCancel>
          <AlertDialogAction type="button" onClick={() => decide(true)}>
            Allow telemetry
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
